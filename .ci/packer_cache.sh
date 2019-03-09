#!/usr/bin/env bash

set -e

branch="$(git rev-parse --abbrev-ref HEAD 2> /dev/null)"

# run setup script that gives us node, yarn, and bootstraps the project
source src/dev/ci_setup/setup.sh;

# download es snapshots
node scripts/es snapshot --download-only;
node scripts/es snapshot --license=oss --download-only;

# download reporting browsers
cd "x-pack";
yarn gulp prepare;
cd -;

# cache the chromedriver bin
chromedriverDistVersion="$(node -e "console.log(require('chromedriver').version)")"
chromedriverPkgVersion="$(node -e "console.log(require('./package.json').devDependencies.chromedriver)")"
if [ -z "$chromedriverDistVersion" ] || [ -z "$chromedriverPkgVersion" ]; then
  echo "UNABLE TO DETERMINE CHROMEDRIVER VERSIONS"
  exit 1
fi

mkdir ".chromedriver"
curl "https://chromedriver.storage.googleapis.com/$chromedriverDistVersion/chromedriver_linux64.zip" > .chromedriver/chromedriver.zip
echo "$chromedriverPkgVersion" > .chromedriver/pkgVersion

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/$branch.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  x-pack/plugins/reporting/.chromium \
  test/plugin_functional/plugins/*/node_modules \
  .es \
  .chromedriver;

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"
