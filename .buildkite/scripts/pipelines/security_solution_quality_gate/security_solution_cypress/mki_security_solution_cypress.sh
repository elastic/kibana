#!/bin/bash

set -euo pipefail

if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-security-solution-chrome

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

cd x-pack/solutions/security/test/security_solution_cypress
set +e

# Resolve Kibana repo root (this package is five levels below it) so we can use stable target/ paths
# for tee output and for buildkite-agent artifact glob uploads.
REPO_ROOT="$(cd ../../../../../.. && pwd)"

export BK_ANALYTICS_API_KEY=$(vault_get security-solution-quality-gate $BK_TEST_SUITE_KEY)

# buildkite-agent has no "fetch log" command; mirror the job console to disk so the same output is
# available as a downloaded artifact in the build.
LOG_DIR="${REPO_ROOT}/target/kibana-security-solution/cypress/buildkite-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/${BUILDKITE_JOB_ID:-local}-console.log"

echo "--- Triggering Kibana tests for $1"
BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn $1 2>&1 | tee "$LOG_FILE"
status=$?
yarn junit:merge || :

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
  buildkite-agent artifact upload "target/test_failures/**/*.log" || true
}

echo "--- Uploading step log and Cypress / JUnit artifacts"
upload_cypress_artifacts

exit $status