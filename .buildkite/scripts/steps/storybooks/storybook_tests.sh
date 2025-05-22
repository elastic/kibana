#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "Starting Storybook server..."
yarn storybook apm --port 6006 & 
STORYBOOK_PID=$!

echo "Waiting for Storybook to be ready..."
sleep 10

echo "Running Storybook tests..."
yarn test:storybook --url "$STORYBOOK_URL"

kill $STORYBOOK_PID