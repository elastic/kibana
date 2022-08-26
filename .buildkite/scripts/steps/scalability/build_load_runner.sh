#!/usr/bin/env bash

set -euo pipefail

cd "$KIBANA_DIR"
mkdir -p kibana-load-testing && cd kibana-load-testing

echo "Clone kibana-load-testing main branch"
if [[ ! -d .git ]]; then
  git init
  git remote add origin https://github.com/elastic/kibana-load-testing.git
fi
git fetch origin --depth 1 "main"
git reset --hard FETCH_HEAD

KIBANA_LOAD_TESTING_GIT_COMMIT="$(git rev-parse HEAD)"
export KIBANA_LOAD_TESTING_GIT_COMMIT

echo "Compile project: mvn -q test-compile"
mvn -q test-compile
echo "Set 'GATLING_PROJECT_PATH' env var for ScalabilityTestRunner"
export GATLING_PROJECT_PATH="$(pwd)"
