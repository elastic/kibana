#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Skill Path Drift Check

# Bootstrap (needed for ts-node / node with proper env)
.buildkite/scripts/bootstrap.sh

node scripts/check_skill_paths --json --out /tmp/skill_path_report.json

# Count findings from the JSON report
FINDING_COUNT=$(node -e "
  const r = require('/tmp/skill_path_report.json');
  process.stdout.write(String(r.findings ? r.findings.length : 0));
")

if [[ "$FINDING_COUNT" -gt 0 ]]; then
  echo "Found $FINDING_COUNT stale path(s) in skill files"

  # Buildkite annotation (visible in the build UI)
  buildkite-agent annotate \
    --context skill-path-drift \
    --style warning \
    "$(node -e "
      const r = require('/tmp/skill_path_report.json');
      const lines = r.findings.map(f => '- \`' + f.file + ':' + f.line + '\` — \`' + f.token + '\`');
      process.stdout.write(':warning: **Stale skill paths detected**\n\n' + lines.join('\n'));
    ")" || true

  # Slack notification (only when channel is configured)
  if [[ -n "${SKILL_PATH_SLACK_CHANNEL:-}" ]]; then
    ts-node .buildkite/scripts/steps/checks/post_skill_path_slack.ts \
      --report /tmp/skill_path_report.json \
      --channel "$SKILL_PATH_SLACK_CHANNEL"
  fi
else
  echo "No stale skill paths found"
fi

exit 0
