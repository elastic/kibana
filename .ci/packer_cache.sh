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

echo "Creating bootstrap_cache archive"

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/$branch.tar" \
  x-pack/legacy/plugins/reporting/.chromium \
  .es \
  .chromedriver \
  .geckodriver;

echo "Adding node_modules"
# Find all of the node_modules directories that aren't test fixtures, and aren't inside other node_modules directories, and append them to the tar
find . -type d -name node_modules -not -path '*__fixtures__*' -prune -print0 | xargs -0I % tar -rf "$HOME/.kibana/bootstrap_cache/$branch.tar" "%"

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"

if [ "$branch" == "master" ]; then
  echo "Creating bootstrap cache for 7.x";

  git clone https://github.com/elastic/kibana.git --branch 7.x --depth 1 /tmp/kibana-7.x
  (cd /tmp/kibana-7.x && ./.ci/packer_cache.sh);
  rm -rf /tmp/kibana-7.x;
fi
