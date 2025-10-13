#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
SCOUT_CONFIG_GROUP_KEY=${SCOUT_CONFIG_GROUP_KEY:-}
SCOUT_CONFIG_GROUP_TYPE=${SCOUT_CONFIG_GROUP_TYPE:-}
SCOUT_CONFIG=${SCOUT_CONFIG:-}

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

configs=""

if [ "$SCOUT_CONFIG_GROUP_TYPE" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_TYPE env var"
  exit 1
fi

group=$SCOUT_CONFIG_GROUP_TYPE

if [ "$SCOUT_CONFIG" != "" ]; then
  configs="$SCOUT_CONFIG"
  export JOB="$SCOUT_CONFIG"
  FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${SCOUT_CONFIG}"
elif [ "$SCOUT_CONFIG_GROUP_KEY" != "" ]; then
  export JOB="$SCOUT_CONFIG_GROUP_KEY"
  FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${SCOUT_CONFIG_GROUP_KEY}"
else
  if [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
    echo "Missing SCOUT_CONFIG_GROUP_KEY or SCOUT_CONFIG env var"
    exit 1
  fi
fi

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
RETRY_FAILED_PAIRS=""
if [[ -z "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  RETRY_FAILED_PAIRS=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ -n "$RETRY_FAILED_PAIRS" ]]; then
    echo "--- Retrying only failed config+mode pairs"
    echo "$RETRY_FAILED_PAIRS"
    # Extract unique configs from failed pairs for processing
    configs=$(echo "$RETRY_FAILED_PAIRS" | sed 's/ (.*)//' | sort -u)
  fi
fi

if [ -z "$configs" ] && [ "$SCOUT_CONFIG_GROUP_KEY" != "" ]; then
  echo "--- downloading scout test configuration"
  download_artifact scout_playwright_configs.json .
  configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_playwright_configs.json)
fi

if [ -z "$configs" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

# Define run modes based on group
declare -A RUN_MODES
RUN_MODES["platform"]="--stateful --serverless=es --serverless=oblt --serverless=security"
RUN_MODES["observability"]="--stateful --serverless=oblt --serverless=oblt-logs-essentials"
RUN_MODES["search"]="--stateful --serverless=es"
RUN_MODES["security"]="--stateful --serverless=security"

# Determine valid run modes for the group
RUN_MODE_LIST=${RUN_MODES[$group]}

if [[ -z "$RUN_MODE_LIST" ]]; then
  echo "Unknown group: $group"
  exit 1
fi

results=()
failedConfigs=()
configWithoutTests=()

FINAL_EXIT_CODE=0

# Run tests for each config
while read -r config_path; do
  if [[ -z "$config_path" ]]; then
    continue
  fi

  for mode in $RUN_MODE_LIST; do
    # If we're retrying specific failed pairs, check if this config+mode pair should be retried
    if [[ -n "$RETRY_FAILED_PAIRS" ]]; then
      config_mode_pair="$config_path ($mode)"
      if ! echo "$RETRY_FAILED_PAIRS" | grep -Fxq "$config_mode_pair"; then
        echo "--- [ skipped - not in retry list ] $config_path ($mode)"
        continue
      fi
    fi

    # Create unique execution key for this config+mode pair
    # Replace slashes and special characters to make a valid metadata key
    CONFIG_MODE_EXECUTION_KEY=$(echo "${config_path}_${mode}_executed" | sed 's/[^a-zA-Z0-9_-]/_/g')
    IS_CONFIG_MODE_EXECUTED=$(buildkite-agent meta-data get "$CONFIG_MODE_EXECUTION_KEY" --default "false" --log-level error)

    if [[ "${IS_CONFIG_MODE_EXECUTED}" == "true" ]]; then
      echo "--- [ already-tested ] $config_path ($mode)"
      results+=("$config_path ($mode) ✅ (cached)")
      continue
    fi

    echo "--- Running tests: $config_path ($mode)"

    start=$(date +%s)

    # prevent non-zero exit code from breaking the loop
    set +e;
    node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
    EXIT_CODE=$?
    set -e;

    timeSec=$(($(date +%s)-start))
    if [[ $timeSec -gt 60 ]]; then
      min=$((timeSec/60))
      sec=$((timeSec-(min*60)))
      duration="${min}m ${sec}s"
    else
      duration="${timeSec}s"
    fi

    if [[ $EXIT_CODE -eq 2 ]]; then
      configWithoutTests+=("$config_path ($mode)")
    elif [[ $EXIT_CODE -ne 0 ]]; then
      failedConfigs+=("$config_path ($mode)")
      FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
      echo "Scout test exited with code $EXIT_CODE for $config_path ($mode)"
      echo "^^^ +++"
    else
      # Test was successful, so mark it as executed
      buildkite-agent meta-data set "$CONFIG_MODE_EXECUTION_KEY" "true"
      results+=("$config_path ($mode) ✅ (${duration})")
    fi
  done
done <<< "$configs"

echo "--- Scout Test Run Complete: Summary"
echo "✅ Passed: ${#results[@]}"
echo "⚠️ Configs without tests: ${#configWithoutTests[@]}"
echo "❌ Failed: ${#failedConfigs[@]}"

if [[ ${#results[@]} -gt 0 ]]; then
  echo "✅ Successful tests:"
  printf '%s\n' "${results[@]}"
fi

if [[ ${#configWithoutTests[@]} -gt 0 ]]; then
{
  echo "Scout Playwright configs without tests:"
  echo ""
  for config in "${configWithoutTests[@]}"; do
    echo "- $config"
  done
} | buildkite-agent annotate --style "warning" --context "no-tests"
fi

if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "❌ Failed tests:"
  for config in "${failedConfigs[@]}"; do
    echo "  $config ❌"
  done

  # Store failed config+mode pairs for retry
  failed_pairs=""
  for config in "${failedConfigs[@]}"; do
    if [[ -n "$failed_pairs" ]]; then
      failed_pairs="${failed_pairs}"$'\n'"$config"
    else
      failed_pairs="$config"
    fi
  done
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failed_pairs"
fi

source .buildkite/scripts/steps/test/scout_upload_report_events.sh

exit $FINAL_EXIT_CODE  # Exit with 10 only if there were config failures