# Weekly CI Checklist

How a Security suite gets into the weekly run, and what to verify in a PR. Re-derive facts from the files; do not rely on this page for the current list of suites.

## How the weekly run is built

- `.buildkite/pipelines/evals/llm_evals.yml` defines one explicit step per weekly suite. Each runs `bash .buildkite/scripts/steps/evals/run_suite.sh` with `EVAL_SUITE_ID` and `EVAL_MODEL_GROUPS`.
- `.buildkite/pipelines/evals/evals.suites.json` registers the suite: `id`, `configPath`, `ciLabels`, and optionally `serverConfigSet`, `slackChannel`, `weeklyEisModelGroups`, `stepTimeoutInMinutes`, `shards`.
- `weeklyEisModelGroups` does not schedule anything. It only resolves the `models:weekly-eis-models` PR label for that suite, falling back to `DEFAULT_WEEKLY_EIS_MODELS` in `eval_pipeline.ts`. A suite is weekly only if `llm_evals.yml` has a step for it.
- `evals_suites_config.test.ts` checks that each `weeklyEisModelGroups` entry is covered by the suite step's `EVAL_MODEL_GROUPS`. It does not check that every suite has a step.
- `weekly_build_slack_summary.sh` posts failures to the suite's `slackChannel`. A suite without one has no failure destination.

## Step template

```yaml
- label: 'Evals: <Suite Name>'
  key: kbn-evals-weekly-<suite-id>
  command: bash .buildkite/scripts/steps/evals/run_suite.sh
  env:
    KBN_EVALS: '1'
    FTR_EIS_CCM: '1'
    EVAL_SUITE_ID: '<suite-id>'
    EVAL_FANOUT: '1'
    EVAL_INCLUDE_EIS_MODELS: '1'
    EVAL_MODEL_GROUPS: *weekly_eis_core_models
  timeout_in_minutes: 60
  agents:
    image: family/kibana-ubuntu-2404
    imageProject: elastic-images-prod
    provider: gcp
    machineType: n2-standard-8
    preemptible: true
  retry:
    automatic:
      - exit_status: '-1'
        limit: 3
```

## Checks for a PR

| Check | How to verify |
| --- | --- |
| Step exists | `grep "EVAL_SUITE_ID: '<id>'" .buildkite/pipelines/evals/llm_evals.yml` |
| Id matches | Step `EVAL_SUITE_ID` equals the `id` in `evals.suites.json` exactly |
| Models | `weeklyEisModelGroups`, when set, is a subset of the step's `EVAL_MODEL_GROUPS` |
| Slack | Suite entry has `slackChannel` |
| Server config | `serverConfigSet` is set when the suite needs a non-default Scout server config |
| Timeout | `timeout_in_minutes` covers dataset size times models, and the Playwright `timeout` covers one test. Long suites set `stepTimeoutInMinutes` |
| Config path | `configPath` points at an existing `playwright.config.ts` in the package root |

## Suites that are not weekly

Some Security suites have no weekly step. Treat a missing step on a new or changed suite as something to flag for a human decision, not as proof of a defect. Reasons to run outside weekly include PR-label-only suites, batch or reliability suites with long timeouts, and suites replaced by a newer version. Ask the author to state the intent.
