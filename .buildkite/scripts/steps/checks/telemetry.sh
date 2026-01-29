#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Telemetry Schema

# Check if any telemetry-related files were changed
# If QUICK_CHECK_TARGET_FILES is set and no collector files are present, skip the check
should_skip_telemetry() {
  if [[ -z "${QUICK_CHECK_TARGET_FILES:-}" ]]; then
    return 1  # No file filter, run the check
  fi

  # Patterns that indicate telemetry collector files
  # - Files in collectors directories
  # - Files with collector/usage in name
  # - Telemetry config files
  # Note: kbn-telemetry-tools is the tooling, not collectors - changes there don't need validation
  local collector_patterns=(
    "collectors/"
    "_collector"
    "usage_collector"
    "telemetry_collector"
    "/server/telemetry/"
    "/server/usage/"
    ".telemetryrc.json"
  )

  IFS=',' read -ra FILES <<< "$QUICK_CHECK_TARGET_FILES"
  for file in "${FILES[@]}"; do
    for pattern in "${collector_patterns[@]}"; do
      if [[ "$file" == *"$pattern"* ]]; then
        return 1  # Found a telemetry-related file, run the check
      fi
    done
  done

  return 0  # No telemetry files found, skip
}

if should_skip_telemetry; then
  echo "No telemetry-related files changed, skipping telemetry check"
  exit 0
fi

# Build root filter arguments if target packages are specified
ROOT_ARGS=""
if [[ -n "${QUICK_CHECK_TARGET_PACKAGES:-}" ]]; then
  echo "Scoping telemetry check to packages: ${QUICK_CHECK_TARGET_PACKAGES}"
  IFS=',' read -ra PACKAGES <<< "$QUICK_CHECK_TARGET_PACKAGES"
  for pkg in "${PACKAGES[@]}"; do
    # Map package path to telemetry root
    # e.g., "x-pack/solutions/observability/plugins/foo" -> "--root x-pack/solutions/observability"
    #       "src/platform/plugins/foo" -> "--root src/platform"
    #       "packages/foo" -> "--root packages"
    if [[ "$pkg" == x-pack/solutions/* ]]; then
      # Extract solution name: x-pack/solutions/observability/... -> x-pack/solutions/observability
      ROOT=$(echo "$pkg" | cut -d'/' -f1-3)
    elif [[ "$pkg" == x-pack/platform/* ]]; then
      ROOT="x-pack/platform"
    elif [[ "$pkg" == x-pack/* ]]; then
      ROOT="x-pack/plugins"
    elif [[ "$pkg" == src/platform/* ]]; then
      ROOT="src/platform"
    elif [[ "$pkg" == src/plugins/* ]]; then
      ROOT="src/plugins"
    elif [[ "$pkg" == packages/* ]]; then
      ROOT="packages"
    else
      ROOT="$pkg"
    fi
    # Only add if not already in ROOT_ARGS
    if [[ ! "$ROOT_ARGS" == *"--root $ROOT"* ]]; then
      ROOT_ARGS="$ROOT_ARGS --root $ROOT"
    fi
  done
fi

if is_pr && ! is_auto_commit_disabled; then
  eval "node scripts/telemetry_check --baseline \"${GITHUB_PR_MERGE_BASE:-}\" --fix $ROOT_ARGS"
  check_for_changed_files "node scripts/telemetry_check" true
elif is_pr; then
  eval "node scripts/telemetry_check --baseline \"${GITHUB_PR_MERGE_BASE:-}\" $ROOT_ARGS"
else
  # For local runs or on-merge pipeline
  eval "node scripts/telemetry_check ${ROOT_ARGS:-}"
fi
