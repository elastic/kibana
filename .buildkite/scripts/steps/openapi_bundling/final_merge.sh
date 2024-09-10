#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Merge Kibana OpenAPI specs

(cd oas_docs && make api-docs && make api-docs-lint)
