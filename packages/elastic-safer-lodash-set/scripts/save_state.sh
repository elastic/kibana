#!/usr/bin/env bash

# Elasticsearch B.V licenses this file to you under the MIT License.
# See `packages/elastic-safer-lodash-set/LICENSE` for more information.

set -e

source ./scripts/_get_lodash.sh

modified_lodash_files=(_baseSet.js)

# Create fresh patch files for each of the modified files
for file in "${modified_lodash_files[@]}"
do
  diff ".tmp/node_modules/lodash/$file" "lodash/$file" > "scripts/patches/$file.patch" || true
done

echo "State updated!"
