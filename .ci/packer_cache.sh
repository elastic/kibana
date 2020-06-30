#!/usr/bin/env bash

set -e

./.ci/packer_cache_for_branch.sh master
./.ci/packer_cache_for_branch.sh 7.x
