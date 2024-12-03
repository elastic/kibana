#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Prettier Configuration Topology
node scripts/prettier_topology_check
