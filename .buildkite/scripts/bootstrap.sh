#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Dual-cache agent images bake package managers under:
#   ~/.kibana/caches/yarn/{.yarn-local-mirror,node_modules}
#   ~/.kibana/caches/pnpm/{pnpm-store,node_modules,Cypress}
# Older images still use the flat ~/.kibana/{.yarn-local-mirror,node_modules[,pnpm-store,Cypress]} layout.
# Detect the checkout's package manager so the same bootstrap (and VM image) works on
# main (pnpm) and legacy release branches (yarn).
CACHES_ROOT="${HOME}/.kibana/caches"
YARN_IMAGE_CACHE="${CACHES_ROOT}/yarn"
PNPM_IMAGE_CACHE="${CACHES_ROOT}/pnpm"
LEGACY_IMAGE_CACHE="${HOME}/.kibana"

USE_PNPM=false
if [[ -f pnpm-lock.yaml ]]; then
  USE_PNPM=true
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

# Move the first existing source dir onto dest (no-op if none exist).
seed_from_image_cache() {
  local dest="$1"
  shift
  local src
  for src in "$@"; do
    if [[ -d "$src" ]]; then
      echo "Using $src as a starting point"
      mkdir -p "$(dirname "$dest")"
      mv "$src" "$dest"
      return 0
    fi
  done
}

# Use packages baked into the agent image as a cache, but only when the workspace
# is not on local ssd or in memory — moving many small files between disks is
# slower than extracting/linking from the package manager cache.
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ "$USE_PNPM" == true ]]; then
    seed_from_image_cache ./node_modules \
      "${PNPM_IMAGE_CACHE}/node_modules" \
      "${LEGACY_IMAGE_CACHE}/node_modules"
    seed_from_image_cache ./.pnpm-store \
      "${PNPM_IMAGE_CACHE}/pnpm-store" \
      "${LEGACY_IMAGE_CACHE}/pnpm-store"
    export npm_config_store_dir="${KIBANA_DIR:-$(pwd)}/.pnpm-store"
  else
    seed_from_image_cache ./node_modules \
      "${YARN_IMAGE_CACHE}/node_modules" \
      "${LEGACY_IMAGE_CACHE}/node_modules"
    seed_from_image_cache ./.yarn-local-mirror \
      "${YARN_IMAGE_CACHE}/.yarn-local-mirror" \
      "${LEGACY_IMAGE_CACHE}/.yarn-local-mirror"
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

# Restore the baked cypress binary (pnpm image cache) so postinstall skips download.
if [[ "$USE_PNPM" == true && ! -d "${HOME}/.cache/Cypress" ]]; then
  seed_from_image_cache "${HOME}/.cache/Cypress" \
    "${PNPM_IMAGE_CACHE}/Cypress" \
    "${LEGACY_IMAGE_CACHE}/Cypress"
fi

if ! ("${BOOTSTRAP_CMD[@]}" "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- ${BOOTSTRAP_LABEL}, attempt 2"
  if [[ "$USE_PNPM" == true ]]; then
    pnpm kbn bootstrap --force-install || pnpm kbn bootstrap
  else
    yarn kbn bootstrap --force-install || yarn kbn bootstrap
  fi
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files "$BOOTSTRAP_LABEL"
fi

# Opt-in per job to free disk on constrained agents.
# CLEAR_INSTALL_CACHE is the pnpm-era name; CLEAR_YARN_CACHE remains for older pipelines.
if [[ "${CLEAR_INSTALL_CACHE:-${CLEAR_YARN_CACHE:-}}" ]]; then
  if [[ "$USE_PNPM" == true ]]; then
    echo "Clearing pnpm store at $(pnpm store path)"
    rm -rf "$(pnpm store path)"
  else
    echo "Clearing yarn cache at /opt/buildkite-agent/.cache/yarn"
    rm -rf /opt/buildkite-agent/.cache/yarn
  fi
  echo "Available disk space after clearing install cache:"
  df -h . || echo "Failed to get disk space"
fi
