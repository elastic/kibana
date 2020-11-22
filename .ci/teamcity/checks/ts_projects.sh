#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

yarn run grunt run:checkTsProjects
