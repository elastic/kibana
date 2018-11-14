#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

case "$JOB" in
"test")
  source "src/dev/ci_setup/setup.sh"
  source "src/dev/ci_setup/git_setup.sh"

  node "scripts/jest_integration" --no-cache --ci packages/kbn-pm/src/production/integration_tests/build_production_projects.test.ts
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
