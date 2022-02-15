#!/usr/bin/env bash

set -euo pipefail

BUILD_SUCCESSFUL=$(node "$(dirname "${0}")/build_status.js")
export BUILD_SUCCESSFUL

if [[ "$(buildkite-agent meta-data get "did-upload-coveralls" --default '')" == 'true' ]]; then
  curl -k "https://coveralls.io/webhook?repo_token=$COVERALLS_REPO_TOKEN" -d "payload[build_num]=$BUILDKITE_BUILD_ID&payload[status]=done"
fi

if [[ "${GITHUB_BUILD_COMMIT_STATUS_ENABLED:-}" != "true" ]]; then
  "$(dirname "${0}")/commit_status_complete.sh"
fi

node "$(dirname "${0}")/ci_stats_complete.js"

if [[ "${GITHUB_PR_NUMBER:-}" ]]; then
  DOCS_CHANGES_URL="https://kibana_$GITHUB_PR_NUMBER}.docs-preview.app.elstc.co/diff"
  DOCS_CHANGES=$(curl --connect-timeout 10 -m 10 -sf "$DOCS_CHANGES_URL" || echo '')

  if [[ "$DOCS_CHANGES" && "$DOCS_CHANGES" != "There aren't any differences!" ]]; then
    buildkite-agent meta-data set pr_comment:docs_changes:head "* [Documentation Changes](${DOCS_CHANGES_URL})"
  fi
fi
