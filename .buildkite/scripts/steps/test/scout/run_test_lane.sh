#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

SCOUT_SERVER_LOG=".scout/server.log"
PLAYWRIGHT_BIN="./node_modules/.bin/playwright"

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
  download_artifact "$SCOUT_TEST_LANE_LOADS_PATH" .
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

# Stop the test server if it's still running
stop_server() {
  if [[ -n "${SCOUT_SERVER_PID:-}" ]] && kill -0 "$SCOUT_SERVER_PID" 2>/dev/null; then
    echo "--- Stopping test server (PID: $SCOUT_SERVER_PID)"
    kill "$SCOUT_SERVER_PID" 2>/dev/null || true
    wait "$SCOUT_SERVER_PID" 2>/dev/null || true
  fi
}

# Run Playwright tests for a single config and categorize the result as passed or failed
run_scout_tests() {
  local idx="$1"
  local config_path="$2"

  echo "--- Running: $config_path"

  local pw_args=(
    test
    "--config=$config_path"
    "--grep=$PLAYWRIGHT_GREP_TAG"
    "--project=$PLAYWRIGHT_PROJECT"
  )

  local pw_env=(
    "SCOUT_TARGET_LOCATION=$SCOUT_TEST_TARGET_LOCATION"
    "SCOUT_TARGET_ARCH=$SCOUT_TEST_TARGET_ARCH"
    "SCOUT_TARGET_DOMAIN=$SCOUT_TEST_TARGET_DOMAIN"
    "NODE_OPTIONS=${NODE_OPTIONS:-} --require=@kbn/babel-register/install"
  )

  local start_time
  start_time=$(date +%s)

  set +e
  env "${pw_env[@]}" "$PLAYWRIGHT_BIN" "${pw_args[@]}"
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
      upload_report_events "$config_path"
      FAILED+=("$config_path")
      echo "Exited with code $exit_code for $config_path"
      echo "^^^ +++"
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

  echo "--- Uploading report events: $config_path"

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
PLAYWRIGHT_GREP_TAG="@${SCOUT_TEST_TARGET_LOCATION}-${SCOUT_TEST_TARGET_ARCH}-${SCOUT_TEST_TARGET_DOMAIN}"
PLAYWRIGHT_PROJECT="local"

download_test_lane_loads
read_load_ids
load_passed_indices

trap stop_server EXIT
start_server "$SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS"

for i in "${!LOAD_IDS[@]}"; do
  config_path="${LOAD_IDS[$i]}"

  if has_load_index_passed "$i"; then
    SKIPPED+=("$config_path")
    echo "--- Skipping (already passed): $config_path"
    continue
  fi

  run_scout_tests "$i" "$config_path"
done

print_summary

if [[ ${#FAILED[@]} -gt 0 ]]; then
  exit 10
fi
