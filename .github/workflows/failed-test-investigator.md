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

if: "${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.issue_number != '') || (github.event_name == 'issues' && !github.event.issue.pull_request && contains(github.event.issue.labels.*.name, 'failed-test') && (github.event.action != 'labeled' || github.event.label.name == 'failed-test')) }}"

concurrency:
  # Keep one investigation lane per issue. Unrelated label events get their own group suffix so they can skip without canceling an in-flight investigation.
  group: >-
    failed-test-investigator-${{ github.event.issue.number || github.event.inputs.issue_number }}-${{
      (
        github.event.action == 'labeled' &&
        github.event.label.name != 'failed-test' &&
        github.event.label.name
      ) ||
      'investigate'
    }}
  cancel-in-progress: true
  job-discriminator: ${{ github.event.issue.number || github.event.inputs.issue_number }}

env:
  ISSUE_NUMBER: &issue_number ${{ github.event.issue.number || github.event.inputs.issue_number }}
  # Lets the agent omit `-o elastic` on every `bk` invocation (see https://buildkite.com/docs/pipelines/configure/environment-variables)
  BUILDKITE_ORGANIZATION_SLUG: elastic

imports:
  - .github/workflows/buildkite-cli-setup.md

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 120
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
    toolsets: [default, actions, search]
  web-fetch:
  bash: true

network:
  allowed:
    - defaults
    - buildkite.com
    - '*.buildkite.com'
    - buildkiteartifacts.com
    - ci-stats.kibana.dev
    - github.com
    - api.github.com
    - elastic.litellm-prod.ai
    - elastic.co
sandbox:
  agent: awf # Migrated from deprecated network setting

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
    allowed:
      # classification labels, max one per issue
      - failure:test-needs-update
      - failure:test-environment
      - failure:application
      - failure:ci-environment
      - failure:inconclusive
      # optional labels
      - failure:ai-fixable
      - failure:fix-did-not-hold
      - failure:insufficient-data
      # fix-request label that triggers the Flaky Test Fixer workflow
      - ai:fix-flaky
    max: 5
    target: *issue_number
    # Label as `kibanamachine` so the `ai:fix-flaky` labeled event triggers the
    # Flaky Test Fixer (default GITHUB_TOKEN events don't trigger workflows).
    github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
  # On a re-investigation (e.g. a reopened issue) the previous verdict's labels are
  # stale. Allow removing any `failure:*` label plus a lingering `ai:fix-flaky` fix
  # request so the fresh verdict can replace them (`failure:*` also clears deprecated ones).
  # max=5 covers a full stale verdict: up to four investigator labels (a classification,
  # `failure:ai-fixable`, `failure:fix-did-not-hold`, and `failure:insufficient-data`)
  # plus a lingering `ai:fix-flaky`.
  remove-labels:
    allowed:
      - failure:*
      - ai:fix-flaky
    max: 5
    target: *issue_number
  # Lets the agent close the issue when the verdict is that there is nothing to
  # fix in the repository (see "Close the issue when there is nothing to fix").
  # Closing is safe: the failed test reporter reopens the issue automatically if
  # the test fails again.
  close-issue:
    max: 1
    target: *issue_number
    required-labels: [failed-test]
    state-reason: not_planned

strict: false
timeout-minutes: 35
---

# Failed Test Investigator

Investigate a failed-test issue, classify the failure, and propose a fix when appropriate.

This run is killed at a hard timeout and posts a single, write-once comment that cannot be edited or replaced. If you run out of time before posting, nothing is recorded. The objective is a correct comment that ships (an investigation that is "more thorough" but never posts is a failure).

## Target issue

- **`issues` trigger**: use the triggering issue (non-PR, labeled `failed-test`).
- **`workflow_dispatch`**: use issue `${{ github.event.inputs.issue_number }}`. Fetch it explicitly before analysis, and post the final comment there.

## Investigate

Investigate the test failure(s) using the `flaky-test-investigator` skill (path: `.agents/skills/flaky-test-investigator`). Read the files in the folder directly, do not invoke the skill directly as that is disabled in this environment.

Use all of the data at your disposal to reach a conclusion (source code, logs, failure screenshots, etc.). Review the **issue timeline** as part of this — its reopen history and any prior fix PRs that referenced this issue tell you whether an earlier fix already tried and failed.

Every conclusion must cite specific evidence. Do not guess.

## Environment constraints

