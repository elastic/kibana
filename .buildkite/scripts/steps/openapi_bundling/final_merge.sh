#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

cur_dir=$(pwd)
cd oas_docs

echo --- Installing NPM modules
npm install

echo --- Merge Kibana OpenAPI specs
make api-docs
# make api-docs-lint <-- This relies on spectral which has 50 critical vulnerabilities based on `npm audit`

cd "$cur_dir"

check_for_changed_files "make api-docs" true
