#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Osquery OpenAPI Code Generation

(cd x-pack/platform/plugins/shared/osquery && pnpm openapi:generate)
check_for_changed_files "pnpm openapi:generate" true
