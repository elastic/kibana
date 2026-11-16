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

  attempt=1
  retry_delay=5
  while ! response=$(GH_PAGER=cat gh api "repos/elastic/kibana/statuses/$BUILDKITE_COMMIT" \
      -f state=success \
      -f target_url="$BUILDKITE_BUILD_URL" \
      -f context="$context"); do
    echo "Failed to publish GitHub status: $context (attempt $attempt/4)" >&2
    if [[ -n "$response" ]]; then
      printf '%s\n' "$response" >&2
    fi

    if ((attempt == 4)); then
      exit 1
    fi

    echo "Retrying in ${retry_delay}s" >&2
    sleep "$retry_delay"
    attempt=$((attempt + 1))
    retry_delay=$((retry_delay * 2))
  done
done <<< "$STATUS_CHECKS"
