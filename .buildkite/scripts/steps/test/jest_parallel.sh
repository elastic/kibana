#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
export JOB=${BUILDKITE_PARALLEL_JOB:-0}

# a jest failure will result in the script returning an exit code of 10
exitCode=0
results=()
configs=""
failedConfigs=""

# Parallel execution tuning (can be overridden via env)
#   JEST_MAX_PARALLEL: number of concurrent Jest config processes
#   JEST_MAX_OLD_SPACE_MB: per-process max old space size (MB)
# NOTE: JEST_MAX_PARALLEL default now depends on TEST_TYPE (unit=3, integration=1).
# It can still be overridden by exporting JEST_MAX_PARALLEL.
JEST_MAX_PARALLEL="${JEST_MAX_PARALLEL:-3}"
JEST_MAX_OLD_SPACE_MB="${JEST_MAX_OLD_SPACE_MB:-8192}"

if [[ "$1" == 'jest.config.js' ]]; then
  # unit tests
  TEST_TYPE="unit"
  JEST_MAX_PARALLEL=3 # unit tests run in parallel by default. When adjusting Buildkite resources, dont forget to update this value.
else
  TEST_TYPE="integration"
  JEST_MAX_PARALLEL=1 # integration tests should not run in parallel by default.
fi

export TEST_TYPE


# Added section for tracking and retrying failed configs
FAILED_CONFIGS_KEY="${BUILDKITE_STEP_ID}${TEST_TYPE}${JOB}"

if [[ ! "$configs" && "${BUILDKITE_RETRY_COUNT:-0}" == "1" ]]; then
  configs=$(buildkite-agent meta-data get "$FAILED_CONFIGS_KEY" --default '')
  if [[ "$configs" ]]; then
    echo "--- Retrying only failed configs"
    echo "$configs"
  fi
fi

if [ "$configs" == "" ]; then
  echo "--- downloading jest test run order"
  download_artifact jest_run_order.json .
  configs=$(jq -r 'getpath([env.TEST_TYPE]) | .groups[env.JOB | tonumber].names | .[]' jest_run_order.json)
fi

if [ "$configs" == "" ]; then
  echo "unable to determine configs to run"
  exit 1
fi

echo "+++ ⚠️ WARNING ⚠️"
echo "
  console.log(), console.warn(), and console.error() output in jest tests causes a massive amount
  of noise on CI without any perceivable benefit, so they have been disabled. If you want to log
  output in your test temporarily, you can modify 'src/platform/packages/shared/kbn-test/src/jest/setup/disable_console_logs.js'
"

# Execute all configs through the combined jest_all runner.
# The new runner will handle iterating through configs and reporting.

# Flatten configs (newline separated) into comma-separated list for flag usage.
CONFIGS_CSV=$(echo "$configs" | tr '\n' ',' | sed 's/,$//')

echo "--- Running combined jest_all for configs ($TEST_TYPE)"
echo "$configs"
echo "JEST_MAX_PARALLEL is set to: $JEST_MAX_PARALLEL"

# Set up checkpoint file for tracking completed configs (resume on agent failure)
CHECKPOINT_FILE="target/jest_checkpoint_${TEST_TYPE}_${JOB}.json"
export JEST_ALL_CHECKPOINT_PATH="$CHECKPOINT_FILE"

