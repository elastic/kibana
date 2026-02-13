#!/usr/bin/env bash

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the "Elastic License
# 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
# Public License v 1"; you may not use this file except in compliance with, at
# your election, the "Elastic License 2.0", the "GNU Affero General Public
# License v3.0 only", or the "Server Side Public License, v 1".
#

set -e

# SecuritySolution Bug Report Runner
# This script provides a convenient wrapper to run the bug report with proper error handling

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "SecuritySolution Bug Report"
echo "========================================"
echo ""

# Check if required environment variables are set
REQUIRED_VARS=("GITHUB_TOKEN" "SMTP_HOST" "SMTP_PORT" "SMTP_USER" "SMTP_PASS" "REPORT_EMAIL_TO")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  echo "Please set these variables before running the script."
  echo "See scripts/README_SECURITY_SOLUTION_BUG_REPORT.md for details."
  echo ""
  echo "You can also source an environment file:"
  echo "  source ~/.kibana_security_report_env"
  echo "  $0"
  exit 1
fi

echo "Configuration:"
echo "  GitHub: ${GITHUB_OWNER:-elastic}/${GITHUB_REPO:-kibana}"
echo "  SMTP: $SMTP_HOST:$SMTP_PORT"
echo "  From: $SMTP_USER"
echo "  To: $REPORT_EMAIL_TO"
echo ""

# Change to repository root
cd "$REPO_ROOT"

# Run the Node.js script
echo "Running report script..."
echo ""
node scripts/report_security_solution_bugs.js

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Report completed successfully!"
else
  echo "✗ Report failed with exit code $EXIT_CODE"
  echo "Check the error messages above for details."
fi

exit $EXIT_CODE
