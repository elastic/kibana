#!/usr/bin/env bash

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
  npm install
  npm run build
  cd -
done
