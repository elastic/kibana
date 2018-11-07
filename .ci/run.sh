#!/usr/bin/env bash

set -e

case "$KBN_CI_JOB" in
"selenium")
  source "$(dirname "$0")/../test/scripts/jenkins_selenium.sh"
  ;;
"intake")
  source "$(dirname "$0")/../test/scripts/jenkins_unit.sh"
  ;;
"x-pack")
  source "$(dirname "$0")/../test/scripts/jenkins_xpack.sh"
  ;;
*)
  echo "'$KBN_CI_JOB' is not implemented."
  exit 1
  ;;
esac
