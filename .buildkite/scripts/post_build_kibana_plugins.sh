#!/usr/bin/env bash

set -euo pipefail

echo "--- Archive built plugins"
shopt -s globstar
git status --ignored --porcelain | sed s/^...// | fgrep target | tar -zcf target/kibana-default-plugins.tar.gz -T -
