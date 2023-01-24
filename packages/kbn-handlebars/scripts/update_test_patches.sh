#!/usr/bin/env bash

set -e

TMP=.tmp-handlebars

function cleanup {
  rm -fr $TMP
}

trap cleanup EXIT

rm -fr $TMP
mkdir $TMP

echo "Cloning handlebars repo..."
git clone -q --depth 1 https://github.com/handlebars-lang/handlebars.js.git -b 4.x $TMP/handlebars

if [ -z "$1" ]
then
  # No argument given: Update all patch files
  files=(packages/kbn-handlebars/src/upstream/index.*.test.ts)
else
  # Argument detected: Update only the requested patch file
  files=(packages/kbn-handlebars/src/upstream/index.$1.test.ts)
fi

for file in "${files[@]}"
do
  tmp=${file#*.} # remove anything before first period
  file=${tmp%.test.ts} # remove trailing .test.ts

  echo "Overwriting stored patch file for spec/$file.js..."
  set +e
  diff -d --strip-trailing-cr $TMP/handlebars/spec/$file.js packages/kbn-handlebars/src/upstream/index.$file.test.ts > packages/kbn-handlebars/.patches/$file.patch
  set -e
done

echo "All patches updated :)"
