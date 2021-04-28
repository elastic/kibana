#!/usr/bin/env bash

set -euo pipefail

cd /var/lib/kibana/workspace/kibana

if [[ -f ".buildkite/scripts/env.sh" ]]; then
  source ".buildkite/scripts/env.sh"
else
  source "/var/lib/kibana/workspace/kibana/.buildkite/env.sh"
fi

exec "${@-$SHELL}"
