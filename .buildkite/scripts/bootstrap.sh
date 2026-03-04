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
  # Check if there's a cache artifact uploaded from a previous step
  if (buildkite-agent artifact download --step "store_cache" "moon-cache.tar.gz" ~/); then
    echo "Found moon-cache.tar.gz artifact, extracting to ./.moon/cache"
    mkdir -p ./.moon/cache
    echo "Extracting moon-cache.tar.gz to ./.moon/cache"
    tar -xzf ~/moon-cache.tar.gz -C ./
  elif [[ -d ~/.kibana-moon-cache ]]; then
    echo "Using ~/.moon/cache as a starting point"
    mkdir -p ./.moon/cache
    mv ~/.kibana-moon-cache/* ./.moon/cache
  fi
fi

# Try to restore bootstrap-generated files from the build step.
# If successful, skip the expensive kbn bootstrap (regeneration, webpack
# pre-builds) and only run yarn install + install scripts.
BOOTSTRAP_CACHE_RESTORED=false
if [[ "${SKIP_BOOTSTRAP_CACHE:-}" != "true" ]]; then
  BOOTSTRAP_CACHE="/tmp/bootstrap-cache.tar.gz"
  if (buildkite-agent artifact download --step "build" "bootstrap-cache.tar.gz" /tmp/ 2>/dev/null); then
    echo "--- Restoring bootstrap cache from build step"
    if tar -xzf "$BOOTSTRAP_CACHE" 2>/dev/null; then
      FILE_COUNT=$(tar -tzf "$BOOTSTRAP_CACHE" 2>/dev/null | wc -l | tr -d ' ')
      echo "Restored $FILE_COUNT files from bootstrap cache"
      BOOTSTRAP_CACHE_RESTORED=true
    else
      echo "Failed to extract bootstrap cache, falling back to full bootstrap"
    fi
    rm -f "$BOOTSTRAP_CACHE"
  fi
fi

if [[ "$BOOTSTRAP_CACHE_RESTORED" == "true" ]]; then
  echo "--- yarn install (bootstrap cache restored)"
  if ! yarn install --non-interactive; then
    echo "yarn install failed, falling back to full bootstrap"
    BOOTSTRAP_CACHE_RESTORED=false
  else
    echo "--- Running install scripts"
    node scripts/yarn_install_scripts.js run
  fi
fi

if [[ "$BOOTSTRAP_CACHE_RESTORED" != "true" ]]; then
  # TODO: revisit the double bootstrap per attempt after removing Bazel and changing package manager.
  if ! (yarn kbn bootstrap "${BOOTSTRAP_PARAMS[@]}" || yarn kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
    echo "bootstrap failed, trying again in 15 seconds"
    sleep 15

    # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
    # So, we should just delete node_modules in between attempts
    rm -rf node_modules

    echo "--- yarn install and bootstrap, attempt 2"
    yarn kbn bootstrap --force-install || yarn kbn bootstrap
  fi
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" && "$BOOTSTRAP_CACHE_RESTORED" != "true" ]]; then
  check_for_changed_files 'yarn kbn bootstrap'
fi
