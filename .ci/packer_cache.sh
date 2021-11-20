#!/usr/bin/env bash

set -e

if [[ "$(which docker)" != "" && "$(command uname -m)" != "aarch64" ]]; then
  # cache image used by kibana-load-testing project
  docker pull "maven:3.6.3-openjdk-8-slim"
fi

./.ci/packer_cache_for_branch.sh main
./.ci/packer_cache_for_branch.sh 7.16
