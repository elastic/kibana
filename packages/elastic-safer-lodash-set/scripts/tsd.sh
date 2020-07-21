#!/usr/bin/env bash

# Elasticsearch B.V licenses this file to you under the MIT License.
# See `packages/elastic-safer-lodash-set/LICENSE` for more information.

# tsd will get confused if it finds a tsconfig.json file in the project
# directory and start to scan the entirety of Kibana. We don't want that.
mv tsconfig.json tsconfig.tmp

clean_up () {
  exit_code=$?
  mv tsconfig.tmp tsconfig.json
  exit $exit_code
}
trap clean_up EXIT

./node_modules/.bin/tsd
