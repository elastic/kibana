#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_job_env.sh
source .buildkite/scripts/common/setup_executors.sh

if [[ "${SKIP_NODE_SETUP:-}" =~ ^(1|true)$ ]]; then
  echo "Skipping node setup (SKIP_NODE_SETUP=$SKIP_NODE_SETUP)"
else
  source .buildkite/scripts/common/setup_node.sh
  source .buildkite/scripts/common/setup_buildkite_deps.sh
fi

if [[ "${KIBANA_TEST_IPV6_ONLY:-}" == "true" ]]; then
  echo "--- Loopback resolution (IPv6-only mode)"
  echo "localhost entries in /etc/hosts:"
  grep -iE '(^|\s)localhost(\s|$)' /etc/hosts || echo "  (none)"
  echo "getent ahosts localhost:"
  getent ahosts localhost || echo "  (lookup failed)"
  if command -v node > /dev/null; then
    echo "node dns.lookup:"
    node -e "require('dns').lookup('localhost',{all:true},(e,a)=>console.log(' ',e?\`error: \${e.code}\`:JSON.stringify(a)))" || true
  fi
fi
