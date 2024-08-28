#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

node scripts/poc_effect
