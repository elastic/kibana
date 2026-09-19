#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/disk_usage.sh

# Dual-cache agent images (elastic/ci-agent-images) bake one tree per package manager:
#   pnpm -> ~/.cache/kibana/pnpm/{.pnpm-store,node_modules}
# Detect the checkout's package manager so the same bootstrap (and VM image) works on
# main (pnpm) and legacy release branches (yarn).
CACHES_ROOT="${HOME}/.cache/kibana"
mkdir -p "${CACHES_ROOT}"

PNPM_IMAGE_CACHE="${CACHES_ROOT}/pnpm"

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
elif [[ "$(pwd)" == "/dev/shm"* ]]; then
  # pnpm store on tmpfs so the install doesn't fill the small root disk
  export npm_config_store_dir=/dev/shm/pnpm-store
  if [[ -f ~/.kibana/node_modules.tar.zst ]]; then
    echo "Extracting ~/.kibana/node_modules.tar.zst"
    tar -xf ~/.kibana/node_modules.tar.zst -I "zstd -T0" -C ./
  fi
fi

if ! (pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  echo "--- pnpm install and bootstrap, attempt 2"
  BOOTSTRAP_PARAMS+=(--force-install)
  pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"
fi

print_disk_usage "post-bootstrap"

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'pnpm kbn bootstrap'
fi