# Try to download existing checkpoint from previous run (if job was restarted)
if [[ "${BUILDKITE_RETRY_COUNT:-0}" != "0" ]]; then
  echo "--- Downloading checkpoint from previous run attempt"
  echo "Checkpoint: Looking for $CHECKPOINT_FILE from retry ${BUILDKITE_RETRY_COUNT}"
  echo "Checkpoint: Build ID: ${BUILDKITE_BUILD_ID}"
  echo "Checkpoint: Step ID: ${BUILDKITE_STEP_ID}"
  
  # Multiple uploads of the same checkpoint occur during a run (after each config completes)
  # This causes "Multiple artifacts" error. Solution: Download all to temp dir and pick the best one
  
  CHECKPOINT_TEMP_DIR=$(mktemp -d)
  echo "Checkpoint: Temp directory: $CHECKPOINT_TEMP_DIR"
  
  set +e
  
  # Download checkpoint(s) - Buildkite will create numbered copies if multiple exist
  # e.g., checkpoint.json, checkpoint (1).json, checkpoint (2).json, etc.
  echo "Checkpoint: Running: buildkite-agent artifact download $CHECKPOINT_FILE $CHECKPOINT_TEMP_DIR/ --include-retried-jobs"
  buildkite-agent artifact download "$CHECKPOINT_FILE" "$CHECKPOINT_TEMP_DIR/" --include-retried-jobs
  download_code=$?
  echo "Checkpoint: Download exit code: $download_code"
  set -e
  
  if [ $download_code -eq 0 ]; then
    echo "Checkpoint: Download successful, looking for checkpoint files..."
    
    # List what was downloaded
    echo "Checkpoint: Files in temp directory:"
    ls -lah "$CHECKPOINT_TEMP_DIR" || true
    find "$CHECKPOINT_TEMP_DIR" -type f || true
    
    # Find checkpoint with the most completed configs (latest progress)
    MAX_CONFIGS=0
    BEST_CHECKPOINT=""
    
    # Check all downloaded checkpoint files (including numbered copies)
    for checkpoint_file in "$CHECKPOINT_TEMP_DIR"/"$CHECKPOINT_FILE" "$CHECKPOINT_TEMP_DIR"/target/*checkpoint*.json*; do
      if [ -f "$checkpoint_file" ]; then
        echo "Checkpoint: Examining $checkpoint_file"
        config_count=$(jq -r '.completedConfigs | length' "$checkpoint_file" 2>/dev/null || echo "0")
        echo "Checkpoint: $checkpoint_file has $config_count completed configs"
        if [ "$config_count" -ge "$MAX_CONFIGS" ]; then
          MAX_CONFIGS=$config_count
          BEST_CHECKPOINT="$checkpoint_file"
        fi
      fi
    done
    
    if [ -n "$BEST_CHECKPOINT" ] && [ -f "$BEST_CHECKPOINT" ] && [ "$MAX_CONFIGS" -gt 0 ]; then
      # Create target directory if it doesn't exist
      mkdir -p "$(dirname "$CHECKPOINT_FILE")"
      cp "$BEST_CHECKPOINT" "$CHECKPOINT_FILE"
      echo "Checkpoint: Found ${MAX_CONFIGS} already-completed configs from previous attempt"
      echo "Checkpoint: Using $BEST_CHECKPOINT"
    else
      echo "Checkpoint: No valid checkpoint found (MAX_CONFIGS=$MAX_CONFIGS, BEST_CHECKPOINT=$BEST_CHECKPOINT)"
      echo "Checkpoint: Starting fresh"
    fi
  else
    echo "Checkpoint: Download failed with code $download_code"
    echo "Checkpoint: No previous checkpoint found, starting fresh"
  fi
  
  # Cleanup
  rm -rf "$CHECKPOINT_TEMP_DIR"
fi

node_opts="--max-old-space-size=${JEST_MAX_OLD_SPACE_MB} --trace-warnings --no-experimental-require-module"
if [ "${KBN_ENABLE_FIPS:-}" == "true" ]; then
  node_opts="$node_opts --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

full_command="NODE_OPTIONS=\"$node_opts\" node ./scripts/jest_all --configs=\"$CONFIGS_CSV\" --coverage=false --passWithNoTests --maxParallel=\"$JEST_MAX_PARALLEL\""

echo "Actual full command is:"
echo "$full_command"
echo ""

set +e
eval "$full_command"
code=$?
set -e



if [ $code -ne 0 ]; then
  exitCode=10
fi

echo "--- Jest configs complete (combined)"

# Scout reporter
source .buildkite/scripts/steps/test/scout_upload_report_events.sh

exit $exitCode