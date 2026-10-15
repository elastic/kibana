#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/vault_fns.sh

## Usage
# ./deployment_credentials.sh set <key-path> <key=value> <key=value> ...
# ./deployment_credentials.sh unset <key-path>
# ./deployment_credentials.sh print <key-path>   (prints the vault read command, not the credentials)

if [[ "${1:-}" == "set" ]]; then
  set_deployment_credentials "${@:2}"
elif [[ "${1:-}" == "unset" ]]; then
  unset_deployment_credentials "${@:2}"
elif [[ "${1:-}" == "print" ]]; then
  deployment_vault_read_command "${2}"
else
  echo "Unknown command: $1"
  exit 1
fi
