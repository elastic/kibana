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

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- pnpm install and bootstrap, attempt 2"
  pnpm kbn bootstrap --force-install || pnpm kbn bootstrap
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'pnpm kbn bootstrap'
fi

# Yarn cache is only needed during install. Drop it afterwards to reclaim disk.
# Build steps that still run package installs afterwards can opt out with KEEP_INSTALL_CACHE=1.
if [[ -z "${KEEP_INSTALL_CACHE:-}" ]]; then
  echo "--- Clearing yarn cache"
  echo 'Removing ~/.kibana' && rm -rf ~/.kibana
  echo 'Removing /opt/buildkite-agent/.cache/yarn' && rm -rf /opt/buildkite-agent/.cache/yarn
  echo 'Removing /opt/buildkite-agent/.yarn-local-mirror' && rm -rf /opt/buildkite-agent/.yarn-local-mirror
  echo 'Removing ./.yarn-local-mirror' && rm -rf ./.yarn-local-mirror
  echo "Available disk space after clearing yarn cache:"
  df -h . || echo "Failed to get disk space"
fi
