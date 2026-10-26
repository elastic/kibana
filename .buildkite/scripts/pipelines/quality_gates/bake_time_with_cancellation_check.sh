#!/bin/bash

# This script waits for BAKE_SECONDS (environment variable) seconds and
# regularly checks for the existence of the early-bake-time-cancel BK meta-data
# key to cancel the bake time earlier with exit code 42, which should be
# handled by the calling pipeline to make it soft-fail, such that the cancelled
# bake time doesn't fail the whole BK job.

echo "--- Baking for $BAKE_SECONDS seconds with cancellation checks"
SECONDS_LEFT=$BAKE_SECONDS

while [ $SECONDS_LEFT -gt 0 ]; do
  if buildkite-agent meta-data exists 'early-bake-time-cancel' 2>/dev/null; then
    echo "+++ Bake time canceled early"
    buildkite-agent annotate --style "warning" "Bake time canceled early"
    exit 42
  fi

  # print status update only every 30 minutes
  if (( SECONDS_LEFT % 1800 == 0 )); then
    echo "Still baking... ($SECONDS_LEFT seconds remaining)"
  fi

  # check cancel signal every 5 seconds
  sleep 5
  SECONDS_LEFT=$((SECONDS_LEFT - 5))
done

echo "Bake time completed"
