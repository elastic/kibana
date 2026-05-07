#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "${CI:-}" =~ ^(1|true)$ ]]; then
  export DISABLE_BOOTSTRAP_VALIDATION=false
  export KBN_BOOTSTRAP_NO_PREBUILT=true
  .buildkite/scripts/bootstrap.sh
fi

node scripts/quick_checks --file .buildkite/scripts/steps/checks/quick_checks.json
