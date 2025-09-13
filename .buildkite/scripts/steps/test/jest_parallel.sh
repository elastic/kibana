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
# NOTE: MAX_PARALLEL default now depends on TEST_TYPE (unit=3, integration=1).
# It can still be overridden by exporting JEST_MAX_PARALLEL.
MAX_PARALLEL="${JEST_MAX_PARALLEL:-3}"
MAX_OLD_SPACE_MB="${JEST_MAX_OLD_SPACE_MB:-8192}"

if [[ "$1" == 'jest.config.js' ]]; then
  # unit tests
  TEST_TYPE="unit"
else
  TEST_TYPE="integration"
fi

export TEST_TYPE

# Adjust default MAX_PARALLEL after TEST_TYPE is known unless user overrode.
if [[ -z "${JEST_MAX_PARALLEL:-}" ]]; then
  if [[ "$TEST_TYPE" == "unit" ]]; then
    MAX_PARALLEL=3
  else
    MAX_PARALLEL=1
  fi
fi

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
  of noise on CI without any percevable benefit, so they have been disabled. If you want to log
  output in your test temporarily, you can modify 'src/platform/packages/shared/kbn-test/src/jest/setup/disable_console_logs.js'
"

# Execute all configs through the combined jest_all runner.
# The new runner will handle iterating through configs and reporting.

# Flatten configs (newline separated) into comma-separated list for flag usage.
CONFIGS_CSV=$(echo "$configs" | tr '\n' ',' | sed 's/,$//')

echo "--- Running combined jest_all for configs ($TEST_TYPE)"
echo "$configs"

node_opts="--max-old-space-size=${MAX_OLD_SPACE_MB} --trace-warnings --no-experimental-require-module"
if [ "${KBN_ENABLE_FIPS:-}" == "true" ]; then
  node_opts="$node_opts --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

echo "actual full command is:"
echo "NODE_OPTIONS=\"$node_opts\" NODE_ENV="test" node ./scripts/jest_all --configs=\"$CONFIGS_CSV\" --coverage=false --passWithNoTests"
echo ""

set +e
NODE_OPTIONS="$node_opts" node ./scripts/jest_all --configs="$CONFIGS_CSV" --coverage=false --passWithNoTests
code=$?
set -e

if [ $code -ne 0 ]; then
  exitCode=10
fi

echo "--- Jest configs complete (combined)"

# Scout reporter
echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

exit $exitCode
