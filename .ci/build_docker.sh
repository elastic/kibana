#!/bin/bash

set -euo pipefail

cd "$(dirname "${0}")"

cp /usr/local/bin/runbld ./
cp /usr/local/bin/bash_standard_lib.sh ./

if which docker >/dev/null; then
    docker build -t kibana-ci -f ./Dockerfile .
else
    echo "Docker binary is not available. Skipping the docker build this time."
fi
