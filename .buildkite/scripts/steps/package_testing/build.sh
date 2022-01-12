#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build Kibana Distribution"
node scripts/build --all-platforms --debug

cd target
buildkite-agent artifact upload "./kibana-[0-9]*-docker-image.tar.gz;./*.deb;./*.rpm"
cd ..
