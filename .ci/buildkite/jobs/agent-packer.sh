#!/usr/bin/env bash

set -euo pipefail

# Credentials

cd .buildkite/agents/packer

PKR_VAR_buildkite_token=$(vault read -field=token secret/kibana-issues/dev/buildkite-agent-token)
export PKR_VAR_buildkite_token

packer build .
