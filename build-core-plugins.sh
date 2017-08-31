#!/usr/bin/env bash

set -x
set -e

cd packages/kbn-types
npm install
npm run build
cd -

cd core_plugins

plugins=( pid savedObjects xpack reporting timelion timelionPluginB timelionPluginA )

for i in "${plugins[@]}"
do
  cd $i
  [ -d "target" ] && rm -r "target"
  npm install
  npm run build
  cd ..
done
