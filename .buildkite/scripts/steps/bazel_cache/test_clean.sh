#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

rm -rf ~/.bazel-cache

.buildkite/scripts/bootstrap.sh

