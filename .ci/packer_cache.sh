#!/usr/bin/env bash

find . > "$HOME/kibana-clean";

source "src/dev/ci_setup/setup.sh";

node scripts/build;

cacheDir="${CACHE_DIR:-"$HOME/.kibana"}";
git ls-files --others --exclude-standard --ignored -z | xargs -0 tar -cf "$cacheDir/untracked_files";

git clean -fdx;
tar xf "$cacheDir/untracked_files";
find . > "$HOME/kibana-extracted-cache";
