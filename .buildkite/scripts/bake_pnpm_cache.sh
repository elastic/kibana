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
CACHE_DIR="${KBN_PNPM_CACHE_DIR:-${CACHE_DIR:-$HOME/.kibana}}"
STORE_DIR="$CACHE_DIR/pnpm-store"

cd "$KIBANA_DIR"

# Provision Node + pnpm exactly like every Kibana CI bootstrap. This downloads
# the pinned Node (.node-version) into $CACHE_DIR/node and enables the corepack
# pnpm in that writable node bin dir. Rolling our own here failed two ways:
# `corepack enable` can't symlink into root-owned /usr/bin, and the image's
# system Node is too old, so `kbn bootstrap` rejects it (engine check wants the
# pinned v24). Sourcing this gets Node and pnpm right in one step.
source "$KIBANA_DIR/.buildkite/scripts/common/setup_node.sh"

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