#!/usr/bin/env bash

set -euo pipefail

ts-node .buildkite/scripts/steps/cloud/purge_deployment.ts
