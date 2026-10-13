---
name: evals-run-on-demand
disable-model-invocation: true
description: >
  Trigger an on-demand @kbn/evals Buildkite run by describing what you want in plain English.
  Use when asked to run evals, trigger a Buildkite eval build, test a suite against a model,
  or any phrasing that implies kicking off LLM evaluation. Accepts suite names, model names
  (EIS or OpenRouter), judge model, branch, and grep filter as natural language.
allowed-tools: Bash, Read
argument-hint: '[suite-name] [with <model>] [judged-by <model>] [on <branch>] [grep <pattern>]'
---

# Run On-demand LLM Evals on Buildkite

Translate a plain-English request into a `bk build create` call against the
`kibana-evals-on-demand-llm-evals` pipeline. The user wants to run: **$ARGUMENTS**

Never run `bk build create` without showing the summary in Step 6 and getting an explicit yes.

## Prerequisites

- [`bk` CLI](https://github.com/buildkite/cli) v3, authenticated against the `elastic` org (verified in Step 1).
- Access to the [kibana-evals-on-demand-llm-evals](https://buildkite.com/elastic/kibana-evals-on-demand-llm-evals) pipeline.
- `gh` CLI, only when running against the current branch or a PR (Step 3).

Manual fallback: trigger the build from the Buildkite UI as described in
[On-demand evals (Buildkite)](../../../x-pack/platform/packages/shared/kbn-evals/README.md#13-on-demand-evals-buildkite).

## Step 0: Parse intent

From `$ARGUMENTS` and the conversation, extract:

| Field    | Required | Maps to                                         | Default                            |
| -------- | -------- | ----------------------------------------------- | ---------------------------------- |
| Suite(s) | yes      | `EVAL_SUITE_ID` (comma-separated)               | ask                                |
| Model(s) | no       | `EVAL_MODEL_GROUPS` / `EVAL_INCLUDE_EIS_MODELS` | all OpenRouter models (CI default) |
| Judge    | no       | `EVAL_CONNECTOR_ID`                             | CI default judge                   |
| Branch   | no       | `--branch` (branch or `refs/pull/<N>/head`)     | current branch (Step 3)            |
| Grep     | no       | `EVAL_GREP`                                     | none                               |

## Step 1: Check `bk` authentication

```bash
bk auth status
```

If this fails or shows no organization, stop and tell the user:

> `bk` is not authenticated. Run `bk auth login` and try again.

## Step 2: Resolve suite(s)

Read `.buildkite/pipelines/evals/evals.suites.json` with the Read tool. Match the user's words
against each entry's `id` and `name`. Typical shorthand:

| User says                      | Suite ID                    |
| ------------------------------ | --------------------------- | ----------------- |
| obs ai, observability ai       | `observability-ai`          |
| sig events, significant events | `significant-events`        |
| nightshift                     | `nightshift-investigations` |
| attack discovery               | `attack-discovery`          |
| smoke, smoke tests             | `smoke-tests`               |
| agent builder                  | `agent-builder`             |
| esql, es                       | ql generation               | `esql-generation` |

Several suites in one build is fine: join IDs with commas (`agent-builder,observability-ai`).

If a name matches nothing or matches more than one entry, print the full `id` + `name` list
from the JSON and ask the user to pick before continuing.

## Step 3: Resolve branch

The pipeline can only build refs that exist in `elastic/kibana`. Branches on forks must be run
through their PR ref.

| User says                                | `--branch`                        |
| ---------------------------------------- | --------------------------------- |
| a branch name, including `main`          | that branch                       |
| PR 1234, #1234, a PR URL                 | `refs/pull/1234/head`             |
| nothing, my branch, this branch, this PR | current branch, resolved as below |

For the current branch:

```bash
git branch --show-current
gh pr view --repo elastic/kibana --json number,state
```

1. If there is an `OPEN` PR, use `refs/pull/<number>/head`.
2. Otherwise, check the branch exists upstream with
   `gh api repos/elastic/kibana/branches/<branch> --silent`. If it does, use the branch name.
3. Otherwise, stop and tell the user to open a PR or push the branch to `elastic/kibana`.

Remind the user that CI builds what is pushed, not local uncommitted or unpushed changes.

For PR refs, also pass `--commit HEAD`. A PR-ref run posts the triage summary as a PR comment.

## Step 4: Resolve models

Three sources of models exist. Pick based on what the user asked for.

### Default: no model mentioned

Omit `EVAL_MODEL_GROUPS` and all EIS flags. CI runs the suite against every OpenRouter model
available to the Buildkite API key. This is the safe default.

### EIS models

Read `.buildkite/pipelines/evals/evals.suites.json` and collect every unique value across all
suites' `weeklyEisModelGroups` and `defaultModelGroups` arrays. That set is the current list of
EIS model groups (format `eis/<provider>-<model>`). Match short names against it by suffix:

| User says             | Match rule                                             |
| --------------------- | ------------------------------------------------------ |
| haiku, claude haiku   | newest id ending in `-haiku`                           |
| sonnet, claude sonnet | newest id ending in `-sonnet`                          |
| opus, claude opus     | newest id ending in `-opus`                            |
| opus 4.6 / 4.7 / 4.8  | the id with that exact version                         |
| flash, gemini flash   | newest id ending in `-flash`                           |
| flash lite            | id ending in `-flash-lite`                             |
| gpt, gpt 5.4          | `eis/openai-gpt-5.4`                                   |
| gpt mini / gpt nano   | `eis/openai-gpt-5.4-mini` / `eis/openai-gpt-5.4-nano`  |
| luna / terra          | `eis/openai-gpt-5.6-luna` / `eis/openai-gpt-5.6-terra` |
| gpt oss               | `eis/openai-gpt-oss-120b`                              |

"Newest" means the highest version number among matching ids. If the user names a version that
is not in the list, show the matching ids and ask.

Whenever any `eis/...` entry is used, also set `EVAL_INCLUDE_EIS_MODELS=1`. Without it CI does
not generate EIS connectors and the run fails with "No connectors matched EVAL_MODEL_GROUPS".

### All models

"all", "all models", "every model", "all EIS": set `EVAL_INCLUDE_EIS_MODELS=1` and omit
`EVAL_MODEL_GROUPS`. CI runs OpenRouter plus every EIS model.

### OpenRouter models

If the user gives an OpenRouter id (`openrouter/<provider>/<model>`, e.g.
`openrouter/anthropic/claude-3-haiku`) or says "via openrouter", pass it through verbatim as an
`EVAL_MODEL_GROUPS` entry. Do not set `EVAL_INCLUDE_EIS_MODELS` for OpenRouter-only runs.

Availability cannot be checked locally: the OpenRouter key is a Buildkite secret. Tell the user
that CI validates the id against the key's entitlements and fails with the list of available
models if it does not match.

### Mixing

`EVAL_MODEL_GROUPS` accepts a comma-separated mix, e.g.
`eis/anthropic-claude-4.6-sonnet,openrouter/openai/gpt-4o`. Set `EVAL_INCLUDE_EIS_MODELS=1` if at
least one entry is `eis/...`.

### Judge

The judge is a **connector id**, not a model group. Resolve the judge model the same way as
above, then convert:

- EIS: `eis/<model>` → `eis-<model with every non [a-z0-9_-] char replaced by "-">`
  (`eis/anthropic-claude-4.5-haiku` → `eis-anthropic-claude-4-5-haiku`)
- OpenRouter: `openrouter/<provider>/<model>` → `openrouter-<provider>-<model slugified the same way>`
  (`openrouter/anthropic/claude-3-haiku` → `openrouter-anthropic-claude-3-haiku`)

Set the result as `EVAL_CONNECTOR_ID`. Omit the variable when the user did not ask for a judge;
CI uses its default. An EIS judge needs no extra flag, but combined with no `EVAL_MODEL_GROUPS`
it makes CI fan out over every EIS model too, so warn the user in that case.

## Step 5: Build the command

```bash
bk build create \
  --pipeline kibana-evals-on-demand-llm-evals \
  --branch "<resolved branch>" \
  --commit HEAD                     # only for refs/pull/<N>/head
  --message "On-demand evals: <suite ids>" \
  -e "EVAL_SUITE_ID=<suite ids>" \
  -e "EVAL_MODEL_GROUPS=<ids>"      # only when specific models were resolved
  -e "EVAL_INCLUDE_EIS_MODELS=1"    # only for "all models" or any eis/... model
  -e "EVAL_CONNECTOR_ID=<judge>"    # only when a judge was requested
  -e "EVAL_GREP=<pattern>"          # only when a grep was requested
  --web
```

Drop every flag whose condition is not met. Quote values that contain spaces.

## Step 6: Confirm

Show this summary, then ask "Trigger this build?" and wait for a clear yes.

```
About to trigger:

  Pipeline : kibana-evals-on-demand-llm-evals
  Branch   : main
  Suite(s) : significant-events
  Models   : eis/anthropic-claude-4.5-haiku
  Judge    : (CI default)
  EIS      : yes
  Grep     : (none)

  bk build create --pipeline kibana-evals-on-demand-llm-evals \
    --branch main \
    --message "On-demand evals: significant-events" \
    -e "EVAL_SUITE_ID=significant-events" \
    -e "EVAL_MODEL_GROUPS=eis/anthropic-claude-4.5-haiku" \
    -e "EVAL_INCLUDE_EIS_MODELS=1" \
    --web
```

If the user declines or wants changes, go back to the relevant step. Never fire without a yes.

## Step 7: Execute and report

Run the command. `--web` opens the build in the browser and `bk` prints the build URL to stdout.
Show the URL to the user.

## Notes

- Buildkite secrets (`KBN_EVALS_CONFIG_B64` for OpenRouter, `KIBANA_EIS_CCM_API_KEY` for EIS) are
  injected inside the CI step. The user never has them locally; do not check for them.
- `FTR_EIS_CCM=1` is set by the pipeline itself (`on_demand_evals.yml`); never pass it.
- The pipeline fans out one step per suite and then one step per connector, so multi-suite and
  multi-model runs cost no extra wall-clock beyond the slowest step.
- Slack notifications to suite owners only fire on `main`. Runs on other branches still work but
  stay quiet.
- Source of truth for suites and EIS ids: `.buildkite/pipelines/evals/evals.suites.json`.
  Pipeline entry: `.buildkite/scripts/steps/evals/on_demand.sh`.
