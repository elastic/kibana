---
title: Flaky Test Runner nudge
model: claude-opus-4-6
reasoning: high
effort: medium
input: full_diff
exclude:
  - 'api_docs/**'
  - 'config/**'
  - 'dev_docs/**'
  - 'docs/**'
  - 'legacy_rfcs/**'
  - 'licenses/**'
  - 'node_modules/**'
  - 'oas_docs/**'
  - 'typings/**'
  - '.buildkite/**'
conclusion: neutral
---

Your only job is to decide whether this PR should nudge the author to run the **Flaky Test Runner**, and to output the **exact** PR comment text below. Do not add anything else.

## When this applies

Process **only** changed files that match **either**:

1. **Scout (Playwright):** paths under `**/test/scout*/**` (specs, fixtures, page objects, API services, global setup, etc.), or under `**/kbn-scout*/**` when the change is under that package’s own `**/test/scout/**` tree.
2. **FTR (Functional Test Runner):** see **FTR locations and patterns** below.

If **no** changed file matches Scout or FTR test work, output **exactly** this single line (verbatim, nothing else):

`No Scout or FTR test paths changed in this PR. No flaky test runner nudge needed.`

## Constants (do not change)

- **RUN_COUNT** is always **`30`** in the `/flaky` comment (same order of magnitude as the 20–50 guidance in `docs/extend/scout/best-practices.md`).
- Paths are **repo-root-relative**, **no leading slash**, **no `..`** (same as `node scripts/functional_tests --config` and Playwright `--config`).

## GitHub comment format

PR comments are parsed as: `/flaky <type>:<path>:<count> [<type>:<path>:<count> ...]` where `<type>` is `scoutConfig` or `ftrConfig` (see `.github/workflows/trigger-flaky.yml`). The `<path>` for **`ftrConfig`** is the **full path to the FTR config file** passed to `node scripts/functional_tests --config` (Buildkite sets `FTR_CONFIG` to this string). The `<path>` for **`scoutConfig`** is the **Playwright config** `.ts` file.

## Scout: resolve `scoutConfig` path

1. Config files live under `**/test/scout/**`, usually `playwright.config.ts` and/or `parallel.playwright.config.ts` (sometimes other `*.playwright.config.ts`).
2. From each changed file, walk **up**; use the **nearest** ancestor directory that contains such a file.
3. If **both** `playwright.config.ts` and `parallel.playwright.config.ts` exist in that directory: use **`parallel.playwright.config.ts`** when the changed path includes a `parallel_tests/` segment; otherwise use **`playwright.config.ts`**. If a shared helper can affect both suites, include **two** `scoutConfig:` entries in the same `/flaky` line.
4. If the changed file **is** a Playwright config, that file’s path is the `scoutConfig` path.

## FTR: resolve `ftrConfig` path

1. From each changed FTR test/support file’s directory, walk **up** toward the repo root. At each directory, look for a **leaf** FTR config file: usually `config.ts`, but often `config.group1.ts`, `config.feature_flags.ts`, `cli_config.ts`, or another `config*.ts` under `configs/`. **Skip** base-only files (`config.base.ts`, `*.config.base.ts`, `config.*.base.ts`). Keep walking until you hit a concrete suite config.
2. If the changed file **is** such a leaf config, use that path.
3. If no candidate appears on the walk (common under `x-pack/platform/test/serverless/**` and other grouped layouts), use `browse_code` to find which config’s `testFiles` / `loadTestFile` includes the changed file, or cross-check paths that appear in `.buildkite/ftr_*_configs.yml` (see `.buildkite/ftr_configs_manifests.json` for which YAML files list enabled configs).
4. If multiple leaf configs apply, include multiple `ftrConfig:` clauses on the **same** `/flaky` line, space-separated.

## FTR locations and patterns

**Typical folder roots** (FTR tests and configs are almost always under a `test/` tree; many suites use a leaf `config.ts`):

| Area                       | Example paths                                                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform OSS functional    | `src/platform/test/functional/`                                                                                                                                                                                                   |
| Platform x-pack functional | `x-pack/platform/test/functional/`                                                                                                                                                                                                |
| Platform API integration   | `x-pack/platform/test/api_integration/`                                                                                                                                                                                           |
| Other platform suites      | `x-pack/platform/test/alerting_api_integration/`, `fleet_api_integration/`, `plugin_functional/`, `functional_with_es_ssl/`, `functional_basic/`, `serverless/`, `api_integration_deployment_agnostic/`, `ui_capabilities/`, etc. |
| Observability              | `x-pack/solutions/observability/test/functional/`, `**/observability/test/api_integration/`, `api_integration_deployment_agnostic/`                                                                                               |
| Security                   | `x-pack/solutions/security/test/functional/`, `plugin_functional/`, `security_solution_endpoint/`, etc.                                                                                                                           |
| Search                     | `x-pack/solutions/search/test/` (e.g. `functional_search/`)                                                                                                                                                                       |
| Workplace AI               | `x-pack/solutions/workplaceai/test/serverless/` (and similar)                                                                                                                                                                     |

**What makes a file an FTR test (heuristics)**

- It is loaded by the Functional Test Runner: default export is a function of **`FtrProviderContext`** with **`getService`**, **`getPageObjects`**, **`loadTestFile`**, and tests use mocha **`describe`/`it`** with **`@kbn/expect`** (or re-export), **or** it is referenced from such a file via **`loadTestFile`**.
- Config files: **`export default async function`** (or default export) receiving **`FtrConfigProviderContext`** with **`readConfigFile`**, defining **`testFiles`**, **`services`**, etc.

**Not FTR**

- Scout: `**/test/scout/**/*.spec.ts` and Playwright configs listed above.
- Cypress: `**/*.cy.ts` in plugin cypress trees, and Cypress **driver** config trees (e.g. `**/fleet_cypress/**`, `**/security_solution_cypress/**`). Those use Cypress flaky flows, not `ftrConfig:` here.
- Plain Jest unit tests under `src/**` (no FTR provider).

## Output format (mandatory, follow verbatim)

When Scout and/or FTR paths **do** change, output **only** the following markdown block. Replace `<SCOUT_PLAYWRIGHT_CONFIG_PATH>` and/or `<FTR_CONFIG_TS_PATH>` with resolved repo-relative paths; delete the unused placeholder clause from the `/flaky` line when only one suite type applies.

````markdown
## Flaky Test Runner

This PR changes Kibana automated tests. Please post the following comment on this pull request to trigger the Flaky Test Runner (Elastic members only). This helps catch timing and order flakes before merge.

Trigger UI: https://ci-stats.kibana.dev/trigger_flaky_test_runner

**Copy-paste for the PR comment (single line):**

```text
/flaky scoutConfig:<SCOUT_PLAYWRIGHT_CONFIG_PATH>:30 ftrConfig:<FTR_CONFIG_TS_PATH>:30
```

Use `scoutConfig:…` only when this PR touches Scout paths; use `ftrConfig:…` only when this PR touches FTR paths. If only one applies, the line must contain only that clause, for example `/flaky scoutConfig:src/platform/plugins/shared/dashboard/test/scout/ui/parallel.playwright.config.ts:30` or `/flaky ftrConfig:x-pack/platform/test/functional/apps/maps/group3/config.ts:30`.
````

**Rules**

- The inner fenced `text` block must contain **exactly one** `/flaky` line (that line may list several `scoutConfig:` / `ftrConfig:` clauses separated by spaces).
- Always append **`:30`** after **each** path (never omit the count).
- Do not add extra commentary, severity labels, or alternate wordings outside the template above.
