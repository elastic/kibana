#!/usr/bin/env bash

set -euo pipefail

DEPLOYMENT_VERSION=$(jq -r .version package.json)
export DEPLOYMENT_VERSION

export DEPLOYMENT_MINOR_VERSION="${DEPLOYMENT_VERSION%.*}"
export DEPLOYMENT_NAME="kb-${DEPLOYMENT_MINOR_VERSION/./-}"
