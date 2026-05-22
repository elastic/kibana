#!/usr/bin/env bash

set -euo pipefail

echo --- Notify Slack that branch has been created

if [[ -z "${DEPLOY_TAGGER_SLACK_WEBHOOK_URL:-}" ]]; then
  echo "No DEPLOY_TAGGER_SLACK_WEBHOOK_URL set, skipping Slack notification"
  exit 0
fi

PAYLOAD=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":kibana: Kibana has been branched to \`${BRANCH}\` but the version bump is still pending.\nBuild: ${BUILDKITE_BUILD_URL}"
      }
    }
  ]
}
EOF
)

curl -sf -X POST \
  -H 'Content-Type: application/json' \
  -d "${PAYLOAD}" \
  "${DEPLOY_TAGGER_SLACK_WEBHOOK_URL}"

echo "Slack notification sent to #mission-control"
