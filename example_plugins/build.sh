#!/usr/bin/env bash

set -x
set -e

plugins=( bar baz foo )

cd $(dirname "$0")

for i in "${plugins[@]}"
do
  cd $i
  [ -d "target" ] && rm -r "target"
  npm install
  cd ..
done
