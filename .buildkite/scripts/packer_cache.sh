#!/usr/bin/env bash

set -euo pipefail

# This will no longer be ran, we're warming up the cache thru @bake_pnpm_cache.sh

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

export FORCE_BOOTSTRAP_REMOTE_CACHE=true

pnpm kbn bootstrap

tar -cf - node_modules | zstd -T0 -o node_modules.tar.zst

if [[ ! -f "$ES_CACHE_DIR/.done" ]]; then
  cd .buildkite && npm ci && cd ..

  for version in $(cat versions.json | jq -r '.versions[].version'); do
    node scripts/es snapshot --download-only --base-path "$ES_CACHE_DIR" --version "$version"
  done

  for version in $(cat versions.json | jq -r '.versions[].version'); do
    node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/agent_downloader --version "$version"
  done

  touch "$ES_CACHE_DIR/.done"
fi
