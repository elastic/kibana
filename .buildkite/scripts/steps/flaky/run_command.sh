#!/usr/bin/env bash
#
# Flaky-runner step for a single shell command (one Cypress spec, one Scout spec, etc.).
#
# Contract:
# - FLAKY_TEST_WORKING_DIRECTORY: initial cwd before the command (usually "." = kibana repo root).
# - FLAKY_TEST_COMMAND: shell snippet executed via `bash -c` (often includes `cd <package> && …`).
# - FLAKY_TEST_JUNIT_MERGE_DIRECTORY (optional): repo-relative path where `yarn junit:merge` runs when
#   it differs from FLAKY_TEST_WORKING_DIRECTORY (typical for Security Cypress: package root).
# - FLAKY_TEST_SCOUT_LABEL (optional): argument to upload_scout_cypress_events for Buildkite analytics.
# - KIBANA_INSTALL_DIR: repo-root distributable ($PARENT_DIR/kibana-build-xpack), even when the command
#   cds into a package — same layout as other functional/flaky steps after common.sh.
# - Buildkite parallelism on this step is flaky repetition count, not test sharding. Runners that
#   shard on BUILDKITE_PARALLEL_JOB* must opt out via RUN_ALL_TESTS (or equivalent) when parallel job count > 1.
#
# Trust model: FLAKY_TEST_COMMAND is set only from Buildkite build env at trigger time (ci-stats UI,
# authenticated `bk build create`, or internal tooling). It is not read from the PR diff. Only users
# who can trigger the flaky runner can supply arbitrary shell; treat this like other CI job commands.

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

: "${FLAKY_TEST_WORKING_DIRECTORY:?Missing FLAKY_TEST_WORKING_DIRECTORY}"
: "${FLAKY_TEST_COMMAND:?Missing FLAKY_TEST_COMMAND}"

# common.sh runs at the kibana repo root. Capture distributable paths before any cd.
_FLAKY_REPO_ROOT="${KIBANA_DIR}"
_FLAKY_REPO_PARENT="${PARENT_DIR}"
_FLAKY_KIBANA_BUILD_LOCATION="${KIBANA_BUILD_LOCATION}"

# Job env can pin WORKSPACE to another agent; fall back to the standard CI layout.
if [[ ! -d "${_FLAKY_KIBANA_BUILD_LOCATION}/bin" ]] && [[ -d "${_FLAKY_REPO_PARENT}/kibana-build-xpack/bin" ]]; then
  _FLAKY_KIBANA_BUILD_LOCATION="${_FLAKY_REPO_PARENT}/kibana-build-xpack"
fi

export KIBANA_DIR="${_FLAKY_REPO_ROOT}"
export PARENT_DIR="${_FLAKY_REPO_PARENT}"
export WORKSPACE="${_FLAKY_REPO_PARENT}"
export KIBANA_BUILD_LOCATION="${_FLAKY_KIBANA_BUILD_LOCATION}"
export KIBANA_INSTALL_DIR="${KIBANA_BUILD_LOCATION}"

# Flaky runner uses step parallelism as "run N times", not "split tests across N agents".
if [[ "${BUILDKITE_PARALLEL_JOB_COUNT:-1}" -gt 1 ]]; then
  export RUN_ALL_TESTS=true
  export CLI_NUMBER=1
  export CLI_COUNT=1
fi

if [[ -n "${FLAKY_TEST_JOB:-}" ]]; then
  export JOB="$FLAKY_TEST_JOB"
fi

echo "--- Flaky command (${BUILDKITE_PARALLEL_JOB:-0}/${BUILDKITE_PARALLEL_JOB_COUNT:-1})"
echo "KIBANA_INSTALL_DIR=${KIBANA_INSTALL_DIR}"
echo "cd ${FLAKY_TEST_WORKING_DIRECTORY}"
echo "$ ${FLAKY_TEST_COMMAND}"

cd "$FLAKY_TEST_WORKING_DIRECTORY"

set +e
bash -c "$FLAKY_TEST_COMMAND"
status=$?

# Merge JUnit XML from the package that owns junit:merge (see security_solution_*.sh). When the
# command cds into a package but workingDirectory is ".", set FLAKY_TEST_JUNIT_MERGE_DIRECTORY.
_junit_merge_dir="${FLAKY_TEST_JUNIT_MERGE_DIRECTORY:-${FLAKY_TEST_WORKING_DIRECTORY}}"
cd "${_FLAKY_REPO_ROOT}"
if [[ "${_junit_merge_dir}" != "." ]]; then
  cd "${_junit_merge_dir}"
fi
if node -e "const p=require('./package.json'); process.exit(p.scripts?.['junit:merge'] ? 0 : 1)" 2>/dev/null; then
  yarn junit:merge || :
fi

if [[ -n "${FLAKY_TEST_SCOUT_LABEL:-}" ]]; then
  upload_scout_cypress_events "$FLAKY_TEST_SCOUT_LABEL"
fi

exit $status
