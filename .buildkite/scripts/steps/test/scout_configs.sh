#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
SCOUT_CONFIG_GROUP_KEY=${SCOUT_CONFIG_GROUP_KEY:-}
SCOUT_CONFIG_GROUP_TYPE=${SCOUT_CONFIG_GROUP_TYPE:-}

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

if [[ -z "$RUN_MODE_LIST" ]]; then
  echo "Unknown group: $group"
  exit 1
fi

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
retry_configs=()
retry_modes=()
if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  failed_data=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$failed_data" ]]; then
    echo "--- Retrying only failed configs and modes"
    # Parse the failed data and reconstruct configs with their specific failed modes
    # Format: config_path:mode1,mode2|config_path2:mode1
    while IFS='|' read -d '|' -r failure_entry; do
      if [[ -z "$failure_entry" ]]; then
        continue
      fi
      IFS=':' read -r failed_config_path failed_modes <<< "$failure_entry"
      for mode in ${failed_modes//,/ }; do
        retry_configs+=("$failed_config_path")
        retry_modes+=("--$mode")
      done
    done <<< "$failed_data"
    echo "Retry configs and modes:"
    for i in "${!retry_configs[@]}"; do
      echo "  ${retry_configs[$i]} (${retry_modes[$i]})"
    done
  fi
fi

# Only download scout configuration if we don't have retry configs
if [ "$configs" == "" ] && [ "$SCOUT_CONFIG_GROUP_KEY" != "" ] && [[ ${#retry_configs[@]} -eq 0 ]]; then
  echo "--- downloading scout test configuration"
  download_artifact scout_playwright_configs.json .
  configs=$(jq -r '.[env.SCOUT_CONFIG_GROUP_KEY].configs[]' scout_playwright_configs.json)
fi

if [ "$configs" == "" ] && [[ ${#retry_configs[@]} -eq 0 ]]; then
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
if [[ ${#retry_configs[@]} -gt 0 ]]; then
  echo "--- Running retry mode with specific config-mode combinations"
  # Run only the specific config-mode combinations that failed
  for i in "${!retry_configs[@]}"; do
    config_path="${retry_configs[$i]}"
    mode="${retry_modes[$i]}"
    
    echo "--- Running tests: $config_path ($mode)"

    # prevent non-zero exit code from breaking the loop
    set +e;
    node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
    EXIT_CODE=$?
    set -e;

    if [[ $EXIT_CODE -eq 2 ]]; then
      configWithoutTests+=("$config_path ($mode)")
    elif [[ $EXIT_CODE -ne 0 ]]; then
      failedConfigs+=("$config_path ($mode) ❌")
      # Extract mode name without -- prefix for storage
      mode_name=${mode#--}
      # Group failed modes by config path
      found=false
      for j in "${!failedConfigPaths[@]}"; do
        if [[ "${failedConfigPaths[$j]}" == "$config_path" ]]; then
          failedConfigModes[$j]+=",$mode_name"
          found=true
          break
        fi
      done
      if [[ "$found" == false ]]; then
        failedConfigPaths+=("$config_path")
        failedConfigModes+=("$mode_name")
      fi
      FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
    else
      results+=("$config_path ($mode) ✅")
    fi
  done
else
  echo "--- Running normal mode with all configs and modes"
  # Run tests for each config
  while read -r config_path; do
    if [[ -z "$config_path" ]]; then
      continue
    fi

    config_failed=false
    config_failed_modes=()  # Track failed modes for this specific config
    
    for mode in $RUN_MODE_LIST; do
      echo "--- Running tests: $config_path ($mode)"

      # prevent non-zero exit code from breaking the loop
      set +e;
      node scripts/scout run-tests "$mode" --config "$config_path" --kibana-install-dir "$KIBANA_BUILD_LOCATION"
      EXIT_CODE=$?
      set -e;

      if [[ $EXIT_CODE -eq 2 ]]; then
        configWithoutTests+=("$config_path ($mode)")
      elif [[ $EXIT_CODE -ne 0 ]]; then
        failedConfigs+=("$config_path ($mode) ❌")
        config_failed=true
        # Extract mode name without -- prefix for storage
        mode_name=${mode#--}
        config_failed_modes+=("$mode_name")
        FINAL_EXIT_CODE=10  # Ensure we exit with failure if any test fails with (exit code 10 to match FTR)
      else
        results+=("$config_path ($mode) ✅")
      fi
    done

    # Add config path and its failed modes to tracking arrays
    if [[ "$config_failed" == true ]]; then
      failedConfigPaths+=("$config_path")
      # Join failed modes with comma for storage
      failed_modes_str=$(IFS=','; echo "${config_failed_modes[*]}")
      failedConfigModes+=("$failed_modes_str")
    fi
  done <<< "$configs"
fi

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
  failed_data=""
  for i in "${!failedConfigPaths[@]}"; do
    if [[ $i -gt 0 ]]; then
      failed_data+="|"
    fi
    failed_data+="${failedConfigPaths[$i]}:${failedConfigModes[$i]}"
  done
  
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failed_data"
fi

echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

exit $FINAL_EXIT_CODE  # Exit with 10 only if there were config failures
