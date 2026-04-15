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

Decide whether this PR should nudge the author to run the **Flaky Test Runner**. That takes two steps: (1) paths in scope, (2) changes that could realistically affect flakiness (see **When to nudge**). When a nudge applies, output **only** the markdown block in **Output format** below. When it does not apply, leave no comment on the PR.

## When this applies (paths)

Consider changed files under **either**:

1. **Scout (Playwright):** `**/test/scout*/**` (specs, fixtures, page objects, API services, global setup, etc.), or `**/kbn-scout*/**` only when the change is under that package’s own `**/test/scout/**` tree.
2. **FTR (Functional Test Runner):** see **FTR locations and patterns** below.

If **nothing** in the diff falls in those trees, **stop** (no comment).

## When to nudge (substance)

Path match alone is not enough. **Nudge** only when at least one in-scope change could affect timing, execution, or stability. **Skip** when edits are unlikely to do that.

**Usually worth a nudge**

- Any change to **Playwright or FTR config** (`playwright.config.ts`, `parallel.playwright.config.ts`, leaf FTR `config*.ts`, `testFiles`, workers, hooks).
- **Test body or helper logic**: assertions, `expect`, selectors/locators, `data-test-subj`, navigation, clicks/typing, API calls, payloads, retries, `waitFor`, timeouts, `test.step`, conditional flow, loops.
- **Fixtures / services / page objects** used by tests: setup/teardown, archives, `before`/`after`, shared waits or navigation.
- **New, removed, skipped, or materially rewritten** tests.

**Often skip (no nudge)**

- **Comments only**, or docblocks that do not change behavior.
- **Pure formatting** or import reorder with no runtime effect.
- **Trivial copy** in descriptions or titles that does not touch selectors, routes, or assertions (use judgment; renames of user-visible strings tied to `getBy*` may still matter).

If a PR touches **both** Scout and FTR paths, judge **each runner separately**. Include a `scoutConfig:` nudge only if Scout-side changes qualify; include `ftrConfig:` only if FTR-side changes qualify. If **neither** side qualifies, **stop** (no comment). If **both** qualify, give **two** separate `/flaky` commands (one **Scout** line and one **FTR** line), each in its **own** PR comment (see **GitHub comment format**).

## Constants (do not change)

- **RUN_COUNT** is always **`30`** in the `/flaky` comment.
- Paths are **repo-root-relative**, **no leading slash**, **no `..`**

## GitHub comment format

Each PR comment body must start with **`/flaky `** followed by **exactly one** clause: `<kind>:<path>:<count>` (for example `/flaky scoutConfig:path/to/playwright.config.ts:30`). The workflow runs **per comment**, so **do not** put Scout and FTR in the same comment. If you need **both** runners, post **two** comments on the PR: first `/flaky` line in one comment, second `/flaky` line in another.

**Why not a generic `type`?** The GitHub workflow (`.github/workflows/trigger-flaky.yml`) only recognizes the **exact** tokens **`scoutConfig`** and **`ftrConfig`**. They select which CI job runs (Scout/Playwright vs FTR). Replace placeholders with those literals, not the word `type`.

- **`scoutConfig`:** path to the **Playwright** config `.ts` file.
- **`ftrConfig`:** path to the **FTR** leaf config `.ts` file passed to `node scripts/functional_tests --config`.

**Examples:**

Scout only (one comment):

```
/flaky scoutConfig:src/platform/plugins/shared/dashboard/test/scout/ui/parallel.playwright.config.ts:30
```

FTR only (one comment):

```
/flaky ftrConfig:src/platform/test/functional/apps/visualize/group10/config.ts:30
```

Both Scout and FTR (two separate comments on the PR):

```
/flaky scoutConfig:src/platform/plugins/shared/dashboard/test/scout/ui/parallel.playwright.config.ts:30
```

```
/flaky ftrConfig:src/platform/test/functional/apps/visualize/group10/config.ts:30
```

## Scout: resolve `scoutConfig` path

