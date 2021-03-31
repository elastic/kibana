#!/usr/bin/env bash

set -euo pipefail

echo "--- yarn install and bootstrap"

yarn kbn bootstrap
