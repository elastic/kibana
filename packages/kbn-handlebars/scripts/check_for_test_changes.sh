#!/usr/bin/env bash

set -e

TMP=.tmp-handlebars

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
git clone -q --depth 1 https://github.com/handlebars-lang/handlebars.js.git -b 4.x $TMP/handlebars

files=(packages/kbn-handlebars/src/upstream/index.*.test.ts)

for file in "${files[@]}"
do
  tmp=${file#*.} # remove anything before first period
  file=${tmp%.test.ts} # remove trailing .test.ts

  echo "Checking for changes to spec/$file.js..."

  set +e
  diff -d --strip-trailing-cr $TMP/handlebars/spec/$file.js packages/kbn-handlebars/src/upstream/index.$file.test.ts > $TMP/$file.patch
  error=$?
  set -e
  if [ $error -gt 1 ]
  then
    echo "The diff command encountered an unexpected error!"
    exit $error
  fi

  set +e
  diff -d --strip-trailing-cr $TMP/$file.patch packages/kbn-handlebars/.patches/$file.patch > $DEVNULL
  error=$?
  set -e
  if [ $error -gt 1 ]
  then
    echo "The diff command encountered an unexpected error!"
    exit $error
  elif [ $error -gt 0 ]
  then
    echo
    echo "The following files contain unexpected differences:"
    echo
    echo "    Upstream: spec/$file.js"
    echo "  Downstream: packages/kbn-handlebars/src/upstream/index.$file.test.ts"
    echo
    echo "This can happen if either the upstream or the downstream version has been"
    echo "updated without our patch files being kept up to date."
    echo
    echo "To resolve this issue, do the following:"
    echo
    echo "  1. Check the '4.x' branch of the upstream git repository to see if the file"
    echo "     has been updated. If so, please ensure that our copy of the file is kept in"
    echo "     sync. You can view the recent upstream commits to this file here:"
    echo
    echo "     https://github.com/handlebars-lang/handlebars.js/commits/4.x/spec/$file.js"
    echo
    echo "  2. Update our patch files by running the following script. This is also"
    echo "     necessary even if it's only the downstream file that has been updated:"
    echo
    echo "     ./packages/kbn-handlebars/scripts/update_test_patches.sh $file"
    echo
    echo "  3. Commit the changes to the updated patch file and execute this script again"
    echo "     until everything passes:"
    echo
    echo "     ./packages/kbn-handlebars/scripts/check_for_test_changes.sh"
    echo
    exit $error
  fi
done

echo "No changes found :)"
