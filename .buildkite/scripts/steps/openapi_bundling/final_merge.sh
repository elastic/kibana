#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

cur_dir=$(pwd)
cd oas_docs

echo --- Installing NPM modules
npm install

echo --- Merge Kibana OpenAPI specs
make api-docs
# make api-docs-lint <-- Relies on JSONPath version with RCE vulnerabilities based on `npm audit`, https://github.com/advisories/GHSA-pppg-cpfq-h7wr

cd "$cur_dir"

check_for_changed_files "make api-docs" true
