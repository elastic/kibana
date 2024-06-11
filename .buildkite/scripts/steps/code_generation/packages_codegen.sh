#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- OpenAPI Packages Code Generation

(cd packages/kbn-openapi-common && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true