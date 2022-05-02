#!/bin/bash

set -euo pipefail

REMOTE_CACHE_PASSWORD="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/bazel-remote-cache-test)"

cat << EOF >> .bazelrc
build --remote_cache=grpc://test:${REMOTE_CACHE_PASSWORD}@34.121.74.141:9092
EOF

.buildkite/scripts/bootstrap.sh

