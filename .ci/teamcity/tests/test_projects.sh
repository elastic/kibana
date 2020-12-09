#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

checks-reporter-with-killswitch "Test Projects" \
  yarn kbn run test --exclude kibana --oss --skip-kibana-plugins
