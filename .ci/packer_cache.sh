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

# archive cacheable directories
mkdir -p "$HOME/.kibana/bootstrap_cache"
tar -cf "$HOME/.kibana/bootstrap_cache/$branch.tar" \
  node_modules \
  packages/*/node_modules \
  x-pack/node_modules \
  x-pack/legacy/plugins/*/node_modules \
  x-pack/legacy/plugins/reporting/.chromium \
  test/plugin_functional/plugins/*/node_modules \
  .es;

echo "created $HOME/.kibana/bootstrap_cache/$branch.tar"

if [ "$branch" == "master" ]; then
  echo "Creating bootstrap cache for 7.x";

  git clone https://github.com/elastic/kibana.git --branch 7.x --depth 1 /tmp/kibana-7.x
  (cd /tmp/kibana-7.x && ./.ci/packer_cache.sh);
  rm -rf /tmp/kibana-7.x;
fi
