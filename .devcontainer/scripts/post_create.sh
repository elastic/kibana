#!/bin/bash

# Determine the directory where bootstrap.sh resides
SCRIPT_DIR=$(dirname "$0")

# Source setup_shell.sh from the determined directory
source "${SCRIPT_DIR}/setup_shell.sh"

grep -qxF "xpack.security.experimental.fipsMode.enabled: true" config/kibana.dev.yml || echo "xpack.security.experimental.fipsMode.enabled: true" >>config/kibana.dev.yml

# The node_modules are mounted from the host machine which can be a different platform,
# so we re-install the dependencies to ensure they are compatible.
#
# Disable FIPS to bootstrap due to some packages using non-compliant algorithms
NODE_OPTIONS= yarn kbn reset && NODE_OPTIONS= yarn kbn bootstrap
