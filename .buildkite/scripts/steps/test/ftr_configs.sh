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

config_args=()
while read -r config; do
  if [[ "$config" ]]; then
    config_args+=("--config" "$config")
  fi
done <<< "$configs"

if [[ ${#config_args[@]} -eq 0 ]]; then
  echo "No configs resolved after processing input"
  exit 1
fi

cmd=(node scripts/functional_tests_parallel --bail --inherit --stats)

# if [[ -n "${KIBANA_BUILD_LOCATION:-}" ]]; then
#   cmd+=(--kibana-install-dir "$KIBANA_BUILD_LOCATION")
# fi

cmd+=("${config_args[@]}")

if [[ -n "$EXTRA_ARGS" ]]; then
  # shellcheck disable=SC2206
  extra_args=($EXTRA_ARGS)
  cmd+=("${extra_args[@]}")
fi

echo "--- Running functional_tests_parallel"
echo "--- $ ${cmd[*]}"

set +e
"${cmd[@]}"
parallel_exit=$?
set -e

if [[ $parallel_exit -ne 0 ]]; then
  exit 10
fi

exit 0
