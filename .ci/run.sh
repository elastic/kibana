#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

case "$JOB" in
"test")
  ./.ci/packer_cache.sh
  ;;
*)
  echo "JOB '$JOB' is not implemented."
  exit 1
  ;;
esac
