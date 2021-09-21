#!/usr/bin/env bash

set -euo pipefail

echo "--- Archive built plugins"
shopt -s globstar
tar -zcf \
  target/kibana-default-plugins.tar.gz \
  x-pack/plugins/**/target/public \
  x-pack/test/**/target/public \
  examples/**/target/public \
  x-pack/examples/**/target/public \
  test/**/target/public
