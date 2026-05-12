#!/bin/bash

# Ensure the volume mounts are owned by the vscode user so we can write to it.
sudo chown vscode:vscode "${KBN_DIR}/node_modules"
sudo chown vscode:vscode "${KBN_DIR}/.es"
sudo chown vscode:vscode "${KBN_DIR}/target"

# nvm isn't available in the postStartCommand shell, so source it explicitly.
. "$NVM_DIR/nvm.sh"

# If FIPS mode is enabled, there can be issues installing some dependencies due to invalid algorithms.
# So override the NODE_OPTIONS environment variable to disable FIPS mode.
NODE_OPTIONS='' yarn kbn bootstrap

Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
