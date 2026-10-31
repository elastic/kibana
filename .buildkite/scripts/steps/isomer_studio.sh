#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

trap 'if [[ -f target/junit/isomer-studio.xml ]]; then buildkite-agent artifact upload target/junit/isomer-studio.xml; fi' EXIT

echo '--- Check shared Isomer Studio'
node x-pack/platform/packages/shared/isomer/studio/run.ts check

echo '--- Build shared Isomer Studio from this checkout'
node x-pack/platform/packages/shared/isomer/studio/run.ts build

tar -czf target/isomer-studio.tar.gz -C target isomer-studio
buildkite-agent artifact upload 'target/isomer-studio.tar.gz'
