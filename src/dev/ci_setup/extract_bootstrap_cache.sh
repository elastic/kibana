#!/usr/bin/env bash

set -e

source "src/dev/ci_setup/_instrumentation.sh";

###
### Extract the bootstrap cache that we create in the packer_cache.sh script
###
bootstrapCache="$HOME/.kibana/bootstrap_cache/master.tar"
if [ -f "$bootstrapCache" ]; then
  ici_span_start "extract bootstrap cache"
  echo "extracting bootstrap_cache from $bootstrapCache";
  tar -xf "$bootstrapCache";
  ici_span_stop "extract bootstrap cache"
else
  echo "bootstrap_cache missing";
  exit 1;
fi
