#!/usr/bin/env bash

set -e

# cache image used by kibana-load-testing project
docker pull "maven:3.6.3-openjdk-8-slim"

./.ci/packer_cache_for_branch.sh master
./.ci/packer_cache_for_branch.sh 7.x
