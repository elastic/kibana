#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Cases OpenAPI Code Generation

echo -e "\n[Cases OpenAPI Code Generation] Cases Plugin\n"
(cd x-pack/platform/plugins/shared/cases && yarn openapi)

check_for_changed_files "yarn openapi" true
