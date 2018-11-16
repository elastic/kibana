#!/usr/bin/env bash

find . > "$HOME/kibana-clean";

source "src/dev/ci_setup/setup.sh";

echo ""
echo ""
echo "building kibana == $(date)"
time node scripts/build;

cacheDir="${CACHE_DIR:-"$HOME/.kibana"}";

echo ""
echo ""
echo "archiving untracked and ignored files == $(date)"
tar cf "$cacheDir/untracked.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/plugins/*/node_modules \
  optimize \
  data \
  .es;


echo ""
echo ""
echo "cleaning untracked and ignored files == $(date)"
git clean -fdx;

echo ""
echo ""
echo "extracting untracked and ignored files from archive == $(date)"
tar xf "$cacheDir/untracked_files";

echo ""
echo ""
echo "noting files after extraction == $(date)"
find . > "$HOME/kibana-extracted-cache";

echo ""
echo ""
echo "done == $(date)"
