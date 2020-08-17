#!/usr/bin/env bash

set -e

branch="$1"
checkoutDir="$(pwd)"

if [[ "$branch" != "master" ]]; then
  checkoutDir="/tmp/kibana-$branch"
  git clone https://github.com/elastic/kibana.git --branch "$branch" --depth 1 "$checkoutDir"
  cd "$checkoutDir"
fi

source src/dev/ci_setup/setup.sh;

# download es snapshots
node scripts/es snapshot --download-only;
node scripts/es snapshot --license=oss --download-only;

# download reporting browsers
(cd "x-pack" && yarn gulp downloadChromium);

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
  .geckodriver;

echo "Adding node_modules"
# Find all of the node_modules directories that aren't test fixtures, and aren't inside other node_modules directories, and append them to the tar
find . -type d -name node_modules -not -path '*__fixtures__*' -prune -print0 | xargs -0I % tar -rf "$HOME/.kibana/bootstrap_cache/$branch.tar" "%"

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"

if [[ "$branch" != "master" ]]; then
  rm --preserve-root -rf "$checkoutDir"
fi
