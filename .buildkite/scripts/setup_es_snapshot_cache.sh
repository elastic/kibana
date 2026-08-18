#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

for dir in cache installs; do
  srcDir="$ES_CACHE_DIR/$dir"
  if [[ -d "$srcDir" ]] && [[ -n "$(ls -A "$srcDir")" ]]; then
    mkdir -p ".es/$dir"
    mv "$srcDir"/* ".es/$dir/"
  fi
done
