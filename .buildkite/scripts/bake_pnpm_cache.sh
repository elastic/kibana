#!/usr/bin/env bash

set -euo pipefail

# Pre-populates the pnpm cache that the CI agent image bakes into ~/.kibana, so a
# fresh checkout on an agent bootstraps from a warm store instead of the network.
# .buildkite/scripts/bootstrap.sh consumes them, by moving them to $KIBANA_DIR

KIBANA_DIR="${KIBANA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PNPM_CACHE_DIR="${KBN_PNPM_CACHE_DIR:-${CACHE_DIR:-$HOME/.cache/kibana/pnpm}}"
STORE_DIR="$PNPM_CACHE_DIR/.pnpm-store"

cd "$KIBANA_DIR"

# Setup node and env similar to the CI bootstrap.
source "$KIBANA_DIR/.buildkite/scripts/common/util.sh"
source "$KIBANA_DIR/.buildkite/scripts/common/env.sh"
source "$KIBANA_DIR/.buildkite/scripts/common/setup_node.sh"

echo "--- baking pnpm cache into $PNPM_CACHE_DIR (pnpm $(pnpm --version))"

# Install the dependencies and skip the webpack bundles.
CI=true pnpm kbn bootstrap --no-prebuilt

tar -cf - node_modules | zstd -T0 -o node_modules.tar.zst

echo "--- ES snapshots and endpoint agents"

# Download ES snapshots, but consider the main branch as the reference branch 
#  (older branches versions.json don't have all versions)
if [[ ! -f "$ES_CACHE_DIR/.done" || $(jq -r '.branch' package.json) == "main" ]]; then
  cd .buildkite && npm ci && cd "$KIBANA_DIR"

  for version in $(jq -r '.versions[].version' versions.json); do
    node scripts/es snapshot --download-only --base-path "$ES_CACHE_DIR" --version "$version"
  done
  for version in $(jq -r '.versions[].version' versions.json); do
    node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/agent_downloader --version "$version"
  done

  touch "$ES_CACHE_DIR/.done"
fi

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
du -sh "$PNPM_CACHE_DIR/.pnpm-store" "$PNPM_CACHE_DIR/node_modules" "$ES_CACHE_DIR" 2>/dev/null || true
echo "Bake these into the agent image so they land at:"
echo "  $PNPM_CACHE_DIR/.pnpm-store"
echo "  $PNPM_CACHE_DIR/node_modules"
echo "  $ES_CACHE_DIR"