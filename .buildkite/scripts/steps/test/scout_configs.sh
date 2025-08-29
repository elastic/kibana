#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

# Environment variables
BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
SCOUT_CONFIG_GROUP_KEY=${SCOUT_CONFIG_GROUP_KEY:-}
SCOUT_CONFIG_GROUP_TYPE=${SCOUT_CONFIG_GROUP_TYPE:-}

echo "=== DEBUG: Environment variables ==="
echo "BUILDKITE_PARALLEL_JOB: $BUILDKITE_PARALLEL_JOB"
echo "SCOUT_CONFIG_GROUP_KEY: $SCOUT_CONFIG_GROUP_KEY"
echo "SCOUT_CONFIG_GROUP_TYPE: $SCOUT_CONFIG_GROUP_TYPE"
echo "BUILDKITE_RETRY_COUNT: ${BUILDKITE_RETRY_COUNT:-0}"
echo "BUILDKITE_STEP_ID: ${BUILDKITE_STEP_ID:-}"

# Validation
if [ "$SCOUT_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_KEY env var"
  exit 1
fi

if [ "$SCOUT_CONFIG_GROUP_TYPE" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_TYPE env var"
  exit 1
fi

# Setup
EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$SCOUT_CONFIG_GROUP_KEY"
FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${SCOUT_CONFIG_GROUP_KEY}"
echo "=== DEBUG: FAILED_CONFIGS_KEY: $FAILED_CONFIGS_KEY"

# Initialize variables
configs=""
group=$SCOUT_CONFIG_GROUP_TYPE

# Define run modes based on group
declare -A RUN_MODES
RUN_MODES["platform"]="--stateful --serverless=es --serverless=oblt --serverless=security"
RUN_MODES["observability"]="--stateful --serverless=oblt"
RUN_MODES["search"]="--stateful --serverless=es"
RUN_MODES["security"]="--stateful --serverless=security"

RUN_MODE_LIST=${RUN_MODES[$group]}
echo "=== DEBUG: Group and modes ==="
echo "Group: $group"
echo "RUN_MODE_LIST: $RUN_MODE_LIST"

if [[ -z "$RUN_MODE_LIST" ]]; then
  echo "Unknown group: $group"
  exit 1
fi

# Function to run a single test
run_test() {
  local config_path="$1"
  local mode="$2"
  local test_name="$config_path ($mode)"
  
  echo "--- Running tests: $test_name"
  
  # prevent non-zero exit code from breaking the loop
  set +e
  node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
  local EXIT_CODE=$?
  set -e
  
  echo "=== DEBUG: Test exit code: $EXIT_CODE ==="
  
  case $EXIT_CODE in
    0)  echo "=== DEBUG: Test passed ==="
        results+=("$test_name ✅")
        ;;
    2)  echo "=== DEBUG: Test had no tests to run ==="
        configWithoutTests+=("$test_name")
        ;;
    *)  echo "=== DEBUG: Test failed ==="
        failedConfigs+=("$test_name ❌")
        # Extract mode name without -- prefix for storage
        local mode_name=${mode#--}
        echo "=== DEBUG: Extracted mode name: '$mode_name' ==="
        
        # Track failed config-mode combination
        if [[ -z "${failed_config_map[$config_path]:-}" ]]; then
          failed_config_map[$config_path]="$mode_name"
        else
          failed_config_map[$config_path]+=",$mode_name"
        fi
        FINAL_EXIT_CODE=10
        ;;
  esac
}

