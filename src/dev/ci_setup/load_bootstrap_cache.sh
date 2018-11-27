#!/usr/bin/env bash

set -e

bootstrapCache="$HOME/.kibana/bootstrap_cache/master.tar"

if [ -f "$bootstrapCache" ]; then
  echo "extracting bootstrap_cache from $bootstrapCache";
  tar -xf "$bootstrapCache";
else
  echo "bootstrap_cache missing";
  exit 1;
fi
