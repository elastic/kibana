#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

<<<<<<< HEAD
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
=======
./src/dev/ci_setup/load_bootstrap_cache.sh;

case "$JOB" in
kibana-intake)
  ./test/scripts/jenkins_unit.sh
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
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
