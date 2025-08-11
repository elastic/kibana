#!/bin/bash

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the "Elastic License
# 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
# Public License v 1"; you may not use this file except in compliance with, at
# your election, the "Elastic License 2.0", the "GNU Affero General Public
# License v3.0 only", or the "Server Side Public License, v 1".

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Calculate path to cypress binary relative to script location
# This script is in src/platform/packages/shared/kbn-cypress-config/
# Cypress binary is in node_modules/.bin/cypress (at repo root)
CYPRESS_BIN="$SCRIPT_DIR/../../../../../node_modules/.bin/cypress"

# Determine browser based on USE_CHROME_BETA environment variable
# This matches the logic used in Security Solution's parallel runner
if [ "$USE_CHROME_BETA" = "true" ] || [ "$USE_CHROME_BETA" = "1" ]; then
  BROWSER="chrome:beta"
else
  BROWSER="chrome"
fi

# Run cypress with the selected browser
exec node "$CYPRESS_BIN" run --browser "$BROWSER" "$@"