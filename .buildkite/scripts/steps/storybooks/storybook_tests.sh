#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "Starting Storybook server..."
yarn storybook apm & 
STORYBOOK_PID=$!

cleanup() {
  echo "Killing Storybook server..."
  kill "$STORYBOOK_PID"
}
trap cleanup EXIT

echo "Waiting for Storybook to be ready..."
TIMEOUT=60
RETRY_INTERVAL=2
SECONDS_WAITED=0

until curl --silent --fail "$STORYBOOK_URL" > /dev/null; do
  if [ "$SECONDS_WAITED" -ge "$TIMEOUT" ]; then
    echo "Timed out waiting for Storybook to start"
    exit 1
  fi
  sleep "$RETRY_INTERVAL"
  SECONDS_WAITED=$((SECONDS_WAITED + RETRY_INTERVAL))
done

echo "Storybook is ready."

echo "Running Storybook tests..."
yarn test:storybook --url "$STORYBOOK_URL"

kill $STORYBOOK_PID