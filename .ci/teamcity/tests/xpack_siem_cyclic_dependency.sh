#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

cd x-pack
checks-reporter-with-killswitch "X-Pack SIEM cyclic dependency test" node plugins/security_solution/scripts/check_circular_deps