**Scratch files**: write throwaway files inside the repository checkout (the current working directory). Redirecting (`>`) elsewhere (e.g. `/tmp/...`) may be blocked — use a path under the repo root.

## Classify

Set `classification` based on where the evidence points:

- **`test-needs-update`**: issue lives in the test code (e.g., timing/waits, selectors, fixtures, helpers, setup/teardown, assertion shape).
- **`test-environment`**: test code is fine, but its surroundings are problematic (e.g., leaked state from prior tests, flaky fixture init, missing `data-test-subj` the test relies on, parallel-slot interference).
- **`application`**: real product bug exposed by the test (e.g., race, regression, broken contract, feature-flag bug).
- **`ci-environment`**: outside test + app — CI agent, downed dependency (e.g., ES failed to start), network, credentials, registry.
- **`inconclusive`**: evidence does not support a defensible call.

Set `confidence` to `high` (direct evidence pins the cause), `medium` (strong inference from converging signals), or `low` (plausible but underspecified).

## Fix proposal

- Propose a fix only when you can point to a likely file or code area.
- Prefer the smallest change that resolves the root cause **and** brings the test in line with our best practices — not a narrower band-aid that leaves the anti-pattern in place. Best practices are the north star for the fix.
- For test fixes: name the assertion, wait, fixture, setup/teardown, or helper to change.
- For code fixes: name the module, API, or behavior that looks wrong and why.
- If you cannot justify a concrete fix, say what additional evidence would change the conclusion.

## Labels

### Classification label

Add exactly one classification label to the issue that matches the chosen `classification`:

- `failure:test-needs-update`: when `classification` is `test-needs-update`
- `failure:test-environment`: when `classification` is `test-environment`
- `failure:application`: when `classification` is `application`
- `failure:ci-environment`: when `classification` is `ci-environment`
- `failure:inconclusive`: when `classification` is `inconclusive`

### "Is the issue fixable?" label

Add `failure:ai-fixable` to the issue if we are confident that a fix is available (it would imply opening a PR against the codebase).

### Automatic fix request

When you add `failure:ai-fixable`, also add `ai:fix-flaky` to automatically request a fix — its `labeled` event triggers the Flaky Test Fixer workflow, which opens a draft fix PR. **Skip** the `ai:fix-flaky` label when a fix PR for this issue is already up (open, in draft, or in review) in the Kibana repository — you already check for one when writing the tip block below; don't request a duplicate.

### "Previous fix didn't hold" label

Add `failure:fix-did-not-hold` (in addition to the classification label) when your investigation shows a **fix was already merged for this same failure and the failure came back** — regardless of who wrote it (a human contributor or an automation such as the flaky-test fixer). This label tracks fixes that regressed, so apply it only when **both** of the following hold:

- a prior PR that **fixed this issue was merged** (from the issue timeline / reopen history you already reviewed, corroborated by `git log`/`git blame` when ambiguous); and
- the current failure is the **same** one that PR set out to fix — same test, and the same assertion/error signature and root-cause area — i.e. the merged fix demonstrably did not hold.

Do **not** add the label when the recurring failure is **unrelated** to what the merged fix addressed — a different root cause, or a symptom the earlier fix never targeted — even if it lands in the same test file or suite.

### "Insufficient data" label

Add `failure:insufficient-data` (in addition to the other label(s)) when you could **not** reach a strong, confident conclusion because the data needed to diagnose the failure was missing — server logs, a Playwright trace, the failure screenshot, or build logs were absent, expired, or never uploaded. Missing data on its own is not enough to warrant the label: add it only when that data would have changed the conclusion or substantially raised the confidence of the analysis.

When you set it, the comment's `#### Additional context` → "Open questions" bullet (or the `#### Data collection issues` section, if a fetch failed) must name exactly what was missing and how to obtain it. When the gap is **logs** specifically, be concrete and actionable instead of asking for "more logs":

- **Name the logs you needed:** the logger/context, level, and the event or time window (e.g. `plugins.security.authentication` at `debug` around the failure), and why they would be decisive.
- **Propose how to capture them on the next run:** the specific logger to raise and where. Aim for a plan precise enough that a single re-run would produce the evidence needed to firm up the classification.

### Refresh stale labels on re-investigation

