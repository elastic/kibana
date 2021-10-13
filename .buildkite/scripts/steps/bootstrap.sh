#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

mkdir -p target
tar -cf target/bootstrap.tar --anchored --exclude=./target --exclude=./.git .

cd target
buildkite-agent artifact upload bootstrap.tar
buildkite-agent meta-data set "bootstrap_available" "true"
cd -
