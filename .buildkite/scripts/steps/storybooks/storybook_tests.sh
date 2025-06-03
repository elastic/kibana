#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "Starting Storybook server..."
yarn storybook apm & 
STORYBOOK_PID=$!

echo "Waiting for Storybook to be ready..."
sleep 60

echo "Running Storybook tests..."
yarn test:storybook --url "$STORYBOOK_URL"

kill $STORYBOOK_PID