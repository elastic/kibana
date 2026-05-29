---
name: Failed Test Investigator
description: Investigate a failed-test issue, classify the failure, and propose a fix when appropriate.
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: Issue number in this repository to investigate
        required: true
        type: string
  issues:
    types: [opened, labeled, reopened]

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
  models: read

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && !github.event.issue.pull_request && contains(github.event.issue.labels.*.name, 'failed-test')) }}"

concurrency:
  group: 'failed-test-investigator-${{ github.event.issue.number || github.event.inputs.issue_number }}'
  cancel-in-progress: true

env:
  ISSUE_NUMBER: &issue_number ${{ github.event.issue.number || github.event.inputs.issue_number }}

engine:
  id: claude
  version: '2.1.111'
  model: opus
  max-turns: 120
  env:
    ANTHROPIC_API_KEY: ${{ secrets.LITELLM_API_KEY }}
    ANTHROPIC_BASE_URL: https://elastic.litellm-prod.ai
    ENABLE_PROMPT_CACHING_1H: '1'
    ANTHROPIC_DEFAULT_OPUS_MODEL: llm-gateway/claude-opus-4-7[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL: llm-gateway/claude-haiku-4-5
    ANTHROPIC_DEFAULT_SONNET_MODEL: llm-gateway/claude-sonnet-4-6
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, actions, search]
  web-fetch:
  bash: true

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - chatgpt.com
    - elastic.litellm-prod.ai
sandbox:
  agent: awf # Migrated from deprecated network setting
steps:
  - name: Install Buildkite CLI and export BUILDKITE_API_TOKEN
    env:
      BK_VERSION: 3.44.0
      BK_SHA256: 88867c0b983ad2afe1efc26f0df6b46b5673577c1aea95eba76992636fb9abe9
      OPS_BUILDKITE_TOKEN: ${{ secrets.OPS_BUILDKITE_TOKEN }}
    run: |
      set -euo pipefail
      tmp="$(mktemp -d)"
      url="https://github.com/buildkite/cli/releases/download/v${BK_VERSION}/bk_${BK_VERSION}_linux_amd64.tar.gz"
      curl -fsSL --retry 3 --retry-delay 2 "${url}" -o "${tmp}/bk.tgz"
      echo "${BK_SHA256}  ${tmp}/bk.tgz" | sha256sum -c -
      tar -xzf "${tmp}/bk.tgz" -C "${tmp}" bk
      install -d "${RUNNER_TEMP}/gh-aw/mcp-cli/bin"
      install -m 0755 "${tmp}/bk" "${RUNNER_TEMP}/gh-aw/mcp-cli/bin/bk"
      "${RUNNER_TEMP}/gh-aw/mcp-cli/bin/bk" --version
      if [ -z "${OPS_BUILDKITE_TOKEN:-}" ]; then
        echo "::error::OPS_BUILDKITE_TOKEN secret is not set" >&2
        exit 1
      fi
      echo "BUILDKITE_API_TOKEN=${OPS_BUILDKITE_TOKEN}" >> "${GITHUB_ENV}"

safe-outputs:
  noop:
    report-as-issue: false
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 1
    target: *issue_number
    hide-older-comments: true
  add-labels:
    allowed: [ai:auto-flaky-fix]
    max: 1
    target: *issue_number

strict: false
timeout-minutes: 20
---

# Failed Test Investigator

Investigate a failed-test issue, classify the failure, and propose a fix when appropriate.

## Target issue

- **`issues` trigger**: use the triggering issue (non-PR, labeled `failed-test`).
- **`workflow_dispatch`**: use issue `${{ github.event.inputs.issue_number }}`. Fetch it explicitly before analysis, and post the final comment there.

## Investigate

Investigate the test failure(s) using the `flaky-test-investigator` skill.

Every conclusion must cite specific evidence. Do not guess.

## Classify

Set `classification` based on where the evidence points:

- **`test-design`**: issue lives in the test code — timing/waits, selectors, fixtures, helpers, setup/teardown, assertion shape.
- **`test-environment`**: test code is fine, but its surroundings are wrong — leaked state from prior tests, flaky fixture init, missing `data-test-subj` the test relies on, parallel-slot interference.
- **`application`**: real product bug exposed by the test — race, regression, broken contract, feature-flag bug.
- **`external`**: outside test + app — CI agent, downed dependency (e.g., ES failed to start), network, credentials, registry. Failures on `local-*` targets are less likely to be external; weigh that when classifying.
- **`inconclusive`**: evidence does not support a defensible call.

Set `confidence` to `high` (direct evidence pins the cause), `medium` (strong inference from converging signals), or `low` (plausible but underspecified).

## Assign label `ai:auto-flaky-fix` in specific cases

Apply the `ai:auto-flaky-fix` label to the triggering issue **only** when **all** of these conditions hold:

- The GitHub issue represents a Scout test failure (it has the `scout-playwright` label)
- The test failed in the `kibana-on-merge` pipeline
- `classification` is `test-design`, `test-environment`, or `application`
- A concrete fix has been identified.

No other side-effects beyond posting the comment and updating the label.

## Fix proposal

- Propose a fix only when you can point to a likely file or code area.
- Prefer the smallest plausible change.
- For test fixes: name the assertion, wait, fixture, setup/teardown, or helper to change.
- For code fixes: name the module, API, or behavior that looks wrong and why.
- If you cannot justify a concrete fix, say what additional evidence would change the conclusion.

## Attribution

- Mention a commit (or small set of commits, last 3 months) only when evidence strongly implicates it.
- Never speculate or use attribution as a fallback for weak evidence.

## References

- Link repository files with Markdown GitHub links — never bare paths.
- Prefer blob links with line anchors: `[path/to/file.ts](https://github.com/${{ github.repository }}/blob/${{ github.event.repository.default_branch }}/path/to/file.ts#L123-L140)`.
- For historical evidence, use a commit link instead of the default-branch blob link.
- Always link commits — never bare SHAs.
- Bare paths (`file.ts:123`) are allowed only as a supplement to a link.

## Comment format

Post exactly one comment. Keep the visible portion very short and easy to read:

1. **One-line bold headline** stating the result kind and one identifying detail.
2. **Diagnosis** (≤5 concise bullet points): what broke and where, the most likely root cause.
3. **Recommended next steps** (≤5 concise bullet points).

Put the full `flaky-test-investigator` skill output inside a collapsed `<details><summary>Investigation details</summary> ... </details>` block (not in the visible portion).

The skill's "Reporting" subsections should also be inside the collapsible section:

- What the test does
- Where it ran
- Root cause hypothesis
- Evidence
- Failure screenshot (omit this section if not available)
- Open questions

Blank lines around `</summary>` and `</details>` are required for the inner markdown to render.
