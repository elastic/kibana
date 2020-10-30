#!/bin/bash

set -euo pipefail

cd "$(dirname "${0}")"

cp /usr/local/bin/runbld ./
cp /usr/local/bin/bash_standard_lib.sh ./

docker build -t kibana-ci -f ./Dockerfile .