# Function to parse failed data
parse_failed_data() {
  local failed_data="$1"
  local retry_configs=()
  local retry_modes=()
  
  echo "=== DEBUG: Parsing failed data for retry ==="
  echo "Failed data format: config_path:mode1,mode2|config_path2:mode1"
  echo "=== DEBUG: Raw failed_data length: ${#failed_data} ==="
  
  while IFS='|' read -d '|' -r failure_entry; do
    [[ -z "$failure_entry" ]] && continue
    
    echo "=== DEBUG: Processing failure entry: '$failure_entry' ==="
    IFS=':' read -r failed_config_path failed_modes <<< "$failure_entry"
    
    if [[ -z "$failed_config_path" || -z "$failed_modes" ]]; then
      echo "=== DEBUG: WARNING - Empty config path or modes, skipping ==="
      continue
    fi
    
    for mode in ${failed_modes//,/ }; do
      [[ -n "$mode" ]] || continue
      echo "=== DEBUG: Adding retry config: '$failed_config_path' with mode: '--$mode' ==="
      retry_configs+=("$failed_config_path")
      retry_modes+=("--$mode")
    done
  done <<< "$failed_data"
  
  echo "=== DEBUG: Retry configs and modes after parsing: ==="
  echo "=== DEBUG: Total retry configs: ${#retry_configs[@]} ==="
  for i in "${!retry_configs[@]}"; do
    echo "  ${retry_configs[$i]} (${retry_modes[$i]})"
  done
  
  # Return arrays as space-separated strings (workaround for bash function return)
  echo "${retry_configs[*]}"
  echo "${retry_modes[*]}"
}

# Check for failed data to retry
echo "=== DEBUG: Checking for failed configs to retry ==="
failed_data=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')

if [[ "$failed_data" ]]; then
  echo "--- Retrying only failed configs and modes"
  # Parse failed data and get retry arrays
  readarray -t parse_result < <(parse_failed_data "$failed_data")
  retry_configs=(${parse_result[0]})
  retry_modes=(${parse_result[1]})
else
  echo "=== DEBUG: No failed data found in metadata - will run normal mode ==="
  retry_configs=()
  retry_modes=()
fi

# Download scout configuration if needed
echo "=== DEBUG: Checking if we need to download scout configuration ==="
if [[ -z "$configs" && -n "$SCOUT_CONFIG_GROUP_KEY" && ${#retry_configs[@]} -eq 0 ]]; then
  echo "=== DEBUG: Downloading scout configuration (not in retry mode) ==="
  echo "--- downloading scout test configuration"
  download_artifact scout_playwright_configs.json .
  configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_playwright_configs.json)
else
  echo "=== DEBUG: Skipping scout configuration download ==="
fi

if [[ -z "$configs" && ${#retry_configs[@]} -eq 0 ]]; then
  echo "=== DEBUG: No configs available and not in retry mode ==="
  echo "unable to determine configs to run"
  exit 1
fi

# Initialize result tracking
results=()
failedConfigs=()
configWithoutTests=()
declare -A failed_config_map
FINAL_EXIT_CODE=0

# Run tests
echo "=== DEBUG: Checking execution mode ==="
if [[ ${#retry_configs[@]} -gt 0 ]]; then
  echo "=== DEBUG: Running in retry mode ==="
  echo "--- Running retry mode with specific config-mode combinations"
  echo "=== DEBUG: Will run ${#retry_configs[@]} config-mode combinations ==="
  
  # Run only the specific config-mode combinations that failed
  for i in "${!retry_configs[@]}"; do
    echo "=== DEBUG: Running retry test $((i+1))/${#retry_configs[@]} ==="
    run_test "${retry_configs[$i]}" "${retry_modes[$i]}"
  done
else
  echo "=== DEBUG: Running in normal mode ==="
  echo "--- Running normal mode with all configs and modes"
  
  # Run tests for each config
  while read -r config_path; do
    [[ -z "$config_path" ]] && continue
    
    echo "=== DEBUG: Processing config: '$config_path' ==="
    for mode in $RUN_MODE_LIST; do
      echo "=== DEBUG: Running mode '$mode' for config '$config_path' ==="
      run_test "$config_path" "$mode"
    done
  done <<< "$configs"
fi

# Generate summary
echo "=== DEBUG: Test execution completed ==="
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
    printf '%s\n' "${configWithoutTests[@]/#/- }"
  } | buildkite-agent annotate --style "warning" --context "no-tests"
fi

# Store failed data for retry
if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "❌ Failed tests:"
  printf '%s\n' "${failedConfigs[@]}"
  
  echo "=== DEBUG: Preparing to store failed data for retry ==="
  failed_data=""
  local first=true
  for config_path in "${!failed_config_map[@]}"; do
    [[ "$first" == true ]] && first=false || failed_data+="|"
    failed_data+="$config_path:${failed_config_map[$config_path]}"
  done
  
  echo "=== DEBUG: Storing failed data for retry: '$failed_data' ==="
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failed_data"
else
  echo "=== DEBUG: No failed configs to store ==="
fi

# Upload events
echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

echo "=== DEBUG: Final exit code: $FINAL_EXIT_CODE ==="
exit $FINAL_EXIT_CODE
