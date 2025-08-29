#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
SCOUT_CONFIG_GROUP_KEY=${SCOUT_CONFIG_GROUP_KEY:-}
SCOUT_CONFIG_GROUP_TYPE=${SCOUT_CONFIG_GROUP_TYPE:-}

echo "=== DEBUG: Environment variables ==="
echo "BUILDKITE_PARALLEL_JOB: $BUILDKITE_PARALLEL_JOB"
echo "SCOUT_CONFIG_GROUP_KEY: $SCOUT_CONFIG_GROUP_KEY"
echo "SCOUT_CONFIG_GROUP_TYPE: $SCOUT_CONFIG_GROUP_TYPE"
echo "BUILDKITE_RETRY_COUNT: ${BUILDKITE_RETRY_COUNT:-0}"
echo "BUILDKITE_STEP_ID: ${BUILDKITE_STEP_ID:-}"

if [ "$SCOUT_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_KEY env var"
  exit 1
fi

if [ "$SCOUT_CONFIG_GROUP_TYPE" == "" ]; then
  echo "Missing SCOUT_CONFIG_GROUP_TYPE env var"
  exit 1
fi

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$SCOUT_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${SCOUT_CONFIG_GROUP_KEY}"
echo "=== DEBUG: FAILED_CONFIGS_KEY: $FAILED_CONFIGS_KEY"

configs=""
group=$SCOUT_CONFIG_GROUP_TYPE

# Define run modes based on group
declare -A RUN_MODES
RUN_MODES["platform"]="--stateful --serverless=es --serverless=oblt --serverless=security"
RUN_MODES["observability"]="--stateful --serverless=oblt"
RUN_MODES["search"]="--stateful --serverless=es"
RUN_MODES["security"]="--stateful --serverless=security"

# Determine valid run modes for the group
RUN_MODE_LIST=${RUN_MODES[$group]}

echo "=== DEBUG: Group and modes ==="
echo "Group: $group"
echo "RUN_MODE_LIST: $RUN_MODE_LIST"

if [[ -z "$RUN_MODE_LIST" ]]; then
  echo "Unknown group: $group"
  exit 1
fi

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
retry_configs=()
retry_modes=()

echo "=== DEBUG: Checking retry conditions ==="
echo "configs is empty: $([[ -z "$configs" ]] && echo "true" || echo "false")"
echo "BUILDKITE_RETRY_COUNT: ${BUILDKITE_RETRY_COUNT:-0}"

if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  echo "=== DEBUG: This is a retry job (BUILDKITE_RETRY_COUNT=1) ==="
  failed_data=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  echo "=== DEBUG: Retrieved failed_data from metadata: '$failed_data' ==="
  
  if [[ "$failed_data" ]]; then
    echo "--- Retrying only failed configs and modes"
    echo "=== DEBUG: Parsing failed data for retry ==="
    echo "Failed data format: config_path:mode1,mode2|config_path2:mode1"
    
    # Parse the failed data and reconstruct configs with their specific failed modes
    # Format: config_path:mode1,mode2|config_path2:mode1
    while IFS='|' read -d '|' -r failure_entry; do
      if [[ -z "$failure_entry" ]]; then
        echo "=== DEBUG: Skipping empty failure entry ==="
        continue
      fi
      echo "=== DEBUG: Processing failure entry: '$failure_entry' ==="
      IFS=':' read -r failed_config_path failed_modes <<< "$failure_entry"
      echo "=== DEBUG: Config path: '$failed_config_path', Failed modes: '$failed_modes' ==="
      
      for mode in ${failed_modes//,/ }; do
        echo "=== DEBUG: Adding retry config: '$failed_config_path' with mode: '--$mode' ==="
        retry_configs+=("$failed_config_path")
        retry_modes+=("--$mode")
      done
    done <<< "$failed_data"
    
    echo "=== DEBUG: Retry configs and modes after parsing: ==="
    for i in "${!retry_configs[@]}"; do
      echo "  ${retry_configs[$i]} (${retry_modes[$i]})"
    done
  else
    echo "=== DEBUG: No failed data found in metadata ==="
  fi
else
  echo "=== DEBUG: This is not a retry job or retry count is not 1 ==="
fi

# Only download scout configuration if we don't have retry configs
echo "=== DEBUG: Checking if we need to download scout configuration ==="
echo "configs is empty: $([[ -z "$configs" ]] && echo "true" || echo "false")"
echo "SCOUT_CONFIG_GROUP_KEY exists: $([[ -n "$SCOUT_CONFIG_GROUP_KEY" ]] && echo "true" || echo "false")"
echo "retry_configs array size: ${#retry_configs[@]}"

if [ "$configs" == "" ] && [ "$SCOUT_CONFIG_GROUP_KEY" != "" ] && [[ ${#retry_configs[@]} -eq 0 ]]; then
  echo "=== DEBUG: Downloading scout configuration (not in retry mode) ==="
  echo "--- downloading scout test configuration"
  download_artifact scout_playwright_configs.json .
  configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_playwright_configs.json)
  echo "=== DEBUG: Downloaded configs: ==="
  echo "$configs"
else
  echo "=== DEBUG: Skipping scout configuration download ==="
  echo "  - configs empty: $([[ -z "$configs" ]] && echo "true" || echo "false")"
  echo "  - SCOUT_CONFIG_GROUP_KEY empty: $([[ -z "$SCOUT_CONFIG_GROUP_KEY" ]] && echo "true" || echo "false")"
  echo "  - retry_configs not empty: $([[ ${#retry_configs[@]} -gt 0 ]] && echo "true" || echo "false")"
fi

if [ "$configs" == "" ] && [[ ${#retry_configs[@]} -eq 0 ]]; then
  echo "=== DEBUG: No configs available and not in retry mode ==="
  echo "unable to determine configs to run"
  exit 1
fi

results=()
failedConfigs=()
failedConfigPaths=()  # Store plain config paths for retry
failedConfigModes=()  # Store failed modes for each config
configWithoutTests=()

FINAL_EXIT_CODE=0

# Check if it is retry CI job, if so, run only the configs that failed in the previous attempt
echo "=== DEBUG: Checking execution mode ==="
echo "retry_configs array size: ${#retry_configs[@]}"

if [[ ${#retry_configs[@]} -gt 0 ]]; then
  echo "=== DEBUG: Running in retry mode ==="
  echo "--- Running retry mode with specific config-mode combinations"
  echo "=== DEBUG: Will run ${#retry_configs[@]} config-mode combinations ==="
  
  # Run only the specific config-mode combinations that failed
  for i in "${!retry_configs[@]}"; do
    config_path="${retry_configs[$i]}"
    mode="${retry_modes[$i]}"
    
    echo "=== DEBUG: Running retry test $((i+1))/${#retry_configs[@]} ==="
    echo "--- Running tests: $config_path ($mode)"

    # prevent non-zero exit code from breaking the loop
    set +e;
    node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
    EXIT_CODE=$?
    set -e;

    echo "=== DEBUG: Test exit code: $EXIT_CODE ==="

    if [[ $EXIT_CODE -eq 2 ]]; then
      echo "=== DEBUG: Test had no tests to run ==="
      configWithoutTests+=("$config_path ($mode)")
    elif [[ $EXIT_CODE -ne 0 ]]; then
      echo "=== DEBUG: Test failed ==="
      failedConfigs+=("$config_path ($mode) ❌")
      # Extract mode name without -- prefix for storage
      mode_name=${mode#--}
      echo "=== DEBUG: Extracted mode name: '$mode_name' ==="
      # Group failed modes by config path
      found=false
      for j in "${!failedConfigPaths[@]}"; do
        if [[ "${failedConfigPaths[$j]}" == "$config_path" ]]; then
          echo "=== DEBUG: Found existing config path, adding mode to existing entry ==="
          failedConfigModes[$j]+=",$mode_name"
          found=true
          break
        fi
      done
      if [[ "$found" == false ]]; then
        echo "=== DEBUG: Creating new config path entry ==="
        failedConfigPaths+=("$config_path")
        failedConfigModes+=("$mode_name")
      fi
      FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
    else
      echo "=== DEBUG: Test passed ==="
      results+=("$config_path ($mode) ✅")
    fi
  done
else
  echo "=== DEBUG: Running in normal mode ==="
  echo "--- Running normal mode with all configs and modes"
  echo "=== DEBUG: Will run all configs with all modes from: ==="
  echo "$configs"
  
  # Run tests for each config
  while read -r config_path; do
    if [[ -z "$config_path" ]]; then
      echo "=== DEBUG: Skipping empty config path ==="
      continue
    fi

    echo "=== DEBUG: Processing config: '$config_path' ==="
    config_failed=false
    config_failed_modes=()  # Track failed modes for this specific config
    
    for mode in $RUN_MODE_LIST; do
      echo "=== DEBUG: Running mode '$mode' for config '$config_path' ==="
      echo "--- Running tests: $config_path ($mode)"

      # prevent non-zero exit code from breaking the loop
      set +e;
      node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
      EXIT_CODE=$?
      set -e;

      echo "=== DEBUG: Test exit code: $EXIT_CODE ==="

      if [[ $EXIT_CODE -eq 2 ]]; then
        echo "=== DEBUG: Test had no tests to run ==="
        configWithoutTests+=("$config_path ($mode)")
      elif [[ $EXIT_CODE -ne 0 ]]; then
        echo "=== DEBUG: Test failed ==="
        failedConfigs+=("$config_path ($mode) ❌")
        config_failed=true
        # Extract mode name without -- prefix for storage
        mode_name=${mode#--}
        echo "=== DEBUG: Extracted mode name: '$mode_name' ==="
        config_failed_modes+=("$mode_name")
        FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
      else
        echo "=== DEBUG: Test passed ==="
        results+=("$config_path ($mode) ✅")
      fi
    done

    # Add config path and its failed modes to tracking arrays
    if [[ "$config_failed" == true ]]; then
      echo "=== DEBUG: Config '$config_path' had failures, adding to tracking arrays ==="
      failedConfigPaths+=("$config_path")
      # Join failed modes with comma for storage
      failed_modes_str=$(IFS=','; echo "${config_failed_modes[*]}")
      failedConfigModes+=("$failed_modes_str")
      echo "=== DEBUG: Added failed config path: '$config_path' with modes: '$failed_modes_str' ==="
    else
      echo "=== DEBUG: Config '$config_path' had no failures ==="
    fi
  done <<< "$configs"
fi

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
  for config in "${configWithoutTests[@]}"; do
    echo "- $config"
  done
} | buildkite-agent annotate --style "warning" --context "no-tests"
fi

if [[ ${#failedConfigs[@]} -gt 0 ]]; then
  echo "❌ Failed tests:"
  printf '%s\n' "${failedConfigs[@]}"

  # Store failed configs with their failed modes for retry
  # Format: config_path:mode1,mode2|config_path2:mode1
  echo "=== DEBUG: Preparing to store failed data for retry ==="
  echo "=== DEBUG: failedConfigPaths array: ==="
  printf '%s\n' "${failedConfigPaths[@]}"
  echo "=== DEBUG: failedConfigModes array: ==="
  printf '%s\n' "${failedConfigModes[@]}"
  
  failed_data=""
  for i in "${!failedConfigPaths[@]}"; do
    if [[ $i -gt 0 ]]; then
      failed_data+="|"
    fi
    failed_data+="${failedConfigPaths[$i]}:${failedConfigModes[$i]}"
  done
  
  echo "=== DEBUG: Storing failed data for retry: '$failed_data' ==="
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failed_data"
else
  echo "=== DEBUG: No failed configs to store ==="
fi

echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

echo "=== DEBUG: Final exit code: $FINAL_EXIT_CODE ==="
exit $FINAL_EXIT_CODE  # Exit with 10 only if there were config failures
