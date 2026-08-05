#!/usr/bin/env bash

set -euo pipefail

set -x

# Pre-populates the pnpm cache that the CI agent image bakes into ~/.kibana, so a
# fresh checkout on an agent bootstraps from a warm store instead of the network.
#
# It produces two directories under $KBN_PNPM_CACHE_DIR (default ~/.kibana):
#   pnpm-store/    the content-addressable pnpm store
#   node_modules/  a fully installed, hoisted node_modules linked to that store
#
# .buildkite/scripts/bootstrap.sh consumes them by moving both into the workspace
# (see the "Using ~/.kibana/... as a starting point" block). Both are moved as a
# pair so the hardlinks between node_modules and the store survive intact — build
# them together here and bake them together on the image.
#
# Run this in the image build (other repo) from a clean Kibana checkout at the ref
# you are baking:  .buildkite/scripts/bake_pnpm_cache.sh

KIBANA_DIR="${KIBANA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CACHE_DIR="${KBN_PNPM_CACHE_DIR:-$HOME/.kibana}"
STORE_DIR="$CACHE_DIR/pnpm-store"

cd "$KIBANA_DIR"

# Make the pinned pnpm (package.json "packageManager") available if it isn't yet.
# On the VM image build `corepack enable pnpm` fails: it symlinks into /usr/bin,
# which is root-owned (EACCES). Try several non-sudo routes in order of
# preference and log which one wins, so we can trim the losers once we know what
# the image supports. Keep them all until the build tells us.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Pinned pnpm version from package.json "packageManager": "pnpm@X.Y.Z".
PNPM_VERSION="$(node -p "(require('$KIBANA_DIR/package.json').packageManager || '').split('@').pop() || ''" 2>/dev/null || echo '')"
PNPM_SPEC="pnpm@${PNPM_VERSION:-latest}"

bake_log() { echo "--- [bake] $*"; }
pnpm_won() { echo "=== [bake] pnpm provisioning SUCCEEDED via: $1 (pnpm $(pnpm --version) at $(command -v pnpm)) ==="; }
have_pnpm() { command -v pnpm >/dev/null 2>&1; }

# Tries each route top-to-bottom, stopping at the first that yields a usable
# pnpm. Called inside an `if`, so `set -e` is suspended here and a failing route
# just falls through to the next.
ensure_pnpm() {
  if have_pnpm; then
    pnpm_won "method 0: already on PATH"
    return 0
  fi

  bake_log "method 1: corepack enable into a writable dir on PATH (no sudo, preferred)"
  local bindir="${COREPACK_INSTALL_DIR:-$HOME/.local/bin}"
  mkdir -p "$bindir"
  export PATH="$bindir:$PATH"
  if command -v corepack >/dev/null 2>&1 &&
    corepack enable --install-directory "$bindir" pnpm && have_pnpm; then
    pnpm_won "method 1: corepack --install-directory $bindir"
    return 0
  fi
  bake_log "method 1 failed"

  bake_log "method 2: sudo corepack enable pnpm (privileged symlink into /usr/bin)"
  if command -v sudo >/dev/null 2>&1 && command -v corepack >/dev/null 2>&1 &&
    sudo corepack enable pnpm && have_pnpm; then
    pnpm_won "method 2: sudo corepack enable"
    return 0
  fi
  bake_log "method 2 failed"

  bake_log "method 3: npm install -g $PNPM_SPEC into a writable prefix (no sudo, no corepack)"
  local npmprefix="${NPM_LOCAL_PREFIX:-$HOME/.local}"
  mkdir -p "$npmprefix/bin"
  export PATH="$npmprefix/bin:$PATH"
  if command -v npm >/dev/null 2>&1 &&
    npm install -g --prefix "$npmprefix" "$PNPM_SPEC" && have_pnpm; then
    pnpm_won "method 3: npm -g --prefix $npmprefix"
    return 0
  fi
  bake_log "method 3 failed"

  bake_log "method 4: pnpm standalone install script from get.pnpm.io (no sudo, needs network)"
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  export PATH="$PNPM_HOME:$PATH"
  if command -v curl >/dev/null 2>&1 &&
    curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="${PNPM_VERSION:-}" SHELL="${SHELL:-/bin/bash}" sh - &&
    have_pnpm; then
    pnpm_won "method 4: get.pnpm.io standalone"
    return 0
  fi
  bake_log "method 4 failed"

  return 1
}

if ! ensure_pnpm; then
  echo "!!! [bake] could not provision pnpm by any method — see the per-method logs above" >&2
  exit 1
fi

echo "--- baking pnpm cache into $CACHE_DIR (pnpm $(pnpm --version))"

mkdir -p "$STORE_DIR"
export npm_config_store_dir="$STORE_DIR"

# CI=true gives us the same install as an agent: frozen lockfile, no vscode config.
# --no-prebuilt skips the webpack bundles; they are ref-specific and rebuilt per
# distribution build, so baking them would only add stale weight to the image.
CI=true pnpm kbn bootstrap --no-prebuilt

# Stage node_modules next to the store so the image bakes the matching pair.
rm -rf "$CACHE_DIR/node_modules"
mv "$KIBANA_DIR/node_modules" "$CACHE_DIR/node_modules"

echo "--- pnpm cache ready"
du -sh "$CACHE_DIR/pnpm-store" "$CACHE_DIR/node_modules" 2>/dev/null || true
echo "Bake these into the agent image so they land at:"
echo "  $CACHE_DIR/pnpm-store"
echo "  $CACHE_DIR/node_modules"

set +x