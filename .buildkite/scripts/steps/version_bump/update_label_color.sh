#!/usr/bin/env bash

set -euo pipefail

echo --- Update label color for released version

echo "Setting color of label v${NEW_VERSION} to #dddddd"

gh label edit "v${NEW_VERSION}" --repo elastic/kibana --color "dddddd"

echo "Label color updated successfully"
