---
name: Flaky Test Fixer
description: Open a draft fix PR for a `failed-test` issue that has been labeled `ai:auto-flaky-fix`.
on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: Issue number in this repository to fix
        required: true
        type: string

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && github.event.action == 'labeled' && github.event.label.name == 'ai:auto-flaky-fix' && !github.event.issue.pull_request) }}"

concurrency:
  group: 'flaky-test-fixer-${{ github.event.issue.number || github.event.inputs.issue_number }}'
  cancel-in-progress: false

env:
  ISSUE_NUMBER: &issue_number ${{ github.event.issue.number || github.event.inputs.issue_number }}

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 200
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: '1'
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-8[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
  web-fetch:
  bash:
    [
      'cat',
      'head',
      'tail',
      'grep',
      'wc',
      'sort',
      'uniq',
      'date',
      'yq',
      'jq',
      'echo',
      'ls',
      'pwd',
      'git:*',
      'gh:*',
      'bk:*',
      'node',
      'yarn',
      'curl',
    ]

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf

safe-outputs:
  staged: true
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 1
    target: *issue_number
    hide-older-comments: true
  create-pull-request:
    draft: true
    max: 1
    labels: [ai:flaky-fix-ready]
    base-branch: main
    allowed-base-branches: [main]
    if-no-changes: 'ignore'
    protected-files: fallback-to-issue

strict: false
timeout-minutes: 90
---

# Flaky Test Fixer

Open one draft PR with the smallest test-side fix for this flaky-test issue. If you cannot find a credible fix, stop without opening a PR.

## Steps

1. Read the investigator's comment on the issue for the suspected root cause and proposed fix. If no action is needed, stop.
2. Read the failing test and the helpers, fixtures, and page objects it imports.
3. Apply the smallest test-side patch that addresses the root cause.
4. Run the test locally until it passes.
5. Open the PR (see "PR format" below).

## PR format

- **Title**: `[<Plugin name>] <concise summary of the fix>`. Derive the plugin name from the test file path (e.g. `x-pack/solutions/security/plugins/security_solution/...` → `Security Solution`).
- **Body**:

  ```
  Fixes #<issue-number> (add more issue numbers here if this fix resolves multiple issues)

  <a few sentences: what was failing, and what this patch changes>

  #### Verified locally

  <bullet list of what you successfully ran on this branch — e.g. `yarn kbn bootstrap`, `node scripts/check --profile agent`, the targeted test passed N times in a row, etc. Include the exact commands.>

  #### Not verified locally

  <bullet list of what you could not verify and why — e.g. behavior under CI parallel load, on a different stack version, against a real Elasticsearch instance, etc. Omit this section if there is nothing to mention.

  This PR was opened automatically by the Flaky Test Fixer. Provide feedback in [#appex-qa](https://elastic.slack.com/archives/C04HT4P1YS3).
  ```
