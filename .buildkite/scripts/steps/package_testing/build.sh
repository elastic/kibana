#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

node scripts/build --all-platforms --debug

cd target
buildkite-agent artifact upload "./*.tar.gz;./*.zip;./*.deb;./*.rpm"
cd ..
