#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

cd x-pack
checks-reporter-with-killswitch "X-Pack List cyclic dependency test" node plugins/lists/scripts/check_circular_deps
