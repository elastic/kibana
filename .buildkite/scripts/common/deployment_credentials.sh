#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/vault_fns.sh

## Usage
# ./deployment_credentials.sh set <key-path> <key=value> <key=value> ...
# ./deployment_credentials.sh unset <key-path>
# ./deployment_credentials.sh print <key-path>

if [[ "${1:-}" == "set" ]]; then
  set_in_legacy_vault "${@:2}"
elif [[ "${1:-}" == "unset" ]]; then
  unset_in_legacy_vault "${@:2}"
elif [[ "${1:-}" == "print" ]]; then
  print_legacy_vault_read "${2}"
else
  echo "Unknown command: $1"
  exit 1
fi
