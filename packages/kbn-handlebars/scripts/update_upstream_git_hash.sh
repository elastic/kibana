#!/usr/bin/env bash

set -e

TMP=.tmp-handlebars
HASH_FILE=packages/kbn-handlebars/src/spec/.upstream_git_hash

# Try to detect Windows environment (I've not tested this!)
if [[ "$OSTYPE" == "msys" ]]; then
  # Windows environment
  DEVNULL=NUL
else
  # Everything else (including Cygwin on Windows)
  DEVNULL=/dev/null
fi

function cleanup {
  rm -fr $TMP
}

trap cleanup EXIT

rm -fr $TMP
mkdir $TMP

echo "Cloning handlebars repo..."
git clone -q --depth 1 https://github.com/handlebars-lang/handlebars.js.git -b 4.x $TMP

echo "Updating hash file..."
git -C $TMP rev-parse HEAD | tr -d '\n' > $HASH_FILE
git add $HASH_FILE

echo "Done! - Don't forget to commit any changes to $HASH_FILE"
