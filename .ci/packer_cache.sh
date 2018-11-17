#!/usr/bin/env bash

# run setup script that gives us node, yarn, and bootstraps the project
source "src/dev/ci_setup/setup.sh";

# run the build for both oss and default distributions to warm the babel and optimizer caches
node scripts/build;

# cache es snapshots
node scripts/es snapshot --download-only;

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/master.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  optimize \
  data \
  .es;
