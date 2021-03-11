#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/env.sh"

export JOB=kibana-default-ciGroup${CI_GROUP}

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$DEFAULT_BUILD_LOCATION" \
  --include-tag "ciGroup$CI_GROUP"
