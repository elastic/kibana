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
    echo "--- Retrying only failed 'Playwright config + mode' pairs"
    echo "$RETRY_FAILED_PAIRS"
    # Extract unique configs from failed pairs for processing
    configs=$(echo "$RETRY_FAILED_PAIRS" | sed 's/ (.*)//' | sort -u)
  fi
fi

if [ -z "$configs" ] && [ "$SCOUT_CONFIG_GROUP_KEY" != "" ]; then
  echo "--- Downloading Scout Test Configuration"
  download_artifact scout_playwright_configs.json .
  configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_playwright_configs.json)
fi

if [ -z "$configs" ]; then
  echo "Unable to determine configs to run"
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

# Function to upload Scout events if available and clean up
upload_events_if_available() {
  local config_path="$1"
  local mode="$2"

  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
      echo "--- Upload Scout reporter events for $config_path ($mode)"
      # prevent non-zero exit code from breaking the script
      set +e;
      node scripts/scout upload-events --dontFailOnError
      UPLOAD_EXIT_CODE=$?
      set -e;

      if [[ $UPLOAD_EXIT_CODE -eq 0 ]]; then
        echo "✅ Upload completed for $config_path ($mode)"
      else
        echo "⚠️ Upload failed for $config_path ($mode) with exit code $UPLOAD_EXIT_CODE"
      fi

      # Clean up events reports to avoid double ingestion, but preserve failure reports
      echo "🧹 Cleaning up Scout events reports (preserving failure reports for annotations)"
      # Only remove events reports, not failure reports
      if [ -d ".scout/reports" ]; then
        for dir in .scout/reports/scout-playwright-*; do
          if [ -d "$dir" ] && [[ "$dir" != *"scout-playwright-test-failures-"* ]]; then
            rm -rf "$dir"
          fi
        done
      fi
      # Keep .scout/reports/scout-playwright-test-failures-* and .scout/test-artifacts/ for failed test reporter
    else
      echo "❌ No Scout reports found for $config_path ($mode)"
    fi
  else
    echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
  fi
}

# Run tests for each config
while read -r config_path; do
  if [[ -z "$config_path" ]]; then
    continue
  fi

  # Run config for each mode
  for mode in $RUN_MODE_LIST; do
    # If we're retrying specific failed pairs, check if this config+mode pair should be retried
    if [[ -n "$RETRY_FAILED_PAIRS" ]]; then
      config_mode_pair="$config_path ($mode)"
      if ! echo "$RETRY_FAILED_PAIRS" | grep -Fxq "$config_mode_pair"; then
        continue
      fi
    fi

    # Create unique execution key for this config+mode pair
    CONFIG_MODE_EXECUTION_KEY=$(echo "${config_path}_${mode}_executed" | sed 's/[^a-zA-Z0-9_-]/_/g')
    IS_CONFIG_MODE_EXECUTED=$(buildkite-agent meta-data get "$CONFIG_MODE_EXECUTION_KEY" --default "false" --log-level error)

    if [[ "${IS_CONFIG_MODE_EXECUTED}" == "true" ]]; then
      echo "--- [ already-completed ] $config_path ($mode)"
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

    # Now handle test results - retry logic depends only on test success/failure
    if [[ $EXIT_CODE -eq 2 ]]; then
      # No tests found - mark as executed so we don't retry it
      buildkite-agent meta-data set "$CONFIG_MODE_EXECUTION_KEY" "true"
      configWithoutTests+=("$config_path ($mode)")
    elif [[ $EXIT_CODE -ne 0 ]]; then
      # Test run failed - try to upload events for observability, then mark as failed
      upload_events_if_available "$config_path" "$mode"
      failedConfigs+=("$config_path ($mode)")
      FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
      echo "Scout test exited with code $EXIT_CODE for $config_path ($mode)"
      echo "^^^ +++"
    else
      # Test run was successful - upload events then mark as executed
      upload_events_if_available "$config_path" "$mode"
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

exit $FINAL_EXIT_CODE  # Exit with 10 only if there were config failures