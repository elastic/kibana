#!/usr/bin/env bash

set -e

TMP=.tmp-handlebars
HASH_FILE=packages/kbn-handlebars/src/spec/.upstream_git_hash

function cleanup {
  rm -fr $TMP
}

trap cleanup EXIT

rm -fr $TMP
mkdir $TMP

echo "Cloning handlebars repo..."
git clone -q --depth 1 https://github.com/handlebars-lang/handlebars.js.git -b 4.x $TMP

echo "Looking for updates..."
hash=$(git -C $TMP rev-parse HEAD)
expected_hash=$(cat $HASH_FILE)

if [ "$hash" = "$expected_hash" ]; then
  echo "You're all up to date :)"
else
  echo
  echo "New changes has been committed to the '4.x' branch in the upstream git repository"
  echo
  echo "To resolve this issue, do the following:"
  echo
  echo "  1. Investigate the commits in the '4.x' branch of the upstream git repository."
  echo "     If files inside the 'spec' folder has been updated, sync those updates with"
  echo "     our local versions of these files (located in"
  echo "     'packages/kbn-handlebars/src/spec')."
  echo
  echo "     https://github.com/handlebars-lang/handlebars.js/compare/$expected_hash...4.x"
  echo
  echo "  2. Execute the following script and commit the updated '$HASH_FILE'"
  echo "     file including any changes you made to our own spec files."
  echo
  echo "     ./packages/kbn-handlebars/scripts/update_upstream_git_hash.sh"
  echo
  exit 1
fi
