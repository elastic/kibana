#!/usr/bin/env bash
set -euo pipefail

report_main_step () {
  echo "--- $1"
}

main () {
  report_main_step "Bootstrap Kibana"

  # Bootstrap Kibana
  .buildkite/scripts/bootstrap.sh

  report_main_step "Loading connector configuration"

  # Get stringified preconfigured connectors from environment variable
  PRECONFIGURED_CONNECTORS=$(node x-pack/platform/plugins/shared/inference/scripts/util/get_preconfigured_connectors.js || true)

  report_main_step "Starting Elasticsearch"

  # Start Elasticsearch in the background
  node scripts/es snapshot \
    -E network.bind_host=127.0.0.1 \
    -E discovery.type=single-node \
    --license=trial &
  ES_PID=$!

  # Wait for Elasticsearch to be ready
  echo "Waiting for Elasticsearch to be ready..."
  MAX_WAIT_ES=300  # 5 minutes max wait
  ELAPSED_ES=0
  while [ $ELAPSED_ES -lt $MAX_WAIT_ES ]; do
    if timeout 1 bash -c "echo > /dev/tcp/localhost/9200" 2>/dev/null; then
      # Port is open, check if ES is responding
      if curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green"\|"status":"yellow"'; then
        echo "Elasticsearch is ready"
        break
      fi
    fi
    sleep 2
    ELAPSED_ES=$((ELAPSED_ES + 2))
  done

  if [ $ELAPSED_ES -ge $MAX_WAIT_ES ]; then
    echo "Elasticsearch failed to start within $MAX_WAIT_ES seconds"
    exit 1
  fi

  report_main_step "Starting Kibana"

  # Build Kibana args
  KIBANA_ARGS=("--dev" "--no-base-path")

  # Add preconfigured connectors if available
  if [ -n "$PRECONFIGURED_CONNECTORS" ]; then
    KIBANA_ARGS+=("--xpack.actions.preconfigured=$PRECONFIGURED_CONNECTORS")
    echo "Starting Kibana with preconfigured connectors"
  else
    echo "No preconfigured connectors found, starting Kibana without connectors"
  fi

  # Start Kibana in the background
  node scripts/kibana "${KIBANA_ARGS[@]}" &
  KIBANA_PID=$!

  # Wait for Kibana to be ready (check both port and status endpoint)
  echo "Waiting for Kibana to be ready..."
  MAX_WAIT=300  # 5 minutes max wait
  ELAPSED=0
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    if timeout 1 bash -c "echo > /dev/tcp/localhost/5601" 2>/dev/null; then
      # Port is open, check if Kibana status endpoint is available
      if curl -s http://localhost:5601/api/status | grep -q '"state":"green"'; then
        echo "Kibana is ready"
        break
      fi
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done

  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "Kibana failed to start within $MAX_WAIT seconds"
    exit 1
  fi

  # Cleanup function
  cleanup() {
    echo "Cleaning up..."
    kill $KIBANA_PID 2>/dev/null || true
    kill $ES_PID 2>/dev/null || true
  }
  trap cleanup EXIT

  report_main_step "Loading ES|QL documentation"

  # Load ES|QL docs
  node x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js --connectorId azure-gpt4

  # Check for differences in generated docs
  docs_dir="x-pack/platform/plugins/shared/inference/server/tasks/nl_to_esql/esql_docs"
  set +e
  git diff --exit-code --quiet "$docs_dir"
  if [ $? -eq 0 ]; then
    echo "No differences found. Our work is done here."
    exit
  fi
  set -e

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE='[ES|QL] Update documentation'
  PR_BODY='This PR updates the ES|QL documentation files generated from the built-docs repository.'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Proceeding."

  # Make a commit
  BRANCH_NAME="esql_docs_sync_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add "$docs_dir"
  git commit -m "Update ES|QL documentation"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create a PR
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:AI'
}

main
