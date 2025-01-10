#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'

# cleanup old eslint cache
echo "Cleaning up old eslint cache"
find . -name ".eslintcache" -delete -print

# disable "Exit immediately" mode so that we can run eslint, capture it's exit code, and respond appropriately
# after possibly commiting fixed files to the repo
set +e
# Add at start of script, after set -euo pipefail
cleanup() {
  # Kill all child processes
  pkill -P $$ || true
}
trap cleanup EXIT

# Replace existing eslint section with:
echo '--- Lint: eslint'
echo "Starting eslint with timeout..."

if is_pr && ! is_auto_commit_disabled; then
  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 8 -I {} bash -c 'timeout 300s node scripts/eslint --no-cache --fix {} || echo "Failed: {}"'
else
  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 8 -I {} bash -c 'timeout 300s node scripts/eslint --no-cache {} || echo "Failed: {}"'
fi

# Check if any eslint processes are still running
running_eslint=$(pgrep -f "node.*eslint" || true)
if [ -n "$running_eslint" ]; then
  echo "Killing hanging eslint processes: $running_eslint"
  kill $running_eslint || true
fi

eslint_exit=$?
# re-enable "Exit immediately" mode
set -e

desc="node scripts/eslint --no-cache"
if is_pr && ! is_auto_commit_disabled; then
  desc="$desc --fix"
fi

check_for_changed_files "$desc" true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
