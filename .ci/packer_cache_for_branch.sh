#!/usr/bin/env bash

set -e

branch="$1"
checkoutDir="$(pwd)"

function cleanup()
{
  if [[ "$branch" != "main" ]]; then
    rm --preserve-root -rf "$checkoutDir"
  fi

  exit 0
}

trap 'cleanup' 0

if [[ "$branch" != "main" ]]; then
  checkoutDir="/tmp/kibana-$branch"
  git clone https://github.com/elastic/kibana.git --branch "$branch" --depth 1 "$checkoutDir"
  cd "$checkoutDir"
fi

source src/dev/ci_setup/setup.sh;

# download es snapshots
node scripts/es snapshot --download-only;

# download reporting browsers
(cd "x-pack" && node ../node_modules/.bin/gulp downloadChromium);

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
  .chromium \
  .es \
  .chromedriver \
  .geckodriver \
  .yarn-local-mirror;

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"

.ci/build_docker.sh

