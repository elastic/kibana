#!/usr/bin/env bash

# run setup script that gives us node, yarn, and bootstraps the project
source "src/dev/ci_setup/setup.sh";

# download es snapshots
node scripts/es snapshot --download-only;

# download reporting browsers
cd "x-pack";
yarn gulp prepare;
cd -;

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/master.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  x-pack/plugins/reporting/.chromium \
  x-pack/plugins/reporting/.phantom \
  .es;
