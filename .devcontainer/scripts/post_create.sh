#!/bin/bash

# The node_modules are mounted from the host machine which can be a different platform,
# so we re-install the dependencies to ensure they are compatible.
#
# Disable FIPS to bootstrap due to some packages using non-compliant algorithms
# yarn kbn reset && yarn kbn bootstrap
