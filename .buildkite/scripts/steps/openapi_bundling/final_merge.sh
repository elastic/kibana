#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Merge Kibana OpenAPI specs

(cd oas_docs && make api-docs && make api-docs-lint)
(cd oas_docs && make api-docs-staging && make api-docs-lint)

check_for_changed_files "make api-docs && make api-docs-staging" true
