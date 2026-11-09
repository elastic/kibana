---
name: Flaky Fix Curator
description: Weekly pass over the Flaky Fix Retrospective findings. Turns repeated findings into one draft PR that sharpens the shared fix guidelines or the fixer, verifier and investigator prompts.
on:
  schedule: weekly on monday around 7:00
  workflow_dispatch:
    inputs:
      days:
        description: How many days of findings to review
        required: false
        type: string
        default: '7'
  # One proposal at a time: wait until the previous curator PR is merged or closed.
  skip-if-match: 'is:pr is:open label:flaky-fix-curator'

permissions:
  contents: read
  issues: read
  pull-requests: read

concurrency:
  group: flaky-fix-curator
  cancel-in-progress: false
  job-discriminator: ${{ github.run_id }}

env:
  FINDINGS_DAYS: ${{ github.event.inputs.days || '28' }}
  FINDINGS_ARTIFACT_NAME: &findings_artifact_name flaky-fix-curator-findings-${{ github.run_id }}

imports:
  - .github/workflows/shared/app-dex-agents-otel.md

engine:
  id: claude
  version: '2.1.165'
  model: opus
  max-turns: 100
  env:
    ANTHROPIC_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    ANTHROPIC_BASE_URL: https://openrouter.ai/api
    ANTHROPIC_DEFAULT_OPUS_MODEL: anthropic/claude-opus-5
    ANTHROPIC_DEFAULT_HAIKU_MODEL: anthropic/claude-haiku-4.5
    ANTHROPIC_DEFAULT_SONNET_MODEL: anthropic/claude-sonnet-4.6
    CLAUDE_CODE_EFFORT_LEVEL: high
    CLAUDE_CODE_SUBAGENT_MODEL: opus[1m]

tools:
  github:
    toolsets: [default, search]
  bash: true

network:
  allowed:
    - defaults
    - github.com
    - api.github.com
    - openrouter.ai
sandbox:
  agent: awf

jobs:
  # The agent only runs when the week produced findings with a lesson attached.
  activation:
    needs: [collect]
    if: needs.collect.outputs.findings != '0'
  collect:
    needs: pre_activation
    if: needs.pre_activation.outputs.activated == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
    outputs:
      findings: ${{ steps.collect.outputs.findings }}
    steps:
      - name: Checkout workflow scripts from trusted main
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          repository: elastic/kibana
          ref: main
          sparse-checkout: .github/scripts
          persist-credentials: false
      - name: Collect the retrospective findings
        id: collect
        uses: actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0
        env:
          FINDINGS_DAYS: ${{ env.FINDINGS_DAYS }}
        with:
          retries: 3
          script: |
            const { collectFlakyFixFindings } = require('./.github/scripts/flaky_fix_findings.js');
            const days = Number(process.env.FINDINGS_DAYS);
            await collectFlakyFixFindings({ github, core, days: Number.isInteger(days) && days > 0 ? days : 28 });
      - name: Upload the findings
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: *findings_artifact_name
          path: /tmp/flaky-fix-curator
          retention-days: 1

steps:
  - name: Download the findings
    uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
    with:
      name: ${{ env.FINDINGS_ARTIFACT_NAME }}
      path: /tmp/gh-aw/agent

