#!/usr/bin/env bash

set -euo pipefail

echo '--- Install/build buildkite dependencies'

cd '.buildkite'
retry 5 15 npm ci
cd -
