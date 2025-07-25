#!/usr/bin/env bash

# 1️⃣ Load nvm (works in non-interactive shells)
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"

# 2️⃣ Pick the version from .nvmrc (installs it if missing)
nvm use --silent

# 3️⃣ Start the server from the workspace root
node ./scripts/mcp_dev.js