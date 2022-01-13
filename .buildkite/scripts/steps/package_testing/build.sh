#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build Kibana Distribution"
node scripts/build --all-platforms --debug --skip-docker-cloud --skip-docker-ubi --skip-docker-contexts

cd target
buildkite-agent artifact upload "./*-docker-image.tar.gz;./*.deb;./*.rpm"
cd ..
