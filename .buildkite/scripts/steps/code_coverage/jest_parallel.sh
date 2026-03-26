#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
source .buildkite/scripts/steps/code_coverage/util.sh

export JOB=$BUILDKITE_PARALLEL_JOB

# a jest failure will result in the script returning an exit code of 10
exitCode=0
results=()

if [[ "$1" == 'jest.config.js' ]]; then
  TEST_TYPE="unit"
else
  TEST_TYPE="integration"
fi

export TEST_TYPE
echo "--- downloading jest test run order"
download_artifact jest_run_order.json .
configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)

echo "--- KIBANA_DIR: $KIBANA_DIR"

echo "---  Config(s) for this JEST Group:"
echo "${configs[@]}"

while read -r config; do
  echo "--- $ node scripts/jest --config $config --coverage --coverageReporters json --coverageDirectory target/kibana-coverage/jest"

  echo "--- Print config name"
  echo "### config: $config"

  start=$(date +%s)

  # prevent non-zero exit code from breaking the loop
  set +e
  NODE_OPTIONS="--max-old-space-size=14336" node ./scripts/jest \
    --config="$config" --runInBand --ci --coverage \
    --coverageReporters json --passWithNoTests \
    --coverageDirectory target/kibana-coverage/jest
  lastCode=$?
  set -e

  if [[ -f target/kibana-coverage/jest/coverage-final.json ]]; then
    echo "--- Rename target/kibana-coverage/jest/coverage-final.json to avoid overwrite"
    mv target/kibana-coverage/jest/coverage-final.json "target/kibana-coverage/jest/coverage-$(date +%s%3N).json"
  else
    echo "Cannot find coverage-final.json"
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
    echo "Jest exited with code $lastCode"
    echo "^^^ +++"
  fi
done <<<"$configs"

echo "--- Normalize file paths prefix before final stage"
# Nyc uses matching absolute paths for reporting / merging
# So, set all coverage json files to a specific prefx.
# The prefix will be changed to the kibana dir, in the final stage,
# so nyc doesnt error.
replacePaths "$KIBANA_DIR/target/kibana-coverage/jest" "$KIBANA_DIR" "CC_REPLACEMENT_ANCHOR"

echo "--- Merging code coverage for a thread"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js --reporter json
rm -rf target/kibana-coverage/jest/*
mv target/kibana-coverage/jest-combined/coverage-final.json \
  "target/kibana-coverage/jest/jest-$TEST_TYPE-merged-coverage-$(date +%s%3N).json"

echo "--- Jest [$TEST_TYPE] configs complete"
printf "%s\n" "${results[@]}"

# Scout reporter
source .buildkite/scripts/steps/test/scout/upload_report_events.sh

# Force exit 0 to ensure the next build step starts.
exit 0
