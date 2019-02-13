#!/usr/bin/env bash

set -e

# run setup script that gives us node, yarn, and bootstraps the project
source src/dev/ci_setup/setup.sh;

# download es snapshots
node scripts/es snapshot --download-only;

# download reporting browsers
cd "x-pack";
yarn gulp prepare;
cd -;

# download chromedriver
chromedriverVersion=2.42
mkdir -p ".chromedriver/$chromedriverVersion"
cd ".chromedriver/$chromedriverVersion"
wget https://chromedriver.storage.googleapis.com/$chromedriverVersion/chromedriver_linux64.zip
cd -

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/master.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  x-pack/plugins/reporting/.chromium \
  test/plugin_functional/plugins/*/node_modules \
  .es \
  .chromedriver;
