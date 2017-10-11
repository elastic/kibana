#!/usr/bin/env bash

set -x
set -e

cd packages/kbn-platform
npm install
cd -

cd packages/kbn-types
npm install
cd -

