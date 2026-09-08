#!/usr/bin/env bash

set -euo pipefail

# Publishes a "success" GitHub commit status for each newline-delimited context
# name in $STATUS_CHECKS.

while IFS= read -r context; do
  [[ -z "$context" ]] && continue
  gh api "repos/elastic/kibana/statuses/$BUILDKITE_COMMIT" \
    -f state=success \
    -f target_url="$BUILDKITE_BUILD_URL" \
    -f context="$context" \
    --silent
done <<< "$STATUS_CHECKS"
