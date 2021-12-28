#!/usr/bin/env bash

set -euo pipefail

node .buildkite/scripts/steps/cloud/purge.js
