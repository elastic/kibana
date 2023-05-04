#!/usr/bin/env bash

checkout_and_compile_load_runner() {
  if [[ ! -d .git ]]; then
    git init
    git remote add origin https://github.com/elastic/kibana-load-testing.git
  fi
  git fetch origin --depth 1 "main"
  git reset --hard FETCH_HEAD

  KIBANA_LOAD_TESTING_GIT_COMMIT="$(git rev-parse HEAD)"
  export KIBANA_LOAD_TESTING_GIT_COMMIT

  mvn -q test-compile
  echo "Set 'GATLING_PROJECT_PATH' env var for ScalabilityTestRunner"
  export GATLING_PROJECT_PATH="$(pwd)"
}

upload_test_results() {
  echo "Upload server logs as build artifacts"
  tar -czf server-logs.tar.gz data/ftr_servers_logs/**/*
  buildkite-agent artifact upload server-logs.tar.gz
  echo "--- Upload Gatling reports as build artifacts"
  tar -czf "scalability_test_report.tar.gz" --exclude=simulation.log -C kibana-load-testing/target gatling
  buildkite-agent artifact upload "scalability_test_report.tar.gz"
}

bootstrap_kibana() {
  echo "--- yarn kbn bootstrap  --force-install"
  if ! yarn kbn bootstrap  --force-install; then
    echo "bootstrap failed, trying again in 15 seconds"
    sleep 15

    rm -rf node_modules

    echo "--- yarn kbn reset && yarn kbn bootstrap, attempt 2"
    yarn kbn reset && yarn kbn bootstrap
  fi
}
