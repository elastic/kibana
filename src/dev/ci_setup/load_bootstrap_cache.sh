#!/usr/bin/env bash

set -e

if [ -f "$HOME/.kibana/bootstrap_cache/master.tar" ]; then
  tar -xf "$HOME/.kibana/bootstrap_cache/master.tar";
else
  echo "bootstrap_cache missing";
  exit 1;
fi
