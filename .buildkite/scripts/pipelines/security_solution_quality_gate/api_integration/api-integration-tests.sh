#!/bin/bash
if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

echo "--- Running test script $1"

cd x-pack/solutions/security/test/security_solution_api_integration
set +e

# Resolve Kibana repo root (this package is five levels below it) so we can use stable target/ paths
# for tee output and for buildkite-agent artifact glob uploads.
REPO_ROOT="$(cd ../../../../../.. && pwd)"

# buildkite-agent has no "fetch log" command; mirror the job console to disk so the same output is
# available as a downloaded artifact in the build.
LOG_DIR="${REPO_ROOT}/target/kibana-security-solution/api-integration/buildkite-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/${BUILDKITE_JOB_ID:-local}-console.log"

TARGET_SCRIPT=$1 node ./scripts/mki_start_api_ftr_execution 2>&1 | tee "$LOG_FILE"
cmd_status=$?

upload_cypress_artifacts() {
  # Relative paths match cypress.config + package.json junit:merge
  if ! cd "$REPO_ROOT" 2>/dev/null; then
    buildkite-agent artifact upload "$LOG_FILE" || true
    return
  fi

  echo "--- Artifacts check"
  pwd
  ls -laR target/test_failures 2>&1 | head -200
  find target -path '*test_failures*' 2>/dev/null | head -100

  # Capture *.log under test_failures output
  buildkite-agent artifact upload "target/test_failures/**/*" || true
}

echo "--- Uploading step log and Cypress / JUnit artifacts"
upload_cypress_artifacts

echo "Exit code with status: $cmd_status"
exit $cmd_status