safe-outputs:
  threat-detection:
    engine:
      id: claude
      version: '2.1.165'
  activation-comments: false
  report-failure-as-issue: false
  # Preview only until the first proposals have been reviewed: the PR shows up in the run's
  # step summary instead of being opened. Remove `staged` to open real PRs.
  staged: true
  create-pull-request:
    draft: true
    max: 1
    title-prefix: '[Flaky Test Fixer] '
    labels: [flaky-fix-curator, release_note:skip, backport:skip, Team:QA]
    team-reviewers: [appex-qa]
    base-branch: main
    # `main` only: any other base makes the handler run an unbounded `git fetch` that
    # can't finish on a repo Kibana's size.
    allowed-base-branches: ['main']
    if-no-changes: 'ignore'
    # Open the PR as `kibanamachine` (a user) so CI runs on it.
    github-token: ${{ secrets.KIBANAMACHINE_TOKEN }}
    patch-format: am
    # The whole point of this workflow is editing agent instructions, so the default
    # `.github/` and `.agents/` protection is lifted and replaced by this exact allowlist.
    protected-files: allowed
    allowed-files:
      - .github/workflows/shared/flaky-fix-guidelines.md
      - .github/workflows/flaky-test-fixer.md
      - .github/workflows/flaky-fix-verifier.md
      - .github/workflows/failed-test-investigator.md
      - .agents/skills/flaky-test-investigator/**
      - docs/extend/testing/**

strict: false
timeout-minutes: 30
max-ai-credits: 600
---

# Flaky Fix Curator

Every week the Flaky Fix Retrospective records what developers changed in the Flaky Test Fixer's PRs, which fixes they replaced or closed, and which merged fixes did not hold. Turn the findings that repeat into one small, evidence-backed change to the instructions those workflows run on, and open it as a draft PR for the QA team to review. You propose; humans decide.

## Inputs

A deterministic pre-step collected the last `${{ env.FINDINGS_DAYS }}` days of findings into `/tmp/gh-aw/agent/`:

- `findings.jsonl`: one finding per line, each with its `case`, `fix_pr`, `divergence`, `guideline` (the quoted guideline phrase, or `none`), `guideline_followed`, `lesson_type`, `lesson`, `lesson_target`, `confidence`, and `comment_url` (the finding comment, which holds the evidence links).
- `findings-summary.json`: counts by case, divergence, lesson type, target and guideline.
- `curator-prs.json`: the curator PRs of the last 90 days with their bodies, so you never propose what is already open or merged.
- `instruction-changes.json`: every commit that touched one of the files below during the window, with its date and title. Humans edit these prompts too, and a finding may already be addressed.

The files you may change, and only these:

- `.github/workflows/shared/flaky-fix-guidelines.md`: the fix guidelines shared by the investigator, fixer and verifier (`lesson_target: guidelines`).
- `.github/workflows/flaky-test-fixer.md`, `.github/workflows/flaky-fix-verifier.md`, `.github/workflows/failed-test-investigator.md`: the workflow prompts (`lesson_target: fixer | verifier | investigator`). Edit the markdown body only. Never touch the YAML frontmatter between the `---` markers: frontmatter changes need a recompile and a different review.
- `.agents/skills/flaky-test-investigator/`: the investigation skill the investigator and fixer read.
- `docs/extend/testing/`: the Scout testing docs the guidelines link to and the fixer reads. Change one when the lesson is about how to write the test, not about how the workflow runs.

Prompt bodies and the guidelines are loaded at run time, so a merged change takes effect on the next run without recompiling the lock files.

## Steps

1. **Read the findings.** Drop every finding with `lesson_type: none`. If none remain, call `noop` with the counts and stop.
2. **Cluster what remains** by the guideline they cite and the lesson they state. Two findings belong together when a single instruction would have changed both outcomes, not merely because they share a framework or a team. Read the linked finding comments for the clusters you keep; the one-line `lesson` is a summary, the comment carries the evidence.
3. **Qualify each cluster.** A cluster earns a proposal when:
   - at least two findings support it, or one `high` confidence `did-not-hold` or `diagnosis` finding states a condition that generalizes beyond its test; and
   - the instruction it calls for is not already in the target file (read the current file on `main`, do not rely on the quoted phrase alone); and
   - no curator PR in `curator-prs.json` already proposed it; and
   - the finding was recorded after the last commit to its target file (`instruction-changes.json`). A finding older than a change to the file it targets may be stale: the fixer that produced it was running the old text. Read those commits. If one of them addresses the lesson, drop the finding; if they touched something else, it still counts.
   Keep at most three clusters, strongest evidence first. Everything else waits for more findings.
4. **Write the change.** For each cluster, edit the target file:
   - For `reinforce` lessons the rule exists and did not bite. Move or sharpen it where the workflow makes the decision (the fixer's steps, the verifier's gate), or add the concrete tell that would have triggered it. Do not duplicate the bullet in a second place.
   - For `new` lessons add one bullet (two sentences at most) under the guideline section it belongs to, written as a condition and an action, in the voice of the surrounding bullets.
   - For `process` lessons change the workflow step that got the mechanics wrong, in the smallest way that fixes it.
   - Delete or weaken an existing rule only when the findings show it produced bad fixes, with the same evidence bar as any other change, and say so in the PR body. Never rename a heading (other prompts link to them), and never grow `flaky-fix-guidelines.md` by more than six lines in one PR. If a lesson needs more than that, the file is the wrong place: propose it in the PR description instead and leave the file alone.
5. **Open the PR** with `create_pull_request`. Title: `[Flaky Test Fixer] <what the instructions now say to do>`, one line. Body:

   ```markdown
   ### Summary

   <one bullet per change: the file, what changed, and why in one sentence each>

   ### Evidence

   <one line per change naming the file and bullet, then one short bullet per finding under it: fix PR link, finding comment link, what developers did or what recurred, ten words or fewer>

   ### Not proposed

   <one bullet per cluster you dropped and why, or "Nothing else repeated in the window.">

   ### Review notes

   - Prompt bodies load at run time, so no lock file recompile is needed for this change.
   - <any file you considered editing but did not, and why>
   ```

   Each evidence row must link the finding comments, and through them the fix PRs: a change without evidence is not a proposal.
6. If no cluster qualified, call `noop` with one sentence per dropped cluster so the run's summary says what was seen and why it was not enough.

## Guardrails

- One PR per run, and nothing when the skip condition in the frontmatter found a curator PR still open.
- Edit only the files listed above, only their markdown bodies, and only the lines the change needs. Do not reformat, reflow, or "improve" surrounding text.
- Do not change what the workflows are allowed to do (labels, safe outputs, tools, permissions, triggers): those live in frontmatter and are out of scope.
- Never `@`-mention anyone and never name a developer. Refer to findings by their links and to people by role.
- Keep the PR description short enough to review in five minutes. The evidence table is the review.

## Working efficiently

Read `findings-summary.json` first, then `findings.jsonl`, and fetch finding comments only for the clusters you keep. Read each target file once. Stop once the PR is created or `noop` is called.
