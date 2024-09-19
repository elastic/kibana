#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Merge Kibana Staging OpenAPI specs

(cd oas_docs && make api-docs-staging && make api-docs-lint)
