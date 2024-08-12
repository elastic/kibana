#!/bin/bash

# The node_modules are mounted from the host machine which can be a different platform,
# so we re-install the dependencies to ensure they are compatible.
#
# yarn kbn reset && yarn kbn bootstrap
