#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

SCOUT_SERVER_LOG=".scout/server.log"

LOAD_IDS=()
PASSED_INDICES=""
PASSED=()
FAILED=()
SKIPPED=()

# Fail early if any of the given environment variable names are unset or empty
check_required_env_vars() {
  local missing=()

  for var in "$@"; do
    if [[ -z "${!var:-}" ]]; then
      missing+=("$var")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing required environment variables:"
    printf '  - %s\n' "${missing[@]}"
    exit 1
  fi
}

# Download the test lane loads artifact produced by uploadAllScoutTestLaneSteps()
download_test_lane_loads() {
  echo "--- Downloading test lane loads file"
  download_tmp_artifact "$SCOUT_TEST_LANE_LOADS_PATH" . "$BUILDKITE_BUILD_ID"
}

# Read the comma-separated list of previously passed load indices from Buildkite metadata
load_passed_indices() {
  PASSED_INDICES=$(buildkite-agent meta-data get "$PASSED_LOAD_INDICES_META_KEY" --default "" 2>/dev/null)

  if [[ -n "$PASSED_INDICES" ]]; then
    echo "Resuming: indices already passed: $PASSED_INDICES"
  fi
}

# Check if a load index was already marked as passed
has_load_index_passed() {
  local idx="$1"
  [[ ",$PASSED_INDICES," == *",$idx,"* ]]
}

# Append a load index to the passed list and persist it to Buildkite metadata
mark_index_passed() {
  local idx="$1"

  if [[ -z "$PASSED_INDICES" ]]; then
    PASSED_INDICES="$idx"
  else
    PASSED_INDICES="${PASSED_INDICES},${idx}"
  fi

  buildkite-agent meta-data set "$PASSED_LOAD_INDICES_META_KEY" "$PASSED_INDICES"
}

