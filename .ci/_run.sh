#!/usr/bin/env bash

set -e

source src/dev/ci_setup/extract_bootstrap_cache.sh
source src/dev/ci_setup/setup.sh

case "$JOB" in
kibana-intake)
  # ./test/scripts/jenkins_unit.sh
  ;;
kibana-ciGroup*)
  export CI_GROUP="${JOB##kibana-ciGroup}"
  ./test/scripts/jenkins_ci_group.sh
  ;;
x-pack-intake)
  ./test/scripts/jenkins_xpack.sh
  ;;
x-pack-ciGroup*)
  export CI_GROUP="${JOB##x-pack-ciGroup}"
  ./test/scripts/jenkins_xpack_ci_group.sh
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
