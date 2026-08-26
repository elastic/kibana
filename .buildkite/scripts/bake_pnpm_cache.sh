#!/usr/bin/env bash

set -euo pipefail

# Pre-populates the pnpm cache that the CI agent image bakes into ~/.kibana, so a
# fresh checkout on an agent bootstraps from a warm store instead of the network.
#
# It produces three directories under $KBN_PNPM_CACHE_DIR (default ~/.kibana):
#   pnpm-store/    the content-addressable pnpm store
#   node_modules/  a fully installed, hoisted node_modules linked to that store
#
# .buildkite/scripts/bootstrap.sh consumes them (see the "Using ~/.kibana/... as a
# starting point" block). node_modules and the store are moved as a pair so the
# hardlinks between them survive intact — build them together here and bake them
# together on the image.
#
# Run this in the image build (other repo) from a clean Kibana checkout at the ref
# you are baking:  .buildkite/scripts/bake_pnpm_cache.sh

KIBANA_DIR="${KIBANA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PNPM_CACHE_DIR="${KBN_PNPM_CACHE_DIR:-${CACHE_DIR:-$HOME/cache/kibana}}"
STORE_DIR="$PNPM_CACHE_DIR/.pnpm-store"

cd "$KIBANA_DIR"

# Provision Node + pnpm exactly like every Kibana CI bootstrap. This downloads
# the pinned Node (.node-version) into $PNPM_CACHE_DIR/node and enables the corepack
# pnpm in that writable node bin dir. Rolling our own here failed two ways:
# `corepack enable` can't symlink into root-owned /usr/bin, and the image's
# system Node is too old, so `kbn bootstrap` rejects it (engine check wants the
# pinned v24). Sourcing this gets Node and pnpm right in one step.
source "$KIBANA_DIR/.buildkite/scripts/common/util.sh"
source "$KIBANA_DIR/.buildkite/scripts/common/env.sh"
source "$KIBANA_DIR/.buildkite/scripts/common/setup_node.sh"

echo "--- baking pnpm cache into $PNPM_CACHE_DIR (pnpm $(pnpm --version))"

# CI=true gives us the same install as an agent: frozen lockfile, no vscode config.
# --no-prebuilt skips the webpack bundles; they are ref-specific and rebuilt per
# distribution build, so baking them would only add stale weight to the image.
CI=true pnpm kbn bootstrap --no-prebuilt

echo "--- ES snapshots and endpoint agents"

if [[ ! -f "$ES_CACHE_DIR/.done" ]]; then
  cd .buildkite && npm ci && cd "$KIBANA_DIR"

  for version in $(jq -r '.versions[].version' versions.json); do
    node scripts/es snapshot --download-only --base-path "$ES_CACHE_DIR" --version "$version"
  done
  for version in $(jq -r '.versions[].version' versions.json); do
    node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/agent_downloader --version "$version"
  done

  touch "$ES_CACHE_DIR/.done"
fi

# Stage node_modules next to the store so the image bakes the matching pair.
# When the checkout already IS the cache dir (the image build checks Kibana out
# into ~/.kibana), bootstrap installed it there already — nothing to move.
if [[ "$KIBANA_DIR" != "$PNPM_CACHE_DIR" ]]; then
  rm -rf "$PNPM_CACHE_DIR/node_modules"
  mv "$KIBANA_DIR/node_modules" "$PNPM_CACHE_DIR/node_modules"
else
  echo "node_modules not found @ $KIBANA_DIR/node_modules"
fi

if [[ -d "$KIBANA_DIR/.pnpm-store" ]]; then
  rm -rf "$PNPM_CACHE_DIR/.pnpm-store"
  mv "$KIBANA_DIR/.pnpm-store" "$PNPM_CACHE_DIR/.pnpm-store"
else
  echo "pnpm store not found @ $KIBANA_DIR/.pnpm-store"
fi

echo "--- pnpm cache ready"
du -sh "$PNPM_CACHE_DIR/pnpm-store" "$PNPM_CACHE_DIR/node_modules" "$ES_CACHE_DIR" 2>/dev/null || true
echo "Bake these into the agent image so they land at:"
echo "  $PNPM_CACHE_DIR/.pnpm-store"
echo "  $PNPM_CACHE_DIR/node_modules"
echo "  $ES_CACHE_DIR"