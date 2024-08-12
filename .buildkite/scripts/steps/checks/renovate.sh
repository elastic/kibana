#!/usr/bin/env bash

# renovate.json tracks this file for updating the pipelib docker image, update the path if you move this file

set -euo pipefail

echo --- Check renovate.json
docker run -v "$(pwd)"/renovate.json:/home/app/renovate.json docker.elastic.co/ci-agent-images/pipelib:0.8.0@sha256:641d7fc6cfe473900a1fbe49876762916d804b09fdf2945f74e9f803f3073779 renovate-config-validator
