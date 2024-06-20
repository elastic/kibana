#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

(cd x-pack/plugins/security_solution && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true
