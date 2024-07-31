#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

export FORCE_BOOTSTRAP_REMOTE_CACHE=true

yarn kbn bootstrap

for version in $(cat versions.json | jq -r '.versions[].version'); do
  node scripts/es snapshot --download-only --base-path "$ES_CACHE_DIR" --version "$version"
done

for version in $(cat versions.json | jq -r '.versions[].version'); do
  node x-pack/plugins/security_solution/scripts/endpoint/agent_downloader --version "$version"
done
