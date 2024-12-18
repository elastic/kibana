#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- yarn install and bootstrap"

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi

# Use the packages that are baked into the agent image, if they exist, as a cache
# But only for agents not mounting the workspace on a local ssd or in memory
# It actually ends up being slower to move all of the tiny files between the disks vs extracting archives from the yarn cache
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ -d ~/.kibana/node_modules ]]; then
    echo "Using ~/.kibana/node_modules as a starting point"
    mv ~/.kibana/node_modules ./
  fi
  if [[ -d ~/.kibana/.yarn-local-mirror ]]; then
    echo "Using ~/.kibana/.yarn-local-mirror as a starting point"
    mv ~/.kibana/.yarn-local-mirror ./
  fi
fi

if ! yarn kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"; then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- yarn install and bootstrap, attempt 2"
  yarn kbn bootstrap --force-install
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'yarn kbn bootstrap'
fi