This issue may have been investigated before (for example, it was reopened after a prior verdict). Treat any pre-existing `failure:*` classification, `failure:ai-fixable`, `failure:fix-did-not-hold`, `failure:insufficient-data`, or `ai:fix-flaky` label as stale: remove the ones that no longer match your fresh verdict, keep (or add) the single correct classification, `failure:ai-fixable` only if a fix is still available, `failure:fix-did-not-hold` only if a merged fix for this same failure still demonstrably did not hold, and `failure:insufficient-data` only if data is still the blocker. Clear a lingering `ai:fix-flaky` only when your fresh verdict is **not** fixable; when it is, keep (or add) it per "Automatic fix request". If the existing labels already match your verdict, leave them as they are.

## Close the issue when there is clearly nothing to fix

When the verdict is that no change to this repository is needed, close the issue with the `close-issue` tool. Close only when **all** of the following hold:

- the classification is `ci-environment` and `confidence` is `medium` or `high`: the failure came from a transient, external, or one-off cause with nothing test- or product-related to fix;
- the failure is not recurring: a CI-environment failure that keeps hitting the same test or suite needs escalation, not closing — leave it open;
- you did not add `failure:ai-fixable` or `ai:fix-flaky`, and no fix PR referencing this issue is open.

Call the tool at most once, only after posting the verdict comment, and do not attach a closing comment to it. Instead, make the close visible in the verdict comment with a tip block right after (and outside) the `<details>` block:

```markdown
> [!TIP]
> Closing this issue: {one-sentence reason}. It will reopen automatically if the test fails again.
```

When in doubt, leave the issue open.

## Attribution

- Mention a commit (or small set of commits, last 3 months) only when evidence strongly implicates it.
- Never speculate or use attribution as a fallback for weak evidence.

## Comment format

Post exactly one comment on the issue. Optimize for a reviewer who spends ~30 seconds on it: the visible header must carry the verdict on its own, and the collapsed details must be skimmable, not exhaustive.

**Write tight.** Use bullet points, not paragraphs; every sentence must be earned. Concretely:

