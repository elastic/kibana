#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/env.sh

for architecture in x86_64 aarch64; do
  if [[ "$architecture" == x86_64 ]]; then
    platform=linux/amd64
  else
    platform=linux/arm64
  fi

  echo "--- Verify FIPS archive on Ubuntu ($architecture)"
  docker run --rm --platform "$platform" \
    --mount "type=bind,src=$PWD/target/kibana-fips-$FULL_VERSION-linux-$architecture.tar.gz,dst=/tmp/kibana.tar.gz,readonly" \
    --mount "type=bind,src=$PWD/.buildkite/scripts/steps/artifacts/fips_package_smoke.sh,dst=/tmp/fips_package_smoke.sh,readonly" \
    ubuntu:24.04 sh /tmp/fips_package_smoke.sh tar

  echo "--- Verify FIPS RPM on Rocky Linux ($architecture)"
  docker run --rm --platform "$platform" \
    --mount "type=bind,src=$PWD/target/kibana-fips-$FULL_VERSION-$architecture.rpm,dst=/tmp/kibana.rpm,readonly" \
    --mount "type=bind,src=$PWD/.buildkite/scripts/steps/artifacts/fips_package_smoke.sh,dst=/tmp/fips_package_smoke.sh,readonly" \
    rockylinux:9 sh /tmp/fips_package_smoke.sh rpm
done
