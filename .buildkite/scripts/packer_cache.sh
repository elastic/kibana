#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

yarn kbn bootstrap
