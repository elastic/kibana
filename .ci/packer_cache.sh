#!/usr/bin/env bash

# run setup script that gives us node, yarn, and bootstraps the project
source "src/dev/ci_setup/setup.sh";

# cache es snapshots
node scripts/es snapshot --download-only;

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/master.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  .es;
