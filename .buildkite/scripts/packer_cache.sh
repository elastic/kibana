#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/env.sh
source .buildkite/scripts/setup_node.sh

yarn install
