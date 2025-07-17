#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Test Projects
yarn kbn run test --exclude kibana --oss --skip-kibana-plugins --skip-missing
