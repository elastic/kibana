#!/usr/bin/env bash

set -e

branch="$(git rev-parse --abbrev-ref HEAD 2> /dev/null)"

# run setup script that gives us node, yarn, and bootstraps the project
source src/dev/ci_setup/setup.sh;

# download es snapshots
node scripts/es snapshot --download-only;
node scripts/es snapshot --license=oss --download-only;

# download reporting browsers
(cd "x-pack" && yarn gulp prepare);

# cache the chromedriver archive
chromedriverDistVersion="$(node -e "console.log(require('chromedriver').version)")"
chromedriverPkgVersion="$(node -e "console.log(require('./package.json').devDependencies.chromedriver)")"
if [ -z "$chromedriverDistVersion" ] || [ -z "$chromedriverPkgVersion" ]; then
  echo "UNABLE TO DETERMINE CHROMEDRIVER VERSIONS"
  exit 1
fi
mkdir -p .chromedriver
curl "https://chromedriver.storage.googleapis.com/$chromedriverDistVersion/chromedriver_linux64.zip" > .chromedriver/chromedriver.zip
echo "$chromedriverPkgVersion" > .chromedriver/pkgVersion

# cache the geckodriver archive
geckodriverPkgVersion="$(node -e "console.log(require('./package.json').devDependencies.geckodriver)")"
if [ -z "$geckodriverPkgVersion" ]; then
  echo "UNABLE TO DETERMINE geckodriver VERSIONS"
  exit 1
fi
mkdir -p ".geckodriver"
cp "node_modules/geckodriver/geckodriver.tar.gz" .geckodriver/geckodriver.tar.gz
echo "$geckodriverPkgVersion" > .geckodriver/pkgVersion

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/$branch.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/legacy/plugins/*/node_modules \
  x-pack/legacy/plugins/reporting/.chromium \
  test/plugin_functional/plugins/*/node_modules \
  examples/*/node_modules \
  .es \
  .chromedriver \
  .geckodriver;

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"

if [ "$branch" == "master" ]; then
  echo "Creating bootstrap cache for 7.x";

  git clone https://github.com/elastic/kibana.git --branch 7.x --depth 1 /tmp/kibana-7.x
  (cd /tmp/kibana-7.x && ./.ci/packer_cache.sh);
  rm -rf /tmp/kibana-7.x;
fi
