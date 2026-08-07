#!/bin/bash

# Ensure the volume mounts are owned by the vscode user so we can write to it.
sudo chown vscode:vscode "${KBN_DIR}/node_modules"
sudo chown vscode:vscode "${KBN_DIR}/.es"
sudo chown vscode:vscode "${KBN_DIR}/target"


# Pre-seed Claude Code user settings to skip the first-run theme prompt.
mkdir -p "$HOME/.claude"
[ -f "$HOME/.claude/settings.json" ] || echo '{"theme":"auto"}' > "$HOME/.claude/settings.json"

# nvm isn't available in the postStartCommand shell, so source it explicitly.
. "$NVM_DIR/nvm.sh"

# Bootstrap dependencies, unless the caller already owns that step. In Ona the
# `install-deps` automation runs bootstrap (and the ES/Kibana services depend on
# it), so the wrapper sets SKIP_BOOTSTRAP=true to avoid a second concurrent
# `yarn kbn bootstrap` racing the task and corrupting node_modules.
if [ "${SKIP_BOOTSTRAP:-}" != "true" ]; then
  # If FIPS mode is enabled, there can be issues installing some dependencies due to invalid algorithms.
  # So override the NODE_OPTIONS environment variable to disable FIPS mode.
  NODE_OPTIONS='' yarn kbn bootstrap
fi

Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
