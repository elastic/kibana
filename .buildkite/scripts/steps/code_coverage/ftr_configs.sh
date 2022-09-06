#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/merge.sh
source .buildkite/scripts/steps/code_coverage/util.sh
source .buildkite/scripts/steps/code_coverage/node_scripts.sh

export CODE_COVERAGE=1 # Kibana is bootstrapped differently for code coverage
echo "--- KIBANA_DIR: $KIBANA_DIR"
.buildkite/scripts/bootstrap.sh
buildPlatformPlugins
is_test_execution_step

FTR_CONFIG_GROUP_KEY=${FTR_CONFIG_GROUP_KEY:-}
if [ "$FTR_CONFIG_GROUP_KEY" == "" ]; then
  echo "Missing FTR_CONFIG_GROUP_KEY env var"
  exit 1
fi

export JOB="$FTR_CONFIG_GROUP_KEY"

functionalTarget="$KIBANA_DIR/target/kibana-coverage/functional"
FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${FTR_CONFIG_GROUP_KEY}"

configs="${FTR_CONFIG:-}"

if [[ "$configs" == "" ]]; then
  echo "--- Downloading ftr test run order"
  download_artifact ftr_run_order.json .
  configs=$(jq -r '.[env.FTR_CONFIG_GROUP_KEY].names[]' ftr_run_order.json)
fi

echo "---   Config(s) for this FTR Group:"
echo "${configs[@]}"

failedConfigs=""
results=()

while read -r config; do
  if [[ ! "$config" ]]; then
    continue
  fi
  echo "--- Begin config $config"

  start=$(date +%s)

  # prevent non-zero exit code from breaking the loop
  set +e
  runFTRInstrumented "$config"
  lastCode=$?
  set -e
  dasherize() {
    local withoutExtension=${1%.*}
    dasherized=$(echo "$withoutExtension" | tr '\/' '\-')
  }
  dasherize "$config"

  if [[ -d "$functionalTarget" ]]; then
    echo "--- Server and / or Client side code coverage collected"
    if [[ -f "target/kibana-coverage/functional/coverage-final.json" ]]; then
      # We potentially have more than one file with the same name being created,
      # so we make them unique here.
      mv target/kibana-coverage/functional/coverage-final.json "target/kibana-coverage/functional/${dasherized}-server-coverage.json"
    fi
  fi

  timeSec=$(($(date +%s) - start))
  if [[ $timeSec -gt 60 ]]; then
    min=$((timeSec / 60))
    sec=$((timeSec - (min * 60)))
    duration="${min}m ${sec}s"
  else
    duration="${timeSec}s"
  fi

  results+=("- $config
    duration: ${duration}
    result: ${lastCode}")

  if [ $lastCode -ne 0 ]; then
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    if [[ "$failedConfigs" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"$config"
    else
      failedConfigs="$config"
    fi
  fi

  echo "--- Config complete: $config"
done <<<"$configs"

# Each browser unload event, creates a new coverage file.
# So, we merge them here.
if [[ -d "$functionalTarget" ]]; then
  reportMergeFunctional
  uniqueifyFunctional "$(date +%s)"
else
  echo "--- Code coverage not found in: $functionalTarget"
fi

# Nyc uses matching absolute paths for reporting / merging
# So, set all coverage json files to a specific prefx.
# The prefix will be changed to the kibana dir, in the final stage,
# so nyc doesnt error.
echo "--- Normalize file paths prefix"
replacePaths "$KIBANA_DIR/target/kibana-coverage/functional" "$KIBANA_DIR" "CC_REPLACEMENT_ANCHOR"

if [[ "$failedConfigs" ]]; then
  buildkite-agent meta-data set "$FAILED_CONFIGS_KEY" "$failedConfigs"
fi

echo "--- FTR configs complete, result(s):"
printf "%s\n" "${results[@]}"
echo ""

# So the last step "knows" this config ran
uploadRanFile "functional"

# Force exit 0 to ensure the next build step starts.
exit 0
