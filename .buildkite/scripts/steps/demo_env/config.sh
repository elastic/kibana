#!/usr/bin/env bash

set -euo pipefail

DEPLOYMENT_VERSION=$(jq -r .version package.json)
export DEPLOYMENT_VERSION

MINOR_VERSION="${DEPLOYMENT_VERSION%.*}"

export DEPLOYMENT_NAME="kb-${MINOR_VERSION/./-}"
