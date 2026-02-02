#!/bin/bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"

# Exit code tracking
exitCode=0

# Vitest configuration
VITEST_MAX_PARALLEL="${VITEST_MAX_PARALLEL:-3}"
VITEST_MAX_OLD_SPACE_MB="${VITEST_MAX_OLD_SPACE_MB:-8192}"

echo "+++ Running Vitest Tests"

# Find all packages with vitest.config.ts files
# During the migration, only packages that have been migrated will have vitest configs
echo "--- Finding packages with Vitest configs"

VITEST_CONFIGS=$(find . -name "vitest.config.ts" -not -path "*/node_modules/*" -not -path "*/target/*" 2>/dev/null || true)

if [ -z "$VITEST_CONFIGS" ]; then
  echo "No Vitest configurations found. Skipping Vitest tests."
  echo "This is expected during the early migration phase."
  exit 0
fi

echo "Found Vitest configs:"
echo "$VITEST_CONFIGS"
echo ""

# Count configs
CONFIG_COUNT=$(echo "$VITEST_CONFIGS" | wc -l | tr -d ' ')
echo "Running tests for $CONFIG_COUNT package(s)"
echo ""

# Run Vitest for each config
for config in $VITEST_CONFIGS; do
  config_dir=$(dirname "$config")
  package_name=$(basename "$config_dir")
  
  echo "--- Running Vitest for: $package_name"
  
  node_opts="--max-old-space-size=${VITEST_MAX_OLD_SPACE_MB} --trace-warnings"
  
  set +e
  NODE_OPTIONS="$node_opts" npx vitest run --config "$config" --reporter=verbose --reporter=junit --outputFile="$config_dir/target/test-results/vitest-junit.xml"
  code=$?
  set -e
  
  if [ $code -ne 0 ]; then
    echo "Vitest failed for: $package_name"
    exitCode=10
  else
    echo "Vitest passed for: $package_name"
  fi
  
  echo ""
done

echo "--- Vitest tests complete"

if [ $exitCode -ne 0 ]; then
  echo "Some Vitest tests failed. See above for details."
fi

exit $exitCode
