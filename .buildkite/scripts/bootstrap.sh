#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Dual-cache agent images (elastic/ci-agent-images) bake one tree per package manager:
#   pnpm -> ~/.cache/kibana/pnpm/{.pnpm-store,node_modules}
#   yarn -> ~/.kibana/{node_modules,.yarn-local-mirror}   (legacy layout, unchanged)
# Detect the checkout's package manager so the same bootstrap (and VM image) works on
# main (pnpm) and legacy release branches (yarn).
CACHES_ROOT="${HOME}/.cache/kibana"
mkdir -p "${CACHES_ROOT}"

PNPM_IMAGE_CACHE="${CACHES_ROOT}/pnpm"
YARN_IMAGE_CACHE="${HOME}/.kibana"

USE_PNPM=false
if [[ -f pnpm-lock.yaml ]]; then
  USE_PNPM=true
fi

# Let's remove the irrelevant cache for the variant:
if [[ "$USE_PNPM" == true ]]; then
  echo "--- Removing irrelevant yarn cache"
  rm -rf "${HOME}/.cache/yarn"
else
  echo "--- Removing irrelevant pnpm cache"
  rm -rf "${PNPM_IMAGE_CACHE}"
fi

if [[ "$USE_PNPM" == true ]]; then
  echo "--- pnpm install and bootstrap"
  BOOTSTRAP_CMD=(pnpm kbn bootstrap)
  BOOTSTRAP_LABEL='pnpm kbn bootstrap'
else
  echo "--- yarn install and bootstrap"
  BOOTSTRAP_CMD=(yarn kbn bootstrap)
  BOOTSTRAP_LABEL='yarn kbn bootstrap'
fi

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi

# Use packages baked into the agent image as a cache, but only when the workspace
# is not on local ssd or in memory — moving many small files between disks is
# slower than extracting/linking from the package manager cache.
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ "$USE_PNPM" == true ]]; then
    copy_first_available ./node_modules "${PNPM_IMAGE_CACHE}/node_modules"
    copy_first_available ./.pnpm-store "${PNPM_IMAGE_CACHE}/.pnpm-store"
    export npm_config_store_dir="${KIBANA_DIR:-$(pwd)}/.pnpm-store"
  else
    copy_first_available ./node_modules "${YARN_IMAGE_CACHE}/node_modules"
    copy_first_available ./.yarn-local-mirror "${YARN_IMAGE_CACHE}/.yarn-local-mirror"
  fi

  # Check if there's a cache artifact uploaded from a previous step
  if (buildkite-agent artifact download --step "store_cache" "moon-cache.tar.gz" ~/); then
    echo "Found moon-cache.tar.gz artifact, extracting to ./.moon/cache"
    mkdir -p ./.moon/cache
    echo "Extracting moon-cache.tar.gz to ./.moon/cache"
    tar -xzf ~/moon-cache.tar.gz -C ./
  fi
fi

if ! ("${BOOTSTRAP_CMD[@]}" "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- ${BOOTSTRAP_LABEL}, attempt 2"
  "${BOOTSTRAP_CMD[@]}" "${BOOTSTRAP_PARAMS[@]}" --force-install
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files "$BOOTSTRAP_LABEL"
fi

# Yarn cache is only needed during install. Drop it afterwards to reclaim disk.
# Build steps that still run package installs afterwards can opt out with KEEP_INSTALL_CACHE=1.
if [[ -z "${KEEP_INSTALL_CACHE:-}" ]]; then
  if [[ "$USE_PNPM" != true ]]; then
    echo "--- Removing yarn cache"
    rm -rf "${HOME}/.cache/yarn"
  fi
  df -h . || echo "Failed to get disk space"
fi