1. Config files live under `**/test/scout/**`, usually `playwright.config.ts` and/or `parallel.playwright.config.ts` (sometimes other `*.playwright.config.ts`).
2. From each changed file, walk **up**; use the **nearest** ancestor directory that contains such a file.
3. If **both** `playwright.config.ts` and `parallel.playwright.config.ts` exist in that directory: use **`parallel.playwright.config.ts`** when the changed path includes a `parallel_tests/` segment; otherwise use **`playwright.config.ts`**. If a shared helper can affect both suites, give **two** `/flaky` comments (each with one `scoutConfig:`), one per Playwright config.
4. If the changed file **is** a Playwright config, that file’s path is the `scoutConfig` path.

## FTR: resolve `ftrConfig` path

1. From each changed FTR test/support file’s directory, walk **up** toward the repo root. At each directory, look for a **leaf** FTR config file: usually `config.ts`, but often `config.group1.ts`, `config.feature_flags.ts`, `cli_config.ts`, or another `config*.ts` under `configs/`. **Skip** base-only files (`config.base.ts`, `*.config.base.ts`, `config.*.base.ts`). Keep walking until you hit a concrete suite config.
2. If the changed file **is** such a leaf config, use that path.
3. If no candidate appears on the walk (common under `x-pack/platform/test/serverless/**` and other grouped layouts), use `browse_code` to find which config’s `testFiles` / `loadTestFile` includes the changed file, or cross-check paths that appear in `.buildkite/ftr_*_configs.yml` (see `.buildkite/ftr_configs_manifests.json` for which YAML files list enabled configs).
4. If multiple leaf configs apply, use **one** `/flaky` PR comment per config (each comment: `/flaky ftrConfig:<that-config.ts>:30`).

## FTR locations and patterns

**Where FTR tests live** (prefixes, repo-relative):

- `src/platform/test/**`
- `x-pack/platform/test/**`
- `x-pack/solutions/<solution>/test/**` (`<solution>` examples: `observability`, `security`, `search`, `workplaceai`)
- `x-pack/platform/test/serverless/**`
- `x-pack/solutions/<solution>/test/serverless/**`

**Recognize FTR:** mocha suites with **`FtrProviderContext`** (`getService`, `loadTestFile`, …), **`@kbn/expect`**, or leaf **`config*.ts`** used by `node scripts/functional_tests --config`.

**Not FTR:** Scout (`**/test/scout/**`), Cypress (`*.cy.ts` and `*cypress*` driver trees), plain Jest units without FTR.

## Output format (follow verbatim)

When a nudge is warranted per **When to nudge (substance)**, output **only** the following markdown block (wording is fixed; you resolve paths). Include **`scoutConfig`** lines only for qualifying Scout changes; **`ftrConfig`** lines only for qualifying FTR changes. Replace `<KIND>` / `<CONFIG_PATH>` with literals and real paths (see **GitHub comment format**).

If **one** runner qualifies, use **one** ```text``` block with a **single** `/flaky` line. If **both** qualify, use **two** ```text``` blocks in a row (Scout first, then FTR), each block containing **one** `/flaky` line. The author must post each block as a **separate** PR comment.

````markdown
## Run the Flaky Test Runner (recommended)

**Recommended before merge**: run the flaky test runner against this PR to catch flakiness early.

**Two ways to run it:**

1. Open the [Flaky Test Runner UI](https://ci-stats.kibana.dev/trigger_flaky_test_runner) or
2. Post each `/flaky` line below as its **own** comment on this PR (one trigger per comment):

```text
/flaky <KIND>:<CONFIG_PATH>:30
```

`<KIND>` must be the literal token `scoutConfig` or `ftrConfig`. `<CONFIG_PATH>` is the repo-relative config for that runner. If both runners qualify, add a **second** ```text``` block with the other kind (two comments total).
````

**Rules**

- Each ```text``` fence must contain **exactly one** `/flaky` line (one `scoutConfig:` **or** one `ftrConfig:` clause, never both in the same fence).
- If both runners qualify, output **two** ```text``` blocks (two separate paste targets for two PR comments).
- Always append **`:30`** after **each** path (never omit the count).
- Do not rephrase the heading, recommendation, or two-way instructions; do not add severity labels or extra sections.
- The `/flaky` lines you show must be **fully resolved** (no literal `<KIND>` or `<CONFIG_PATH>` left in what you publish).
- Never invent a second command for a runner that did not qualify.
