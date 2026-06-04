# Sourced by ftr_configs.sh — do not execute directly.
# Reads/writes globals: exitCode, failedConfigs,
# FAILED_CONFIGS_KEY, JOB, BUILDKITE_RETRY_COUNT.

FAILED_TESTS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}_failed_tests"
retry_recovered=false

# Called after attempt 1: stores failing test names so the retry can verify recovery.
store_failing_tests() {
  [[ -n "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" ]] && return
  [[ "${BUILDKITE_RETRY_COUNT:-0}" != "0" ]] && return
  [[ "$exitCode" == "0" ]] && return

  local junitDir="target/junit/$JOB"
  [[ -d "$junitDir" ]] || return

  local failedTestNames
  failedTestNames=$(node scripts/ftr_check_retry_result collect-results --type failures --junit-dir "$junitDir" || true)
  if [[ "$failedTestNames" ]]; then
    buildkite-agent meta-data set "$FAILED_TESTS_KEY" "$failedTestNames"
    echo "Stored $(echo "$failedTestNames" | wc -l | tr -d ' ') previously-failing test name(s) for retry evaluation"
  fi
}

# Called after attempt 2: marks the step green if all previously-failing tests explicitly passed.
# On a third-or-later manual retry, logs that smart-retry is inactive.
apply_smart_retry() {
  [[ -n "${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}" ]] && return
  [[ "$exitCode" == "0" ]] && return

  local retryCount="${BUILDKITE_RETRY_COUNT:-0}"

  if [[ "$retryCount" -ge "2" ]]; then
    echo "--- [smart-retry] inactive on attempt $((retryCount + 1)) — only applies to the first automatic retry"
    return
  fi

  [[ "$retryCount" != "1" ]] && return

  local prevFailedTests
  prevFailedTests=$(buildkite-agent meta-data get "$FAILED_TESTS_KEY" --default '' 2>/dev/null || true)
  [[ "$prevFailedTests" ]] || return

  local junitDir="target/junit/$JOB"

  local currentPassed
  currentPassed=$(node scripts/ftr_check_retry_result collect-results --type passes --junit-dir "$junitDir" 2>/dev/null || true)

  local notRecovered
  notRecovered=$(comm -23 <(echo "$prevFailedTests" | sort) <(echo "$currentPassed" | sort))

  if [[ -z "$notRecovered" ]]; then
    echo "--- [smart-retry] All previously-failing tests recovered on retry — marking step green"
    exitCode=0
    failedConfigs=""
    retry_recovered=true
    buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "" 2>/dev/null || true
  fi
}
