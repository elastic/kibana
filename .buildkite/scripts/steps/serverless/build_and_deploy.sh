#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/docker_image.sh

echo "--- Create Deployment"
ts-node .buildkite/scripts/steps/serverless/deploy.ts
