#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Elastic Assistant OpenAPI Code Generation

(cd x-pack/plugins/elastic_assistant && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true
