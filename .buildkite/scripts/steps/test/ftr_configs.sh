#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/test/test_group_env.sh

export JOB_NUM=$BUILDKITE_PARALLEL_JOB
export JOB=ftr-configs-${JOB_NUM}

# a FTR failure will result in the script returning an exit code of 10
exitCode=0

if [[ "$configs" == "" ]]; then
  echo "--- downloading ftr test run order"
  buildkite-agent artifact download ftr_run_order.json .
  configs=$(jq -r '.groups[env.JOB_NUM | tonumber].names | .[]' ftr_run_order.json)
fi

while read -r config; do
  echo "--- $ node scripts/functional_tests --bail --config $config"
  # prevent non-zero exit code from breaking the loop
  set +e;
  node ./scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config"
  lastCode=$?
  set -e;

  if [ $lastCode -ne 0 ]; then
    exitCode=10
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"
  fi
done <<< "$configs"

exit $exitCode
