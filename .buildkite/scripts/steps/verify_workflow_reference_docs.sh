#!/usr/bin/env bash

# Verifies that generated workflow step/trigger reference snippets match the live registries.
# Boots Elasticsearch + Kibana, loads the Workflows app (so public doc metadata is pushed),
# runs the generators, and fails if git detects changes to the snippet files.

set -euo pipefail

report_step() {
  echo "--- $1"
}

STEP_DOCS_SNIPPETS_DIR="docs/reference/workflows"
WORKFLOW_REFERENCE_TOC_FILE="docs/reference/toc.yml"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

# Match @kbn/es defaults (scripts/es.js) so health checks and Kibana can authenticate.
export KIBANA_USERNAME="${KIBANA_USERNAME:-elastic}"
export KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
export KIBANA_AUTH="${KIBANA_AUTH:-${KIBANA_USERNAME}:${KIBANA_PASSWORD}}"

# ES is started with network.bind_host=127.0.0.1 below. Use IPv4 for waits/curl so we do not
# hit ::1 when "localhost" resolves to IPv6 first (then the port appears closed even though ES is up).
LOCAL_IPV4="${LOCAL_IPV4:-127.0.0.1}"

report_step "Bootstrap Kibana"
.buildkite/scripts/bootstrap.sh

report_step "Install Playwright Chromium (for opening the Workflows app)"
./node_modules/.bin/playwright install chromium

report_step "Starting Elasticsearch"
node scripts/es snapshot \
  -E network.bind_host=127.0.0.1 \
  -E discovery.type=single-node \
  --license=trial &
ES_PID=$!
# Empty until Kibana is started; required so `cleanup` is safe under `set -u` if we exit early.
KIBANA_PID=""

cleanup() {
  echo "Cleaning up..."
  if [[ -n "${KIBANA_PID}" ]]; then
    kill "$KIBANA_PID" 2>/dev/null || true
  fi
  kill "$ES_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for Elasticsearch to be ready..."
# Snapshot download/install on cold agents can exceed 5m; ES may not bind 9200 until then.
MAX_WAIT_ES=900
ELAPSED_ES=0
while [ "$ELAPSED_ES" -lt "$MAX_WAIT_ES" ]; do
  if timeout 1 bash -c "echo > /dev/tcp/${LOCAL_IPV4}/9200" 2>/dev/null; then
    if curl -s -u "$KIBANA_USERNAME:$KIBANA_PASSWORD" \
      "http://${LOCAL_IPV4}:9200/_cluster/health" | grep -qE '"status"[[:space:]]*:[[:space:]]*"(green|yellow)"'; then
      echo "Elasticsearch is ready"
      break
    fi
  fi
  sleep 2
  ELAPSED_ES=$((ELAPSED_ES + 2))
done

if [ "$ELAPSED_ES" -ge "$MAX_WAIT_ES" ]; then
  echo "Elasticsearch failed to start within ${MAX_WAIT_ES} seconds"
  exit 1
fi

report_step "Starting Kibana"
node scripts/kibana --dev --no-base-path &
KIBANA_PID=$!

echo "Waiting for Kibana to be ready..."
MAX_WAIT=900
ELAPSED=0
while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
  if timeout 1 bash -c "echo > /dev/tcp/${LOCAL_IPV4}/5601" 2>/dev/null; then
    if curl -s "http://${LOCAL_IPV4}:5601/api/status" | grep -qE '"state"[[:space:]]*:[[:space:]]*"green"'; then
      echo "Kibana is ready"
      break
    fi
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
  echo "Kibana failed to start within ${MAX_WAIT} seconds"
  exit 1
fi

export KIBANA_URL="${KIBANA_URL:-http://${LOCAL_IPV4}:5601}"

report_step "Load Workflows UI (pushes step/trigger doc metadata for generators)"
node scripts/warm_workflow_extension_doc_metadata.js

report_step "Regenerate workflow reference snippets"
node scripts/generate workflow-step-docs
node scripts/generate workflow-trigger-docs

report_step "Check for uncommitted documentation changes"
shopt -s nullglob
STEP_DOCS_FILES=(
  "${STEP_DOCS_SNIPPETS_DIR}/step-definitions-index.md"
  "${STEP_DOCS_SNIPPETS_DIR}"/step-definitions-category-*.md
)
TRIGGER_DOCS_FILES=(
  "${STEP_DOCS_SNIPPETS_DIR}/trigger-definitions-index.md"
  "${STEP_DOCS_SNIPPETS_DIR}"/trigger-definitions-category-*.md
)
shopt -u nullglob
set +e
git diff --exit-code --quiet -- "${STEP_DOCS_FILES[@]}" "${TRIGGER_DOCS_FILES[@]}" "$WORKFLOW_REFERENCE_TOC_FILE"
diff_status=$?
set -e

if [ "$diff_status" -ne 0 ]; then
  echo ""
  echo "ERROR: Workflow reference docs are out of date."
  echo ""
  echo "The following files differ from what the registries produce after loading the Workflows app:"
  for f in "${STEP_DOCS_FILES[@]}" "${TRIGGER_DOCS_FILES[@]}" "$WORKFLOW_REFERENCE_TOC_FILE"; do
    echo "  - $f"
  done
  echo ""
  echo "To fix locally:"
  echo "  1. Start Elasticsearch and Kibana with the workflows UI enabled (see Workflows Management README)."
  echo "  2. Open /app/workflows once so metadata is pushed."
  echo "  3. Run:"
  echo "       node scripts/generate workflow-step-docs"
  echo "       node scripts/generate workflow-trigger-docs"
  echo "  4. Commit the updated snippet files and docs/reference/toc.yml (step/trigger category lines are synced by the generators)."
  echo ""
  git --no-pager diff -- "${STEP_DOCS_FILES[@]}" "${TRIGGER_DOCS_FILES[@]}" "$WORKFLOW_REFERENCE_TOC_FILE" || true
  exit 1
fi

echo "Workflow reference docs are up to date."
