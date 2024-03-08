#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/job_env_setup.sh
source .buildkite/scripts/common/setup_node.sh

echo '--- Install/build buildkite dependencies'

# `rm -rf <ts-node node_modules dir>; npm install -g ts-node` will cause ts-node bin files to be messed up
# but literally just calling `npm install -g ts-node` a second time fixes it
# this is only on newer versions of npm
npm_install_global ts-node
if ! ts-node --version; then
  npm_install_global ts-node
  ts-node --version;
fi

cd '.buildkite'
retry 5 15 npm ci
cd ..

echo '--- Agent Debug/SSH Info'
ts-node .buildkite/scripts/lifecycle/print_agent_links.ts || true

if [[ "$(curl -is metadata.google.internal || true)" ]]; then
  echo ""
  echo "To SSH into this agent, run:"
  echo "gcloud compute ssh --tunnel-through-iap --project elastic-kibana-ci --zone \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/zone)\" \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/name)\""
  echo ""
fi
