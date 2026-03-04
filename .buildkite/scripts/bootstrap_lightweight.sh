#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Lightweight bootstrap for functional test agents (Cypress, FTR, Scout).
#
# Full `yarn kbn bootstrap` takes ~5 minutes per agent because it regenerates
# package maps, tsconfig paths, builds webpack bundles, and validates deps.
# Functional test agents only need node_modules installed — the @kbn/* module
# resolution works via Yarn workspace symlinks, not the generated package map.
#
# This script:
#  1. Reuses the pre-baked node_modules/yarn-local-mirror/moon-cache from the
#     agent image (same cache seeding as bootstrap.sh)
#  2. Runs `yarn install --non-interactive` directly to get deps in place
#  3. Runs allowlisted install scripts (needed for native modules)
#
# Skips: discovery, package map regeneration, tsconfig path regeneration,
# tsconfig.base.json rebuild, webpack pre-builds, package.json sorting,
# dependency validation, and Playwright browser install.
#
# Estimated savings: ~2-3 minutes per agent vs full bootstrap.

echo "--- yarn install (lightweight bootstrap)"

if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ -d ~/.kibana/node_modules ]]; then
    echo "Using ~/.kibana/node_modules as a starting point"
    mv ~/.kibana/node_modules ./
  fi
  if [[ -d ~/.kibana/.yarn-local-mirror ]]; then
    echo "Using ~/.kibana/.yarn-local-mirror as a starting point"
    mv ~/.kibana/.yarn-local-mirror ./
  fi
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

if ! yarn install --non-interactive; then
  echo "--- yarn install failed, falling back to full bootstrap"
  yarn kbn bootstrap
fi

echo "--- Running install scripts"
node scripts/yarn_install_scripts.js run
