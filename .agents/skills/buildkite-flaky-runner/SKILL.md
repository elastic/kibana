---
name: buildkite-flaky-runner
description: Trigger Kibana flaky test runner Buildkite builds or generate its env vars/commands. Use whenever the user asks to run, rerun, compare, or prepare Kibana flaky test runner jobs for FTR or Scout configs, especially with PR URLs, refs/pull branches, repeat counts, RSPack optimizer, headless FTR args, main-vs-PR comparisons, or requests for Buildkite environment variables.
---

# Buildkite Flaky Runner

Trigger or prepare Kibana flaky test runner builds using the `bk` CLI.

Use this for execution and command/env generation. For diagnosing a flaky failure after a run exists, use `flaky-test-investigator` instead.

## Defaults

- Pipeline: `elastic/kibana-flaky-test-suite-runner`
- Pipeline file: `.buildkite/pipelines/flaky_tests/pipeline.sh`
- Preferred config env var: `KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1`
- Legacy config env var: `KIBANA_FLAKY_TEST_RUNNER_CONFIG`
- Max count per config entry: `50`
- Default concurrency: match the requested count unless the user asks otherwise.
- PR branch format: `refs/pull/<pr-number>/head`
- RSPack env var: `KBN_USE_RSPACK=true`

## Safety

- Creating a Buildkite build is an external side effect. If the user explicitly says to run, trigger, rerun, or do it, proceed. If they ask only for env vars or a command, do not trigger a build.
- Use `bk build create --yes --no-input` so the command works in non-interactive sessions.
- If `bk` returns a 401, tell the user the local CLI needs `BUILDKITE_API_TOKEN` or Buildkite authentication.
- Do not set `KBN_USE_RSPACK=true` unless the user asks for RSPack.
- For non-RSPack runs, omit `KBN_USE_RSPACK` entirely.
- If the user provides both a JSON count and a natural-language count, prefer the natural-language count when it is clear. Example: if JSON says `count:30` but the user says "50 times", use `count:50` and mention that choice in the progress update.

## Input Parsing

Convert PR URLs to Buildkite branches:

```text
https://github.com/elastic/kibana/pull/274878 -> refs/pull/274878/head
```

Use `main` when the user asks for the main branch.

Normalize config arguments by removing leading CLI flags:

```text
--config src/platform/test/functional/apps/visualize/config.ts -> src/platform/test/functional/apps/visualize/config.ts
--config=x-pack/platform/test/functional_with_es_ssl/apps/discover_ml/config.ts -> x-pack/platform/test/functional_with_es_ssl/apps/discover_ml/config.ts
```

Choose suite type from the requested config:

- Use `ftrConfig` for Kibana FTR configs.
- Use `scoutConfig` for Scout / Playwright configs.
- Do not use `command` unless the user specifically needs an arbitrary shell command; comment-trigger syntax does not support command entries.

## Config JSON Shapes

FTR config:

```json
[{"type":"ftrConfig","ftrConfig":"path/to/config.ts","count":50}]
```

FTR config with extra args:

```json
[{"type":"ftrConfig","ftrConfig":"path/to/config.ts","count":50,"ftrExtraArgs":"--headless"}]
```

Scout config:

```json
[{"type":"scoutConfig","scoutConfig":"path/to/playwright.config.ts","count":50}]
```

Multiple entries in one build are allowed when the user asks for variants that can share top-level env vars. Example: one normal FTR run and one headless FTR run can be a single build with two entries, where only the headless entry has `ftrExtraArgs`.

Use separate builds when top-level env vars differ, such as RSPack vs non-RSPack or PR vs `main`.

## Trigger Command

Use this shape for a single RSPack FTR run on a PR:

```sh
bk build create --yes --no-input \
  --pipeline elastic/kibana-flaky-test-suite-runner \
  --branch refs/pull/274878/head \
  --env 'KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1=[{"type":"ftrConfig","ftrConfig":"src/platform/test/functional/apps/dashboard_elements/links/config.ts","count":50}]' \
  --env 'KIBANA_FLAKY_TEST_CONCURRENCY=50' \
  --env 'KBN_USE_RSPACK=true' \
  --env 'UUID=dashboard-links-rspack-flaky-50-pr-274878' \
  --message 'Run dashboard links FTR flaky test 50x with RSPack on PR 274878'
```

For non-RSPack, omit the RSPack env:

```sh
bk build create --yes --no-input \
  --pipeline elastic/kibana-flaky-test-suite-runner \
  --branch refs/pull/274878/head \
  --env 'KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1=[{"type":"ftrConfig","ftrConfig":"src/platform/test/functional/apps/dashboard_elements/links/config.ts","count":50}]' \
  --env 'KIBANA_FLAKY_TEST_CONCURRENCY=50' \
  --env 'UUID=dashboard-links-webpack-flaky-50-pr-274878' \
  --message 'Run dashboard links FTR flaky test 50x without RSPack on PR 274878'
```

## UUID And Message

Use a stable, descriptive `UUID` because the pipeline uses it as the concurrency group.

Good patterns:

```text
<short-config-name>-rspack-flaky-50-pr-<pr-number>
<short-config-name>-webpack-flaky-50-pr-<pr-number>
<short-config-name>-rspack-flaky-50-main
```

Keep messages human-readable and include:

- config area
- count
- RSPack or without RSPack
- branch target, such as PR number or `main`

## Env Vars Only

When the user asks only for Buildkite UI environment variables, return this minimal set.

RSPack:

```sh
KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1=[{"type":"ftrConfig","ftrConfig":"path/to/config.ts","count":50}]
KIBANA_FLAKY_TEST_CONCURRENCY=50
KBN_USE_RSPACK=true
UUID=descriptive-rspack-flaky-50
```

Non-RSPack:

```sh
KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1=[{"type":"ftrConfig","ftrConfig":"path/to/config.ts","count":50}]
KIBANA_FLAKY_TEST_CONCURRENCY=50
UUID=descriptive-webpack-flaky-50
```

## GitHub PR Comment Trigger

The PR comment trigger supports this syntax:

```text
/flaky ftrConfig:path/to/config.ts:25
/flaky scoutConfig:path/to/playwright.config.ts:30
```

It does not support arbitrary extra top-level env vars like `KBN_USE_RSPACK=true`. Use Buildkite UI or `bk build create` when RSPack or other custom env vars are required.

## Reporting

After successful triggers, report each Buildkite URL and the key difference between builds.

Example:

```text
With KBN_USE_RSPACK=true, 50x:
https://buildkite.com/elastic/kibana-flaky-test-suite-runner/builds/12345

Without RSPack, 50x:
https://buildkite.com/elastic/kibana-flaky-test-suite-runner/builds/12346
```
