#!/bin/bash

set -euo pipefail

buildkite-agent pipeline upload .buildkite/pipelines/pull_request/base.yml
