#!/bin/bash

# Determine the directory where bootstrap.sh resides
SCRIPT_DIR=$(dirname "$0")

# Source setup_shell.sh from the determined directory
source "${SCRIPT_DIR}/setup_shell.sh"

# Change ownership of the mounted .cache directory to vscode
sudo chown -R vscode:vscode /home/vscode/.cache ./node_modules ./bazel-*

# Disable FIPS to bootstrap due to some packages using non-compliant algorithms
NODE_OPTIONS= yarn kbn reset && NODE_OPTIONS= yarn kbn bootstrap
