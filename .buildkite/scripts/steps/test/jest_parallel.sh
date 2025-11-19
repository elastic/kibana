#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
export JOB=${BUILDKITE_PARALLEL_JOB:-0}

# a jest failure will result in the script returning an exit code of 10
exitCode=0
results=()
configs=""
failedConfigs=""

# Parallel execution tuning (can be overridden via env)
#   JEST_MAX_PARALLEL: number of concurrent Jest config processes
#   JEST_MAX_OLD_SPACE_MB: per-process max old space size (MB)
# NOTE: JEST_MAX_PARALLEL default now depends on TEST_TYPE (unit=3, integration=1).
# It can still be overridden by exporting JEST_MAX_PARALLEL.
JEST_MAX_PARALLEL="${JEST_MAX_PARALLEL:-3}"
JEST_MAX_OLD_SPACE_MB="${JEST_MAX_OLD_SPACE_MB:-8192}"

if [[ "$1" == 'jest.config.js' ]]; then
  # unit tests
  TEST_TYPE="unit"
  JEST_MAX_PARALLEL=3 # unit tests run in parallel by default. When adjusting Buildkite resources, dont forget to update this value.
else
  TEST_TYPE="integration"
  JEST_MAX_PARALLEL=1 # integration tests should not run in parallel by default.
fi

export TEST_TYPE


# Added section for tracking and retrying failed configs
FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${TEST_TYPE}${JOB}"

if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ]; then
  echo "--- downloading jest test run order"
  download_artifact jest_run_order.json .
  configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

echo "+++ ⚠️ WARNING ⚠️"
echo "
  console.log(), console.warn(), and console.error() output in jest tests causes a massive amount
  of noise on CI without any perceivable benefit, so they have been disabled. If you want to log
  output in your test temporarily, you can modify 'src/platform/packages/shared/kbn-test/src/jest/setup/disable_console_logs.js'
"

# Execute all configs through the combined jest_all runner.
# The new runner will handle iterating through configs and reporting.

# Flatten configs (newline separated) into comma-separated list for flag usage.
CONFIGS_CSV=$(echo "$configs" | tr '\n' ',' | sed 's/,$//')

echo "--- Running combined jest_all for configs ($TEST_TYPE)"
echo "$configs"
echo "JEST_MAX_PARALLEL is set to: $JEST_MAX_PARALLEL"

# Set up checkpoint file for tracking completed configs (resume on agent failure)
CHECKPOINT_FILE="target/jest_checkpoint_${TEST_TYPE}_${JOB}.json"
export JEST_ALL_CHECKPOINT_PATH="$CHECKPOINT_FILE"

# Try to download existing checkpoint from previous run (if job was restarted)
if [[ "${BUILDKITE_RETRY_COUNT:-0}" != "0" ]]; then
  echo "--- Downloading checkpoint from previous run attempt"
  set +e
  buildkite-agent artifact download "$CHECKPOINT_FILE" . --step "${BUILDKITE_STEP_ID}"
  checkpoint_download_code=$?
  set -e
  
  if [ $checkpoint_download_code -eq 0 ] && [ -f "$CHECKPOINT_FILE" ]; then
    completed_count=$(jq -r '.completedConfigs | length' "$CHECKPOINT_FILE" 2>/dev/null || echo "0")
    echo "Checkpoint: Found ${completed_count} already-completed configs from previous attempt"
  else
    echo "Checkpoint: No previous checkpoint found, starting fresh"
  fi
fi

node_opts="--max-old-space-size=${JEST_MAX_OLD_SPACE_MB} --trace-warnings --no-experimental-require-module"
if [ "${KBN_ENABLE_FIPS:-}" == "true" ]; then
  node_opts="$node_opts --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

full_command="NODE_OPTIONS=\"$node_opts\" node ./scripts/jest_all --configs=\"$CONFIGS_CSV\" --coverage=false --passWithNoTests --maxParallel=\"$JEST_MAX_PARALLEL\""

echo "Actual full command is:"
echo "$full_command"
echo ""

set +e
eval "$full_command"
code=$?
set -e

# Upload checkpoint file as artifact (even if tests failed, so we can resume)
if [ -f "$CHECKPOINT_FILE" ]; then
  echo "--- Uploading checkpoint file"
  buildkite-agent artifact upload "$CHECKPOINT_FILE"
fi

if [ $code -ne 0 ]; then
  exitCode=10
fi

echo "--- Jest configs complete (combined)"

# Scout reporter
source .buildkite/scripts/steps/test/scout_upload_report_events.sh

exit $exitCode