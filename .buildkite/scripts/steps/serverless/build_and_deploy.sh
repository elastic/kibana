#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/docker_image.sh

echo "--- Create Deployment"
echo $KIBANA_IMAGE