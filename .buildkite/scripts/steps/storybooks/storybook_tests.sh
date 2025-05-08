#!/usr/bin/env bash

set -euo pipefail

echo "Starting Storybook server..."
yarn storybook & 
STORYBOOK_PID=$!

echo "Waiting for Storybook to be ready..."
sleep 10

echo "Running Storybook tests..."
yarn test:storybook --url "$STORYBOOK_URL"

kill $STORYBOOK_PID