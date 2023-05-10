#!/usr/bin/env bash

set -euo pipefail

pushd packages/kbn-test/new_test_runner

#node --test-reporter=./lifecycle_stream.mjs --test ./

#echo ""
#echo "### NEXT ###"
#echo ""
#node --test-reporter=./lifecycle_gen.mjs --test ./

#echo ""
#echo "### NEXT ###"
#echo ""
#node --test-reporter spec --test ./

#echo ""
#echo "### NEXT ###"
#echo ""
#node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output ../../../target/junit

echo ""
echo "### NEXT ###"
echo ""
node --test-reporter=./lifecycle_gen.mjs --test ./
node --test-reporter=./lifecycle_gen.mjs --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output ../../../target/junit

popd

npx junit2json target/junit/tap.xml | jq
