#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
SCOUT_CONFIG_GROUP_KEY=${SCOUT_CONFIG_GROUP_KEY:-}
if [ "$SCOUT_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_KEY env var"
  exit 1
fi

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$SCOUT_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${SCOUT_CONFIG_GROUP_KEY}"

# a Scout failure will result in the script returning an exit code of 10
EXIT_CODE=0

echo "--- downloading scout test configuration"
download_artifact scout_test_configs.json .
configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_test_configs.json)
group=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].group' scout_test_configs.json)

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

# Define run modes based on group
declare -A RUN_MODES
RUN_MODES["platform"]="--stateful --serverless=es --serverless=oblt --serverless=security"
RUN_MODES["observability"]="--stateful --serverless=oblt"
RUN_MODES["search"]="--stateful --serverless=es"
RUN_MODES["security"]="--stateful --serverless=security"

# Determine valid run modes for the group
RUN_MODE_LIST=${RUN_MODES[$group]}

if [[ -z "$RUN_MODE_LIST" ]]; then
  echo "Unknown group: $group"
  exit 1
fi

failedConfigs=()
configWithoutTests=()
passedConfigs=()

# Run tests for each config
while read -r config_path; do
  if [[ -z "$config_path" ]]; then
    continue
  fi

  for mode in $RUN_MODE_LIST; do
    echo "--- Running tests: $config_path ($mode)"

    node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 2 ]]; then
      configWithoutTests+=("$config_path ($mode) No tests found")
      # Reset exit code to 0, no failure if there are no tests
      EXIT_CODE=0
    elif [[ $EXIT_CODE -ne 0 ]]; then
      failedConfigs+=("$config_path ($mode) ❌")
    else
      passedConfigs+=("$config_path ($mode) ✅")
    fi
  done
done <<< "$configs"

echo "--- Scout Test Run Complete: Summary"
if [[ "$passedConfigs" ]]; then
  echo "✅ Passed:"
  printf "%s\n" "${passedConfigs[@]}"
fi

if [[ "$configWithoutTests" ]]; then
  echo "No tests in config:"
  printf "%s\n" "${configWithoutTests[@]}"
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$configWithoutTests"
fi

if [[ "$failedConfigs" ]]; then
  echo "❌ Failed:"
  printf "%s\n" "${failedConfigs[@]}"
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

exit $EXIT_CODE
