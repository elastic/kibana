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
echo "--- Removing irrelevant yarn cache"
rm -rf "${HOME}/.cache/yarn"

echo "--- pnpm install and bootstrap"
BOOTSTRAP_CMD=(pnpm kbn bootstrap)
BOOTSTRAP_LABEL='pnpm kbn bootstrap'

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi
if [[ "${BOOTSTRAP_NO_FROZEN_LOCKFILE:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--no-frozen-lockfile)
fi

if [[ "${DISABLE_ALL_BOOTSTRAP_CACHE:-}" ]]; then
  echo "DISABLE_ALL_BOOTSTRAP_CACHE is set, skipping all pre-baked caches and using a fresh package manager cache"
  export npm_config_store_dir
  npm_config_store_dir="$(mktemp -d)"
else
  # Use the packages that are baked into the agent image, if they exist, as a cache
  # But only for agents not mounting the workspace on a local ssd or in memory
  # It actually ends up being slower to move all of the tiny files between the disks vs extracting archives from the yarn cache
  if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
    if [[ -d ~/.cache/kibana/pnpm/node_modules ]] && [[ ! -d ./node_modules ]]; then
      echo "Using ~/.cache/kibana/pnpm/node_modules as a starting point"
      mv ~/.cache/kibana/pnpm/node_modules ./
    fi
    if [[ -d ~/.cache/kibana/pnpm/.pnpm-store ]]; then
      echo "Using ~/.cache/kibana/pnpm/.pnpm-store as a starting point"
      mv ~/.cache/kibana/pnpm/.pnpm-store ./.pnpm-store
    fi
    # Check whether a cache artifact was uploaded by a previous step
    if [[ -z "${KBN_BOOTSTRAP_NO_PREBUILT:-}" ]]; then
      if download_tmp_artifact moon-cache.tar.zst "$HOME" "$BUILDKITE_BUILD_ID" false; then
        echo "Found moon-cache.tar.zst artifact, extracting to ./.moon/cache"
        mkdir -p ./.moon/cache
        echo "Extracting moon-cache.tar.zst to ./.moon/cache"
        tar -xf ~/moon-cache.tar.zst -I zstd -C ./
      fi
      .buildkite/scripts/common/activate_service_account.sh --unset-impersonation
    fi
  elif [[ "$(pwd)" == "/dev/shm"* ]]; then
    # pnpm store on tmpfs so the install doesn't fill the small root disk
    export npm_config_store_dir=/dev/shm/pnpm-store
    if [[ -f ~/.kibana/node_modules.tar.zst ]]; then
      echo "Extracting ~/.kibana/node_modules.tar.zst"
      tar -xf ~/.kibana/node_modules.tar.zst -I "zstd -T0" -C ./
    fi
    if [[ -d ~/.kibana/.yarn-local-mirror ]]; then
      ln -s ~/.kibana/.yarn-local-mirror ./.yarn-local-mirror
    fi
  fi
fi

if ! (pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Delete node_modules in between attempts to prompt a clean install
  rm -rf node_modules

  echo "--- pnpm install and bootstrap, attempt 2"
  BOOTSTRAP_PARAMS+=(--force-install)
  pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'pnpm kbn bootstrap'
fi

# Drop caches after install to reclaim disk.
if [[ -z "${KEEP_INSTALL_CACHE:-}" ]]; then
  echo "--- Clearing cache leftovers"
  # We no longer use this cache
  (echo 'Removing ~/.kibana and ./.yarn-local-mirror' "${HOME}/.cache/yarn" && \
    rm -rf ~/.kibana ./.yarn-local-mirror "${HOME}/.cache/yarn" && \
    df -h .) &
fi