# Extract the load IDs (Scout test config paths) assigned to this lane from the loads file
read_load_ids() {
  mapfile -t LOAD_IDS < <(jq -r --arg key "$BUILDKITE_STEP_KEY" '.[$key][]' "$SCOUT_TEST_LANE_LOADS_PATH")

  if [[ ${#LOAD_IDS[@]} -eq 0 ]]; then
    echo "No test lane load IDs found for step key '$BUILDKITE_STEP_KEY'"
    exit 1
  fi

  echo "Found ${#LOAD_IDS[@]} test lane load(s) for step key '$BUILDKITE_STEP_KEY'"
}

# Start the Scout test server in the background and wait for it to become ready
start_server() {
  local timeout_seconds="$1"
  mkdir -p "$(dirname "$SCOUT_SERVER_LOG")"

  echo "--- Starting test server (timeout: ${timeout_seconds}s)"

  node scripts/scout start-server \
    --location "$SCOUT_TEST_TARGET_LOCATION" \
    --arch "$SCOUT_TEST_TARGET_ARCH" \
    --domain "$SCOUT_TEST_TARGET_DOMAIN" \
    --serverConfigSet "$SCOUT_TEST_SERVER_CONFIG_SET" \
    --kibanaInstallDir "$KIBANA_BUILD_LOCATION" \
    > "$SCOUT_SERVER_LOG" 2>&1 &
  SCOUT_SERVER_PID=$!

  local ready_marker="Elasticsearch and Kibana are ready for functional testing"

  for _ in $(seq 1 "$timeout_seconds"); do
    if grep -q "$ready_marker" "$SCOUT_SERVER_LOG" 2>/dev/null; then
      echo "Test server is ready (PID: $SCOUT_SERVER_PID)"
      return
    fi
    if ! kill -0 "$SCOUT_SERVER_PID" 2>/dev/null; then
      echo "Test server exited unexpectedly. Last 50 lines of log:"
      tail -n 50 "$SCOUT_SERVER_LOG" 2>/dev/null || true
      wait "$SCOUT_SERVER_PID" || true
      exit 1
    fi
    sleep 1
  done

  echo "Timed out waiting for test server to be ready. Last 50 lines of log:"
  tail -n 50 "$SCOUT_SERVER_LOG" 2>/dev/null || true
  exit 1
}

# Uploads Scout test server logs as a Buildkite artifact
upload_test_server_log() {
  if [[ ! -f "$SCOUT_SERVER_LOG" ]]; then
    echo "No server log found at $SCOUT_SERVER_LOG, skipping upload"
    return
  fi

  echo "--- Uploading test server log"
  buildkite-agent artifact upload "$SCOUT_SERVER_LOG"
}

# Stop the test server if it's still running
stop_server() {
  if [[ -n "${SCOUT_SERVER_PID:-}" ]] && kill -0 "$SCOUT_SERVER_PID" 2>/dev/null; then
    echo "--- Stopping test server (PID: $SCOUT_SERVER_PID)"
    kill "$SCOUT_SERVER_PID" 2>/dev/null || true
    wait "$SCOUT_SERVER_PID" 2>/dev/null || true
  fi

  if [[ ${#FAILED[@]} -gt 0 ]]; then
    upload_test_server_log
  fi
}

# Run Playwright tests for a single config and categorize the result as passed or failed
run_scout_tests() {
  local idx="$1"
  local config_path="$2"

  echo "--- Running: $config_path"
  local start_time
  start_time=$(date +%s)

  set +e

  node scripts/scout run-tests \
    --location "$SCOUT_TEST_TARGET_LOCATION" \
    --arch "$SCOUT_TEST_TARGET_ARCH" \
    --domain "$SCOUT_TEST_TARGET_DOMAIN" \
    --config "$config_path"

  local exit_code=$?
  set -e

  local elapsed=$(( $(date +%s) - start_time ))
  local duration
  if [[ $elapsed -ge 60 ]]; then
    duration="$(( elapsed / 60 ))m $(( elapsed % 60 ))s"
  else
    duration="${elapsed}s"
  fi

  case $exit_code in
    0)
      upload_report_events "$config_path"
      mark_index_passed "$idx"
      PASSED+=("$config_path ($duration)")
      ;;
    *)
      echo "^^^ +++"
      upload_report_events "$config_path"
      FAILED+=("$config_path")
      echo "Exited with code $exit_code for $config_path"
      ;;
  esac
}

# Upload Scout reporter events and clean up event reports, preserving failure reports
upload_report_events() {
  local config_path="$1"

  if [[ ! "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true|yes)$ ]]; then
    return
  fi

  if [[ ! -d ".scout/reports" ]] || [[ -z "$(ls -A .scout/reports 2>/dev/null)" ]]; then
    echo "No Scout reports found for $config_path"
    return
  fi

  echo "~~~ Uploading report events: $config_path"

  set +e
  node scripts/scout upload-events --dontFailOnError
  local exit_code=$?
  set -e

  if [[ $exit_code -ne 0 ]]; then
    echo "Upload failed for $config_path (exit code $exit_code)"
  fi

  # Clean up event reports to avoid double ingestion, preserving failure reports for annotations
  for dir in .scout/reports/scout-playwright-*; do
    if [[ -d "$dir" ]] && [[ "$dir" != *"scout-playwright-test-failures-"* ]]; then
      rm -rf "$dir"
    fi
  done
}

# Return the final status of a config path based on the run results
get_config_status() {
  local config="$1" s
  for s in "${SKIPPED[@]+"${SKIPPED[@]}"}"; do [[ "$s" == "$config" ]] && echo "skipped" && return; done
  for s in "${PASSED[@]+"${PASSED[@]}"}"; do [[ "$s" == "$config"* ]] && echo "passed" && return; done
  for s in "${FAILED[@]+"${FAILED[@]}"}"; do [[ "$s" == "$config" ]] && echo "failed" && return; done
  echo "unknown"
}

display_test_load_ids_in_order_of_execution() {
  echo ""
  echo "Test loads in this lane ran in the following order:"
  echo ""
  local load_count=${#LOAD_IDS[@]}
  local idx_width=${#load_count}
  local idx_sep
  idx_sep=$(printf '%*s' "$idx_width" '' | tr ' ' '-')
  printf '  %*s  %-7s  %s\n' "$idx_width" "#" "Status" "Config"
  printf '  %*s  %-7s  %s\n' "$idx_width" "$idx_sep" "-------" "------"
  local i
  for i in "${!LOAD_IDS[@]}"; do
    local config="${LOAD_IDS[$i]}"
    local status
    status=$(get_config_status "$config")
    printf '  %*d  %-7s  %s\n' "$idx_width" "$((i+1))" "$status" "$config"
  done
}

# Print a summary of test results
print_summary() {
  echo "+++ Scout Test Lane Summary"
  echo "✅ Passed: ${#PASSED[@]} run(s)"
  echo "❌ Failed: ${#FAILED[@]} run(s)"
  echo "⏩️ Skipped: ${#SKIPPED[@]} run(s)"

  if [[ ${#SKIPPED[@]} -gt 0 ]]; then
    echo ""
    echo "Skipped run(s) (passed in a previous attempt):"
    printf '  %s\n' "${SKIPPED[@]}"
  fi

  if [[ ${#PASSED[@]} -gt 0 ]]; then
    echo ""
    echo "Passed run(s):"
    printf '  %s\n' "${PASSED[@]}"
  fi

  if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo ""
    echo "Failed run(s):"
    printf '  %s\n' "${FAILED[@]}"
    display_test_load_ids_in_order_of_execution
  fi
}

#
# MAIN SCRIPT WORKFLOW
#
check_required_env_vars \
  BUILDKITE_STEP_KEY \
  SCOUT_TEST_LANE_LOADS_PATH \
  SCOUT_TEST_TARGET_LOCATION \
  SCOUT_TEST_TARGET_ARCH \
  SCOUT_TEST_TARGET_DOMAIN \
  SCOUT_TEST_SERVER_CONFIG_SET \
  SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS \
  KIBANA_BUILD_LOCATION

PASSED_LOAD_INDICES_META_KEY="${BUILDKITE_STEP_KEY}_passed"

download_test_lane_loads
read_load_ids
load_passed_indices

trap stop_server EXIT
start_server "$SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS"

for i in "${!LOAD_IDS[@]}"; do
  config_path="${LOAD_IDS[$i]}"

  if has_load_index_passed "$i"; then
    SKIPPED+=("$config_path")
    echo "~~~ Skipping (already passed): $config_path"
    continue
  fi

  run_scout_tests "$i" "$config_path"
done

print_summary

if [[ ${#FAILED[@]} -gt 0 ]]; then
  exit 10
fi
