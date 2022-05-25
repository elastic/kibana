#!/bin/bash

set -euo pipefail

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
buildkite-agent artifact download jest_run_order.json .
configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)

echo "--- Print KIBANA_DIR"
echo "### KIBANA_DIR: $KIBANA_DIR"

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

  penulitimate=target/kibana-coverage/jest/coverage-final.json
  if [[ -f "$penultimate" ]]; then
    echo "--- Rename $penulitimate to avoid overwrite && Clean Jest Coverage Paths"
    mv $penulitimate "target/kibana-coverage/jest/coverage-$(date +%s%3N).json"
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

echo "--- Replace paths after all configs:"
fileHeads "target/file-heads-jest-post-thread-and-before-replacement.txt" target/kibana-coverage/jest
replacePaths "$KIBANA_DIR/target/kibana-coverage/jest"
fileHeads "target/file-heads-jest-post-thread-and-after-replacement.txt" target/kibana-coverage/jest


echo "--- Jest configs complete"
printf "%s\n" "${results[@]}"
echo ""

# Force exit 0 to ensure the next build step starts.
exit 0
