#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

case "$KBN_CI_JOB" in
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
  echo "CI_JOB '$KBN_CI_JOB' is not implemented."
  exit 1
  ;;
esac
