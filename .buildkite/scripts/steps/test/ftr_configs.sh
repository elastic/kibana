#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/test/ftr_netns.sh

BUILDKITE_PARALLEL_JOB=${BUILDKITE_PARALLEL_JOB:-}
FTR_CONFIG_GROUP_KEY=${FTR_CONFIG_GROUP_KEY:-}
if [ "$FTR_CONFIG_GROUP_KEY" == "" ] && [ "$BUILDKITE_PARALLEL_JOB" == "" ]; then
  echo "Missing FTR_CONFIG_GROUP_KEY env var"
  exit 1
fi

EXTRA_ARGS=${FTR_EXTRA_ARGS:-}
test -z "$EXTRA_ARGS" || buildkite-agent meta-data set "ftr-extra-args" "$EXTRA_ARGS"

export JOB="$FTR_CONFIG_GROUP_KEY"

FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}"

# a FTR failure will result in the script returning an exit code of 10
exitCode=0

configs="${FTR_CONFIG:-}"

# The first retry should only run the configs that failed in the previous attempt
# Any subsequent retries, which would generally only happen by someone clicking the button in the UI, will run everything
if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ] && [ "$FTR_CONFIG_GROUP_KEY" != "" ]; then
  echo "--- downloading ftr test run order"
  download_artifact ftr_run_order.json .
  configs=$(jq -r '.[env.FTR_CONFIG_GROUP_KEY].names[]' ftr_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

failedConfigs=""
results=()

# Convert the configs into a bash array for scheduling.
readarray -t config_list <<< "$configs"

config_count=${#config_list[@]}
if (( config_count == 0 )); then
  echo "No FTR configs resolved for execution"
  exit 0
fi

max_parallel=${FTR_MAX_PARALLEL:-1}
if ! [[ "$max_parallel" =~ ^[0-9]+$ ]] || (( max_parallel < 1 )); then
  echo "Invalid FTR_MAX_PARALLEL value '${FTR_MAX_PARALLEL:-}' - defaulting to 1"
  max_parallel=1
fi

if (( max_parallel > 245 )); then
  echo "FTR_MAX_PARALLEL value ${max_parallel} exceeds supported namespace limit (<=245)"
  exit 1
fi

echo "--- preparing to run ${config_count} config(s) with up to ${max_parallel} in parallel"

declare -a slot_busy=()
for ((slot=0; slot<max_parallel; slot++)); do
  slot_busy[$slot]=0
done

declare -a running_pids=()
declare -A pid_to_config=()
declare -A pid_to_slot=()
declare -A pid_to_start=()
declare -A pid_to_log=()
declare -A pid_to_mode=()

mkdir -p artifacts/ftr

trap 'ftr_netns_cleanup_all' EXIT

# Returns the index of the next available namespace slot or an empty string if none are free.
find_available_slot() {
  local slot
  for ((slot=0; slot<max_parallel; slot++)); do
    if [[ "${slot_busy[$slot]}" -eq 0 ]]; then
      printf "%d" "$slot"
      return 0
    fi
  done
  return 0
}

# Starts a config execution inside the supplied namespace slot.
start_config_run() {
  local config_path="$1"
  local slot="$2"

  ftr_netns_create "$slot"

  local namespace_name
  namespace_name=$(ftr_netns_name "$slot")
  local mode="unknown"
  if [[ -f "${FTR_NETNS_STATE_DIR}/${namespace_name}.mode" ]]; then
    mode=$(<"${FTR_NETNS_STATE_DIR}/${namespace_name}.mode")
  fi

  local log_file="artifacts/ftr/${namespace_name}.log"
  local full_command="node scripts/functional_tests --bail --kibana-install-dir $KIBANA_BUILD_LOCATION --config $config_path"
  if [[ -n "$EXTRA_ARGS" ]]; then
    full_command+=" $EXTRA_ARGS"
  fi

  local start_epoch
  start_epoch=$(date +%s)

  (
    set -euo pipefail
    set -o pipefail
    export FTR_NETNS_INDEX="$slot"
    export FTR_NETNS_NAME="$namespace_name"
    export FTR_NETNS_MODE="$mode"
    export FTR_NETNS_LOG_PATH="$log_file"
    run_args=(node ./scripts/functional_tests --bail --kibana-install-dir "$KIBANA_BUILD_LOCATION" --config="$config_path")
    if [[ -n "$EXTRA_ARGS" ]]; then
      # shellcheck disable=SC2206
      eval "run_args+=( ${EXTRA_ARGS} )"
    fi

    {
      echo "--- [${namespace_name}|${mode}] ${full_command}"
      ip netns exec "${namespace_name}" "${run_args[@]}"
    } 2>&1 | tee "${log_file}"

    command_status=${PIPESTATUS[0]}
    exit "${command_status}"
  ) &
  local pid=$!

  pid_to_config["$pid"]="$config_path"
  pid_to_slot["$pid"]="$slot"
  pid_to_start["$pid"]="$start_epoch"
  pid_to_log["$pid"]="$log_file"
  pid_to_mode["$pid"]="$mode"

  running_pids+=("$pid")
  slot_busy[$slot]=1
}

# Waits for a config run to finish, updates bookkeeping, and releases the namespace slot.
await_config_run() {
  local pid="$1"
  local wait_status=0
  if ! wait "$pid"; then
    wait_status=$?
  fi

  local config_path="${pid_to_config[$pid]}"
  local slot="${pid_to_slot[$pid]}"
  local namespace_name
  namespace_name=$(ftr_netns_name "$slot")
  local start_epoch="${pid_to_start[$pid]}"
  local log_file="${pid_to_log[$pid]}"
  local mode="${pid_to_mode[$pid]:-unknown}"

  local end_epoch
  end_epoch=$(date +%s)
  local elapsed=$((end_epoch - start_epoch))
  if (( elapsed < 0 )); then
    elapsed=0
  fi

  local duration
  if (( elapsed > 60 )); then
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed - (minutes * 60)))
    duration="${minutes}m ${seconds}s"
  else
    duration="${elapsed}s"
  fi

  results+=("- ${config_path}
    duration: ${duration}
    namespace: ${namespace_name}
    mode: ${mode}
    log: ${log_file}
    result: ${wait_status}")

  local updated_running=()
  local tracked_pid
  for tracked_pid in "${running_pids[@]}"; do
    if [[ "${tracked_pid}" != "${pid}" ]]; then
      updated_running+=("${tracked_pid}")
    fi
  done
  running_pids=("${updated_running[@]}")

  if [[ "${wait_status}" -ne 0 ]]; then
    exitCode=10
    echo "FTR exited with code ${wait_status} for ${config_path} (namespace ${namespace_name})"
    echo "^^^ +++"

    if [[ -n "${failedConfigs}" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"${config_path}"
    else
      failedConfigs="${config_path}"
    fi
  else
    echo "--- [${namespace_name}] ${config_path} completed successfully"
  fi

  ftr_netns_destroy "${slot}"
  slot_busy[$slot]=0

  unset pid_to_config["${pid}"]
  unset pid_to_slot["${pid}"]
  unset pid_to_start["${pid}"]
  unset pid_to_log["${pid}"]
  unset pid_to_mode["${pid}"]
}

if [[ "${USE_CHROME_BETA:-}" =~ ^(1|true)$ ]]; then
  echo "USE_CHROME_BETA was set - using google-chrome-beta"
  export TEST_BROWSER_BINARY_PATH="$(which google-chrome-beta)"

  # Download the beta version of chromedriver exactly once before spawning parallel jobs.
  export CHROMEDRIVER_VERSION=$(curl https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json -s | jq -r '.channels.Beta.version')
  export DETECT_CHROMEDRIVER_VERSION=false
  node node_modules/chromedriver/install.js --chromedriver-force-download

  # Set annotation on the build so the UI reflects the beta usage.
  buildkite-agent annotate --style info --context chrome-beta "This build uses Google Chrome Beta @ ${CHROMEDRIVER_VERSION}"
fi

for config in "${config_list[@]}"; do
  if [[ -z "${config}" ]]; then
    continue
  fi

  namespace_slot=$(find_available_slot)
  while [[ -z "${namespace_slot}" ]]; do
    if (( ${#running_pids[@]} == 0 )); then
      echo "No running processes but no namespace slots available"
      exit 1
    fi
    await_config_run "${running_pids[0]}"
    namespace_slot=$(find_available_slot)
  done

  start_config_run "${config}" "${namespace_slot}"
done

while (( ${#running_pids[@]} > 0 )); do
  await_config_run "${running_pids[0]}"
done

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

# Scout reporter
source .buildkite/scripts/steps/test/scout_upload_report_events.sh

exit $exitCode
