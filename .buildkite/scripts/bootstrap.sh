#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- pnpm install and bootstrap"

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi

# Use the packages that are baked into the agent image, if they exist, as a cache
# But only for agents not mounting the workspace on a local ssd or in memory
# It actually ends up being slower to move all of the tiny files between the disks vs extracting archives from the yarn cache
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ -d ~/.cache/kibana/pnpm/node_modules ]]; then
    echo "Using ~/.cache/kibana/pnpm/node_modules as a starting point"
    mv ~/.cache/kibana/pnpm/node_modules ./
  fi
  if [[ -d ~/.cache/kibana/pnpm/.pnpm-store ]]; then
    echo "Using ~/.cache/kibana/pnpm/.pnpm-store as a starting point"
    mv ~/.cache/kibana/pnpm/.pnpm-store ./.pnpm-store
  fi
  # Check if there's a cache artifact uploaded from a previous step
  if [[ -z "${KBN_BOOTSTRAP_NO_PREBUILT:-}" ]]; then
    if download_tmp_artifact moon-cache.tar.zst "$HOME" "$BUILDKITE_BUILD_ID" false; then
      echo "Found moon-cache.tar.zst artifact, extracting to ./.moon/cache"
      mkdir -p ./.moon/cache
      echo "Extracting moon-cache.tar.zst to ./.moon/cache"
      tar -xf ~/moon-cache.tar.zst -I zstd -C ./
    fi
    .buildkite/scripts/common/activate_service_account.sh --unset-impersonation
  fi
fi

if ! (pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Delete node_modules in between attempts to prompt a clean install
  rm -rf node_modules

  echo "--- pnpm install and bootstrap, attempt 2"
  pnpm kbn bootstrap --force-install
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'pnpm kbn bootstrap'
fi

# Drop caches after install to reclaim disk.
if [[ -z "${KEEP_INSTALL_CACHE:-}" ]]; then
  echo "--- Clearing cache leftovers"
  # We no longer use this cache
  (echo 'Removing ~/.kibana and ./.yarn-local-mirror' && \
    rm -rf ~/.kibana ./.yarn-local-mirror \
    df -h .) &
fi
