#!/usr/bin/env bash

set -euo pipefail

# Publishes a "success" GitHub commit status for each newline-delimited context
# name in $STATUS_CHECKS.

case ${BUILDKITE_PIPELINE_SLUG:-} in
  kibana-merge-queue) ;;

  *)
    echo "error: trying to spoof status checks outside of an approved pipeline" >&2
    exit 1
    ;;
esac

while IFS= read -r context; do
  [[ -z "${context//[[:space:]]/}" ]] && continue # ignore empty lines

  gh api "repos/elastic/kibana/statuses/$BUILDKITE_COMMIT" \
    -f state=success \
    -f target_url="$BUILDKITE_BUILD_URL" \
    -f context="$context" \
    --silent
done <<< "$STATUS_CHECKS"
