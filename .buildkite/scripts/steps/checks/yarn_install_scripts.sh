#!/usr/bin/env bash

set -euo pipefail

echo --- Check Yarn Install Scripts
node scripts/yarn_install_scripts scan --validate
