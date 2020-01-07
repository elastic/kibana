#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

source src/dev/ci_setup/load_env_keys.sh
source src/dev/ci_setup/extract_bootstrap_cache.sh
source src/dev/ci_setup/setup.sh
source src/dev/ci_setup/checkout_sibling_es.sh

case "$JOB" in
kibana-intake)
  ./test/scripts/jenkins_unit.sh
  ;;
x-pack-intake)
  ./test/scripts/jenkins_xpack.sh
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
