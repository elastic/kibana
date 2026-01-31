#!/usr/bin/env bash
# Run the LLM "quick-but-wide" checks for the AI loop: minimal test coverage
# that still catches common issues (see src/dev/run_llm.ts for details).
# This stays a bash script because the sandbox may not have Node initialized
# yet; the wrapper selects the runtime before invoking the Node entrypoint.
set -euo pipefail

if command -v nvm >/dev/null 2>&1; then
  nvm use >/dev/null
elif command -v fnm >/dev/null 2>&1; then
  # For all my 🐟 friends
  fnm use >/dev/null
else
  echo "nvm or fnm not found; install one." >&2
  exit 1
fi

if command -v yarn >/dev/null 2>&1; then
  node --no-experimental-require-module -e "process.argv[1]=require('path').resolve('scripts/llm.sh'); require('@kbn/setup-node-env'); require('./src/dev/run_llm');"
  exit 0
fi

echo "yarn not found; install yarn." >&2
exit 1
