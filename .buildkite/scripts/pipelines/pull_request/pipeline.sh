#!/bin/bash

set -euo pipefail

node .buildkite/scripts/pipelines/pull_request/pipeline.js
