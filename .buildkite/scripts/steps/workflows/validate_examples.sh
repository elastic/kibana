#!/usr/bin/env bash
set -euo pipefail

WORKFLOWS_REPO_URL="${WORKFLOWS_REPO_URL:-https://github.com/elastic/workflows}"
WORKFLOWS_BRANCH="${WORKFLOWS_BRANCH:-main}"
WORKFLOWS_CHECKOUT="$PARENT_DIR/workflows"
EXAMPLES_SUBPATH="${WORKFLOWS_EXAMPLES_SUBPATH:-examples}"
JUNIT_OUT="$KIBANA_DIR/target/workflow-examples-junit.xml"

WORKFLOW_SCHEMA_PATH_PATTERN='^(src/platform/packages/shared/kbn-workflows/|src/platform/packages/shared/kbn-workflows-examples-cli/|src/platform/packages/shared/kbn-workflows-yaml/|src/platform/plugins/shared/workflows_management/|\.buildkite/scripts/steps/workflows/)'

report_main_step () {
  echo "--- $1"
}

skip_unless_workflow_schema_changed () {
  if [[ "${WORKFLOWS_VALIDATE_FORCE:-}" == "true" ]]; then
    echo "WORKFLOWS_VALIDATE_FORCE=true — running validation regardless of changed paths"
    return 0
  fi

  report_main_step "Checking whether this merge touched workflow schema paths"
  local changed
  if ! changed="$(git -C "$KIBANA_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null)"; then
    echo "Warning: could not diff HEAD~1..HEAD; running validation anyway." >&2
    return 0
  fi

  if echo "$changed" | grep -qE "$WORKFLOW_SCHEMA_PATH_PATTERN"; then
    echo "Workflow schema paths changed — running validation"
    return 0
  fi

  echo "No workflow schema changes in HEAD~1..HEAD — skipping validation"
  exit 0
}

clone_workflows_examples () {
  report_main_step "Cloning elastic/workflows @ $WORKFLOWS_BRANCH"
  rm -rf "$WORKFLOWS_CHECKOUT"
  git clone --filter=blob:none --branch "$WORKFLOWS_BRANCH" --single-branch \
    "$WORKFLOWS_REPO_URL" "$WORKFLOWS_CHECKOUT"
}

main () {
  skip_unless_workflow_schema_changed
  clone_workflows_examples

  report_main_step "Bootstrapping Kibana"
  cd "$KIBANA_DIR"
  .buildkite/scripts/bootstrap.sh

  local examples_dir="$WORKFLOWS_CHECKOUT/$EXAMPLES_SUBPATH"
  if [[ ! -d "$examples_dir" ]; then
    echo "Error: examples directory '$examples_dir' does not exist." >&2
    echo "Override the subpath with WORKFLOWS_EXAMPLES_SUBPATH if upstream layout changed." >&2
    exit 1
  fi

  mkdir -p "$(dirname "$JUNIT_OUT")"

  report_main_step "Validating workflow examples"
  node scripts/validate_workflow_examples.js \
    --dir "$examples_dir" \
    --junit-out "$JUNIT_OUT"
}

main
