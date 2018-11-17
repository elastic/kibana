#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

./src/dev/ci_setup/load_bootstrap_cache.sh;

case "$JOB" in
"selenium")
  ./test/scripts/jenkins_selenium.sh
  ;;
"intake")
  ./test/scripts/jenkins_unit.sh
  ;;
"x-pack")
  ./test/scripts/jenkins_xpack.sh
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
