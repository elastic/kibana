#!/bin/bash

# Determine the directory where bootstrap.sh resides
SCRIPT_DIR=$(dirname "$0")

# Source setup_shell.sh from the determined directory
source "${SCRIPT_DIR}/setup_shell.sh"

# Change ownership of the mounted .cache directory to vscode
sudo chown -R vscode:vscode /home/vscode/.cache

NODE_OPTIONS= yarn kbn bootstrap
