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

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'yarn kbn bootstrap'
fi
