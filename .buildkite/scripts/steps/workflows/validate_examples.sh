#!/usr/bin/env bash
set -euo pipefail

REF_FILE="$KIBANA_DIR/.buildkite/workflows_examples_ref"
WORKFLOWS_REPO_URL="${WORKFLOWS_REPO_URL:-https://github.com/elastic/workflows}"
WORKFLOWS_CHECKOUT="$PARENT_DIR/workflows"
EXAMPLES_SUBPATH="${WORKFLOWS_EXAMPLES_SUBPATH:-examples}"
JUNIT_OUT="$KIBANA_DIR/target/workflow-examples-junit.xml"

report_main_step () {
  echo "--- $1"
}

read_ref () {
  if [[ ! -f "$REF_FILE" ]]; then
    echo "Error: $REF_FILE is missing." >&2
    echo "The pinned ref file must exist; refusing to clone an arbitrary upstream." >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$REF_FILE"
  if [[ -z "${WORKFLOWS_REF:-}" ]]; then
    echo "Error: WORKFLOWS_REF is empty in $REF_FILE." >&2
    exit 1
  fi
  if [[ ! "$WORKFLOWS_REF" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Warning: WORKFLOWS_REF='$WORKFLOWS_REF' is not a 40-char commit SHA." >&2
    echo "Prefer a pinned SHA so PRs racing the bump are reproducible." >&2
  fi
}

main () {
  read_ref

  report_main_step "Cloning elastic/workflows @ $WORKFLOWS_REF"
  rm -rf "$WORKFLOWS_CHECKOUT"
  git clone --filter=blob:none "$WORKFLOWS_REPO_URL" "$WORKFLOWS_CHECKOUT"
  git -C "$WORKFLOWS_CHECKOUT" checkout --detach "$WORKFLOWS_REF"

  report_main_step "Bootstrapping Kibana"
  cd "$KIBANA_DIR"
  .buildkite/scripts/bootstrap.sh

  local examples_dir="$WORKFLOWS_CHECKOUT/$EXAMPLES_SUBPATH"
  if [[ ! -d "$examples_dir" ]]; then
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
