#!/usr/bin/env bash

set -euo pipefail

cd /var/lib/kibana/workspace/kibana

source "$(dirname "${0}")/env.sh"

exec "${@-$SHELL}"
