#!/bin/bash

yarn kbn bootstrap

# Setup user environment. If FIPS mode is enabled, this needs to run after bootstrap to patch node_modules.
SCRIPT_DIR=$(dirname "$0")
source "${SCRIPT_DIR}/env.sh"
