#!/usr/bin/env bash

set -e
set -x

# move to Kibana root
cd "$(dirname "$0")/.."

source src/dev/ci_setup/extract_bootstrap_cache.sh
source src/dev/ci_setup/setup.sh
source src/dev/ci_setup/checkout_sibling_es.sh

echo "\n\t### JOB: ${JOB}"

case "$JOB" in
kibana-intake)
 ./test/scripts/jenkins_unit.sh
  echo "\n\t### ACTUALLY RUNNING kibana-intake"
  ;;
kibana-ciGroup*)
  export CI_GROUP="${JOB##kibana-ciGroup}"
#  ./test/scripts/jenkins_ci_group.sh
  echo "\n\t### NOT RUNNING kibana-ciGroup*"
  ;;
x-pack-intake)
#  ./test/scripts/jenkins_xpack.sh
  echo "\n\t### NOT RUNNING x-pack-intake"
  ;;
x-pack-ciGroup*)
  export CI_GROUP="${JOB##x-pack-ciGroup}"
#  ./test/scripts/jenkins_xpack_ci_group.sh
  echo "\n\t### NOT RUNNING x-pack-ciGroup*"
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
set +x