#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- pnpm install and bootstrap"

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi

# Remove this once we have pnpm store in the agent cache
rm -rf ./node_modules

# Use packages baked into the agent image as a cache, but only when the workspace
# is not on local ssd or in memory — moving many small files between disks is
# slower than linking from the pnpm store.
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ -d ~/.kibana/node_modules ]]; then
    echo "Using ~/.kibana/node_modules as a starting point"
    mv ~/.kibana/node_modules ./
  fi
  if [[ -d ~/.kibana/pnpm-store ]]; then
    echo "Using ~/.kibana/pnpm-store as a starting point"
    mv ~/.kibana/pnpm-store ./.pnpm-store
  fi
  export npm_config_store_dir="$KIBANA_DIR/.pnpm-store"
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

# Restore the baked cypress binary to its default cache location so cypress's
# postinstall skips the download. HOME-local, so not gated on workspace disk type.
if [[ -d ~/.kibana/Cypress && ! -d ~/.cache/Cypress ]]; then
  echo "Using ~/.kibana/Cypress as the Cypress binary cache"
  mkdir -p ~/.cache
  mv ~/.kibana/Cypress ~/.cache/Cypress
fi

# TODO: revisit the double bootstrap per attempt after removing Bazel and changing package manager.
if ! (pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}" || pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
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
  echo 'Removing /opt/buildkite-agent/.cache/yarn' && rm -rf /opt/buildkite-agent/.cache/yarn
  echo 'Removing /opt/buildkite-agent/.yarn-local-mirror' && rm -rf /opt/buildkite-agent/.yarn-local-mirror
  echo 'Removing ./.yarn-local-mirror' && rm -rf ./.yarn-local-mirror
  echo "Available disk space after clearing yarn cache:"
  df -h . || echo "Failed to get disk space"
fi
