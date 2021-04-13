#!/usr/bin/env bash

set -euo pipefail

# Credentials

cd .buildkite/agents/packer
export PKR_VAR_buildkite_token="TODO"
# export GOOGLE_APPLICATION_CREDENTIALS="TODO"

packer build .
