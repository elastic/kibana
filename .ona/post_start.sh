#!/bin/bash

# Keep this synchronous post-start path minimal. Ona starts ES/Kibana services
# after this command exits, so non-essential setup belongs in automations.yaml.

# Ensure the volume mounts are owned by the vscode user so we can write to them.
sudo chown vscode:vscode "${KBN_DIR}/node_modules"
sudo chown vscode:vscode "${KBN_DIR}/.es"
sudo chown vscode:vscode "${KBN_DIR}/target"

export npm_config_cache="${KBN_DIR}/target/npm-cache"
mkdir -p "$npm_config_cache"

. "$NVM_DIR/nvm.sh"

# If the prebuild snapshot did not include linked workspaces, bootstrap here so
# cold starts do not depend on Ona task execution ordering.
if ! node -e "require.resolve('@kbn/setup-node-env')" 2>/dev/null; then
  # If FIPS mode is enabled, there can be issues installing some dependencies
  # due to invalid algorithms.
  NODE_OPTIONS='' yarn kbn bootstrap
fi

Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
