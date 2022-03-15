#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Bazel Packages Manifest
node scripts/generate packages_build_manifest --validate
