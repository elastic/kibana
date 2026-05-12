---
name: Failed Test Investigator
description: Investigate failed-test issues, classify whether the flakiness is in the test or underlying code, and propose the most likely fix.
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
safe-outputs:
  activation-comments: false
  report-failure-as-issue: false
  add-comment:
    max: 1
    target: '*'
    hide-older-comments: true
  add-labels:
    allowed: [ai:auto-flaky-fix]
    max: 1
    target: 'triggering'

strict: false
timeout-minutes: 20
---

# Failed Test Investigator

Investigate a failed-test issue, classify the failure, and propose a fix when appropriate.

## Target issue

- **`issues` trigger**: use the triggering issue (non-PR, labeled `failed-test`).
- **`workflow_dispatch`**: use issue `${{ github.event.inputs.issue_number }}`. Fetch it explicitly before analysis, and post the final comment there.

## Where did the test run?

The test's **target** (e.g. `local-stateful-classic`, `cloud-serverless-security_complete`) tells you where it ran:

- **`cloud-*`** — ran against a real Elastic Cloud project (serverless) or deployment (stateful). Pipeline names: `appex-qa-{serverless|stateful}-kibana-{ftr|scout}-tests`.
- **`local-*`** — ran on the agent's local machine. `kibana-on-merge` and `kibana-pull-request` are local (no Elastic Cloud API calls), so the environment is more stable and less prone to network/env flakiness.

## Investigate

1. Read the issue title, body, labels, and all comments.
2. Parse test metadata if present: location (test file path), config path, code owners, target)
3. Look at all the failures reported in the issue. The very same test could have been failing with different error messages, for different reasons, on different pipelines, and on different branches.
4. Inspect the relevant test file and nearby helpers/fixtures. For Scout, start from the reported location; otherwise infer from the title.
5. Check recent git history and blame on the test file and related product code.

Every conclusion must cite specific evidence. Do not guess.

## Ways to fix a flaky test failure

## Classify

Set `classification` based on where the evidence points:

- **`test`**: timing, waits, selectors, fixtures, retries, setup/teardown, test data coupling, cleanup, or isolation issues in the test harness.
- **`application`**: real product bug, broken contract, regression, or race in app/server/shared code.
- **`external`**: CI instability, downed dependency, env/network/credentials, or unrelated platform incidents.
- **`inconclusive`**: evidence does not support a defensible call.

Set `fixability` to exactly one of:

- **`fixable`** — a concrete fix was identified.
- **`needs-human`** — test-side failure that needs human judgment:
- **`not-a-flake`** — real product bug. Ideally back ths with a recent commit, a feature-flag-exposed race, or a consistent reproducible failure.
- **`env-issue`**
- **`noop`** — no further action needed.
- **`inconclusive`** — none of the above apply with enough confidence.

## Action

Apply the `ai:auto-flaky-fix` label to the triggering issue **only if** `fixability` = `fixable` and if the failure happened on Scout tests on the `kibana-on-merge` pipeline. We may change these settings in the future. No other side-effects beyond posting the comment.

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

Post exactly one comment. Two parts: visible summary on top, collapsed `<details>` block for evidence.

### Visible (top), in this order:

1. **One-line bold headline** stating the result kind and one identifying detail. Consistent with `fixability` but not templated. Example: `**Likely flaky-test fix** — missing waitForAlertsToPopulate() in building_block_alerts.spec.ts`.

2. **A 3–5 sentence prose paragraph** (no headings, no bullets) covering: what broke and where (name the test file/name), the most likely root cause, and any evidence-backed author attribution with `@username` so they get notified on first read. Hard ceiling: 5 sentences.

3. **One-line action hint**: the proposed fix, recommended action, or missing evidence. Skip if the paragraph already covers it.

4. **Flakiness Finding bullets** — exactly these five, in this order, with one concrete value each. Downstream tooling parses these directly; preserve keys, casing, and `` - `key`: value `` shape:
   - `classification`: `test` | `code` | `external` | `inconclusive`
   - `confidence`: `high` | `medium` | `low`
   - `fixability`: `fixable` | `needs-human` | `not-a-flake` | `env-issue` | `inconclusive`
   - `test.type`: `scout` (if `scout-playwright` label) | `ftr` | `jest` | `unknown`
   - `test.file`: repo-relative path, or `unknown`

### Collapsed (`<details>`):

Use this exact structure (the blank lines around `</summary>` and `</details>` are required for inner markdown to render):