- State the **single** dominant cause. Do not enumerate every call, file, wait, or step you inspected — that reasoning is what got you to the answer, not the answer.
- Cite evidence with an inline link to the code line or log instead of reproducing it. Never paste large blocks of existing code — link to the line range.
- **If you link the failure screenshot, link it to its Buildkite step — never to a fabricated URL.** The screenshot has no standalone public URL, so point the link at the specific failing job/step on Buildkite (the build URL anchored to that job's UUID, e.g. `.../builds/<n>#<job-uuid>`) and tell the reader to open its Artifacts → HTML report to view the screenshot. Never point a "failure screenshot" link at the issue itself or an invented link.
- Cut anything that does not change what the reader does next. If a sentence only proves you were thorough, delete it.

Follow the format below exactly. Do not create standalone sections for "what the test does" "evidence," "where the test ran," or "failure screenshot". Integrate these details seamlessly into the sections below if they add value.

The comment has different parts: a compact header that stays visible on the issue page (one `###` headline + one summary sentence), and a `<details>` block that hides everything else, as well as a tip block about the automatically requested fix or an auto-close (it is only posted under certain conditions, more info below).

**Inside the `<details>` block, every section starts with `#### Section name` on its own line** (e.g., `#### Proposed fix`, `#### Root cause & evidence`).

Add the following snippet of Markdown right after (and outside) the `<details>` block only if a fix is needed and available — i.e. you added `failure:ai-fixable` and requested a fix via `ai:fix-flaky` (see "Automatic fix request").

```markdown
> [!TIP]
> Marked "AI-fixable": fix PR incoming within ~20-30 min.
```

If a fix PR is already up (in draft or in review) in the Kibana repository — the case where you skipped the `ai:fix-flaky` label — mention the PR link in the tip block instead of the automatic-request sentence.

### 1. Visible header (required)

A `###` heading followed by one summary sentence — nothing else, no standing metadata lines:

```
### {Verdict} — {very short reason}

{One sentence pinpointing the exact failure point — the assertion, line, or error that fired.}
```

**Heading** — a short natural-language phrase (~10 words max), not a full sentence. Start with the plain-English verdict for the classification, then an em dash, then a very short reason:

| classification      | verdict phrase         |
| ------------------- | ---------------------- |
| `test-needs-update` | Test needs an update   |
| `test-environment`  | Test environment issue |
| `application`       | Application bug        |
| `ci-environment`    | CI environment issue   |
| `inconclusive`      | Inconclusive           |

Example: `### Test needs an update — the case is too long for a 60s budget`. **Do not repeat the failing test's name** — the issue title already has it, so describe the _failure_, not the test.

**Summary** — one sentence that _adds_ precision beyond the heading (the exact error, line, or step); never a paraphrase of it. No `**Summary:**` label.

- **Confidence:** do not print it by default. Surface it only when it is `low` or `inconclusive`, as a short parenthetical in the summary (e.g. "…_low confidence: no Playwright trace was uploaded_").
- **Introduced by:** no standing line. Mention an implicated commit/PR only when evidence strongly points to it, as an inline link inside the summary.

### 2. Collapsible investigation (required)

Wrap **everything after the summary** in a single `<details>` block so the issue page stays scannable. The sections below live inside the block, in this order:

```
<details>
<summary>Details</summary>

#### Proposed fix

{content — see guidance below}

#### Root cause & evidence

{content — see guidance below}

#### Additional context

{content — optional, omit the whole section if there is nothing high-signal to add}

</details>
```

#### Proposed fix (required)

State only _what to change_ — the "why" belongs in Root cause & evidence, so do not restate the failure or the reasoning here.

**Recommend one fix.** Pick the best option and commit to it — don't lay out competing options, and never use a table of alternatives (a table makes them look equally good). If a genuine alternative is worth noting, add it as a single sentence _after_ the recommendation, clearly subordinate to it.

**Anchor the fix to best practices.** Prefer the fix that brings the test in line with our best practices over a narrower patch that leaves the anti-pattern in place. When the fix maps to a best-practice rule, cite that rule as a section-scoped Markdown link (see below) so the developer learns the underlying guideline.

- **Single file:** name the `file:line` and the change, as a single sentence or a short diff. Do not paste surrounding code that already exists — link to it.
- **Multiple files (one fix spanning several):** a short table of `file:line` → change, one row per file. This lists the parts of the _one_ recommended fix, not a menu of alternatives. No rationale column.
- **No concrete fix:** in one or two sentences, name the evidence that would unblock one.

##### Linking to best practices

Kibana Scout/FTR test best practices live in three docs. Don't guess from keywords — read the actual headings to find the matching section:

- UI tests: `docs/extend/testing/ui-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices`
- API tests: `docs/extend/testing/api-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/api-best-practices`
- General (applies to both UI and API): `docs/extend/testing/scout-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/best-practices`

When a section with the same intent exists in both the specific and the general doc, prefer the specific one. Cite a rule as a **section-scoped Markdown link**, never the doc root, using the section heading text as the link label. Infer the `#anchor` from the explicit heading id in the markdown source — e.g. the heading `## Wait for UI updates after actions [wait-for-ui-updates-when-the-next-action-requires-it]` yields:

`[Wait for UI updates after actions](https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices#wait-for-ui-updates-when-the-next-action-requires-it)`

Only link a section that genuinely matches; if none fits, omit the link rather than force-fitting one.

#### Root cause & evidence (required)

Explain _why_ it failed in a few tight sentences or bullets, each anchored to a specific piece of evidence (inline link to a code line, commit, or log; you can mention screenshot contents if helpful). Lead with the decisive evidence.

- State the single root cause; don't re-walk the investigation or list every call in the test.
- Use an ASCII timeline **only** for a genuine race condition, cascade, or multi-component state leak — never for a linear explanation.
- Fold supporting evidence (missing `data-test-subj`, a failing request, screenshot state) into the narrative rather than listing it separately.
- Find the PR that most likely introduced the flakiness and name it here with an inline link and its merge date in a readable format (e.g. [#262449](https://github.com/elastic/kibana/pull/262449), merged August 12, 2025). Per **Attribution**, name it only when the evidence strongly implicates it — never as a fallback for weak evidence.

#### Additional context (optional)

Omit this section unless it changes what the reader does next. When present, keep it to a couple of one-line bullets:

- **Ruled out:** the dismissed alternatives in a **single** bullet — not one bullet per hypothesis.
- **Verification:** the one command or step that reproduces the failure or confirms the fix.
- **Open questions:** a blocker to a definitive fix (e.g. "no trace or screenshot was uploaded").

#### Data collection issues (only when a screenshot fetch failed)

UI failures (FTR and Scout/Playwright) ship a screenshot. Include this section **only** if you tried to fetch that screenshot and the fetch errored; otherwise omit it entirely. When you do include it, document the failure so the workflow can be debugged:

- the command you ran
- the URL (if applicable)
- the resulting error message
