#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

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

# Build an array of config args to pass all configs to a single functional_tests run
mapfile -t configs_array <<< "$configs"
config_args=()
for cfg in "${configs_array[@]}"; do
  if [[ -n "$cfg" ]]; then
    config_args+=("--config" "$cfg")
  fi
done

# Log the full command for debugging/visibility
FULL_COMMAND="node scripts/functional_tests --bail --kibana-install-dir \"$KIBANA_BUILD_LOCATION\" ${config_args[*]} $EXTRA_ARGS"
echo "--- $ $FULL_COMMAND"

# Optional Chrome Beta setup (preserved behavior)
if [[ "${USE_CHROME_BETA:-}" =~ ^(1|true)$ ]]; then
  echo "USE_CHROME_BETA was set - using google-chrome-beta"
  export TEST_BROWSER_BINARY_PATH="$(which google-chrome-beta)"

  # download the beta version of chromedriver
  export CHROMEDRIVER_VERSION=$(curl https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json -s | jq -r '.channels.Beta.version')
  export DETECT_CHROMEDRIVER_VERSION=false
  node node_modules/chromedriver/install.js --chromedriver-force-download

  # set annotation on the build
  buildkite-agent annotate --style info --context chrome-beta "This build uses Google Chrome Beta @ ${CHROMEDRIVER_VERSION}"
fi

# Run functional tests once with all configs; capture output to parse per-config results
LOG_FILE=$(mktemp -t ftr-functional-tests-XXXXXX.log)
start=$(date +%s)
set +e
node ./scripts/functional_tests \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  "${config_args[@]}" \
  "$EXTRA_ARGS" | tee "$LOG_FILE"
# capture exit code of node, not tee
lastCode=${PIPESTATUS[0]}
set -e

# Compute total duration (per-config durations are not available from a single run)
timeSec=$(($(date +%s)-start))
if [[ $timeSec -gt 60 ]]; then
  min=$((timeSec/60))
  sec=$((timeSec-(min*60)))
  totalDuration="${min}m ${sec}s"
else
  totalDuration="${timeSec}s"
fi

# Parse results from scheduler logs: successes and failures per config
declare -A passed_map
declare -A failed_map

# Successful completion lines look like: "✔️ Completed i/N: path (completed=x)"
while IFS= read -r line; do
  rel_path=$(sed -E 's/^.*✔️ Completed [0-9]+\/[0-9]+: ([^ ]+).*$/\1/' <<< "$line")
  if [[ -n "$rel_path" && "$rel_path" != "$line" ]]; then
    passed_map["$rel_path"]=1
  fi
done < <(grep -E "✔️ Completed [0-9]+/[0-9]+: " "$LOG_FILE" || true)

# Failed run lines: "Run failed for path: <error>"
while IFS= read -r line; do
  rel_path=$(sed -E 's/^.*Run failed for ([^:]+):.*$/\1/' <<< "$line")
  if [[ -n "$rel_path" && "$rel_path" != "$line" ]]; then
    failed_map["$rel_path"]=1
  fi
done < <(grep -E "Run failed for " "$LOG_FILE" || true)

# Warm failed lines: "Warm failed for path: <error>"
while IFS= read -r line; do
  rel_path=$(sed -E 's/^.*Warm failed for ([^:]+):.*$/\1/' <<< "$line")
  if [[ -n "$rel_path" && "$rel_path" != "$line" ]]; then
    failed_map["$rel_path"]=1
  fi
done < <(grep -E "Warm failed for " "$LOG_FILE" || true)

# Build results and failedConfigs preserving original output shape
for config in "${configs_array[@]}"; do
  [[ -z "$config" ]] && continue
  if [[ -n "${failed_map[$config]:-}" ]]; then
    results+=("- $config
    duration: n/a
    result: 1")
    if [[ -n "$failedConfigs" ]]; then
      failedConfigs+=$'\n'
    fi
    failedConfigs+="$config"
  else
    # If neither failed nor explicitly passed, assume failed (did not run/finish)
    if [[ -n "${passed_map[$config]:-}" ]]; then
      results+=("- $config
    duration: n/a
    result: 0")
    else
      results+=("- $config
    duration: n/a
    result: 1")
      if [[ -n "$failedConfigs" ]]; then
        failedConfigs+=$'\n'
      fi
      failedConfigs+="$config"
    fi
  fi
done

# Overall exit code follows previous behavior: 10 if any config failed
if [[ -n "$failedConfigs" ]]; then
  exitCode=10
  echo "FTR had failing configs"
  echo "^^^ +++"
fi

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

echo "--- FTR configs complete"
printf "%s\n" "${results[@]}"
echo ""

# Scout reporter
echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi

exit $exitCode
