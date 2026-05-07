---
name: flaky-test-resolver
description: "Automates the end-to-end pipeline for resolving Kibana flaky test issues: accepts a GitHub issue number/URL or a Buildkite build URL, extracts test metadata, fixes the root cause, validates locally with --repeatEach 50 (Scout only), creates a draft PR, and triggers the CI flaky test runner. Works for both Scout (Playwright) and FTR tests."
---

# Flaky Test Resolver

## Trigger

When the user provides either:

- A GitHub issue number or URL (e.g., "fix the flaky test in issue #12345")
- A Buildkite build URL (e.g., `https://buildkite.com/elastic/kibana/builds/12345` or with a job anchor `#<job-id>`)

## Prerequisites

Confirm `gh` is authenticated: `gh auth status`

If the input is a Buildkite URL, also check for a Buildkite API token:

```bash
echo "${BUILDKITE_API_TOKEN:-missing}"
```

If missing, ask the user:

> _"Please provide your Buildkite API token. You can create one at https://buildkite.com/user/api-access-tokens with `read_builds` and `read_artifacts` scopes."_

```bash
export BUILDKITE_API_TOKEN=<token>
```

---

## Step 1 — Fetch and extract test metadata

The goal of this step is to populate four values used by all subsequent steps:

- `TEST_NAME` — full name of the failing test
- `TEST_FILE` — relative path to the test file from the kibana root
- `CONFIG_PATH` — relative path to the test config file
- `TEST_TYPE` — `scout` or `ftr`

### Path A — GitHub issue

```bash
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,labels
```

Extract the **structured metadata** from the `kibanaCiData` HTML comment at the bottom of the body:

```
<!-- kibanaCiData = {"failed-test":{"test.class":"...","test.name":"<full test name>","test.failCount":N,"test.type":"scout"|"ftr"}} -->
```

The `test.class` format differs by test type — check `test.type` first (if present):

**Scout issues** — `test.class` is just the suite name (e.g. `"MonitorDetails"`), no file path. Instead, read the structured table in the issue body for the file path and config path:

```
| Location | x-pack/path/to/test.spec.ts |
| Config path | x-pack/path/to/playwright.config.ts |
```

Use those values directly; skip the `test.class` path-derivation below.

**FTR issues** — `test.class` encodes the file path:
`<CI Suite Name>.<file/path/to/test·ts>` — the file path uses `·` (middle dot U+00B7) as the final `.` before the extension.

Derive the test file path by:

1. Taking everything after the first `.` (the file path portion)
2. Replacing the trailing `·ts` with `.ts` (and `·js` with `.js`)

Example:
`Chrome X-Pack UI Functional Tests - My Suite.x-pack/platform/test/functional/apps/my_test·ts`
→ file: `x-pack/platform/test/functional/apps/my_test.ts`

Set `ISSUE_NUMBER` to the issue number. Proceed to Step 2.

---

### Path B — Buildkite URL

Supported URL formats:

```
https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>
https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>/steps/<STEP_NAME>
https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>/steps/<STEP_NAME>?sid=<JOB_ID>&tab=output
https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>#<JOB_ID>
```

Parse the URL to extract `PIPELINE`, `BUILD_NUMBER`, and optionally:

- `JOB_ID` from the `sid` query parameter (most specific — use this directly if present)
- `STEP_NAME` from `/steps/<step>` (use to match by job name if no `sid`)
- `JOB_ID` from `#<anchor>` (fallback)

#### Fetch the build and find the failing job

```bash
curl -s "https://api.buildkite.com/v2/organizations/elastic/pipelines/<PIPELINE>/builds/<BUILD_NUMBER>" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  | jq '.jobs[] | select(.state == "failed") | {id, name, exit_status}'
```

- If `sid` query param is present → use it as `JOB_ID` directly
- Else if `STEP_NAME` was in the URL → match the job whose `name` contains `<STEP_NAME>` (case-insensitive)
- Else if `JOB_ID` was in the URL anchor → use that job directly
- Else → pick the first failed job, or ask the user if there are multiple failures

#### Fetch the job log

```bash
curl -s "https://api.buildkite.com/v2/organizations/elastic/pipelines/<PIPELINE>/builds/<BUILD_NUMBER>/jobs/<JOB_ID>/log" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  | jq -r '.content'
```

#### Extract metadata from the log

**Scout log pattern:**

```
✘ [chromium] › x-pack/path/to/test.spec.ts:42:3 › Suite Name › test name
```

→ `TEST_FILE` = path before the line number, `TEST_NAME` = text after the last `›`, `TEST_TYPE` = `scout`

**FTR log pattern:**

```
  1) Suite Name "test name"
     at Context.<anonymous> (x-pack/path/to/test.ts:123:45)
```

→ `TEST_FILE` = path in the stack frame, `TEST_NAME` = quoted string, `TEST_TYPE` = `ftr`

Also check the build annotations for a structured summary — they often contain cleaner test failure details:

```bash
curl -s "https://api.buildkite.com/v2/organizations/elastic/pipelines/<PIPELINE>/builds/<BUILD_NUMBER>/annotations" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  | jq '.[] | {context, body_text}'
```

Set `ISSUE_NUMBER` to `bk-<BUILD_NUMBER>` (used for branch naming and commit messages — there is no GitHub issue to reference). Proceed to Step 2.

---

## Step 2 — Identify test type

| Signal                                                                          | Type                           |
| ------------------------------------------------------------------------------- | ------------------------------ |
| `selenium-webdriver` in stack trace, FTR services (`retry.try`, `testSubjects`) | **FTR**                        |
| Playwright-style stack trace, `@kbn/scout`, `test/scout*/` in path              | **Scout**                      |
| `jest.fn()`, `@testing-library`, `*.test.ts` path                               | **Jest** (out of scope — stop) |

---

## Step 3 — Find the config path

### Scout

Walk up from the test file to find the nearest `playwright.config.ts`:

```bash
find $(dirname <test-file>) -maxdepth 3 -name "playwright.config.ts" | head -5
find $(dirname <test-file>) -maxdepth 3 -name "parallel.playwright.config.ts" | head -5
```

Typically at `<module>/test/scout<variant>/ui/playwright.config.ts`. Use `parallel.playwright.config.ts` if the test lives under `parallel_tests/`.

### FTR

Search for the config that covers the test directory:

```bash
TESTDIR=$(dirname <test-file-path>)
grep -rl "$TESTDIR" x-pack --include="config*.ts" | grep "test/" | head -5
grep -rl "$(basename <test-file-path>)" .buildkite/ftr_*_configs.yml
```

**Always verify the config path exists before using it** — directory name typos are a common source of silent CI failures (e.g. `api_integration/deployment_agnostic` vs `api_integration_deployment_agnostic`):

```bash
test -f <config-path> && echo "found" || echo "NOT FOUND — check the path"
```

Do not proceed to Step 7 or Step 10 with a config path that does not exist on disk.

---

## Step 4 — Read and analyze the test

```bash
cat <test-file-path>
```

Locate the specific failing test (`test.name`). Understand what it asserts and what in the error message points to the flakiness cause.

---

## Step 5 — Fix the flakiness

Never skip, comment out, or suppress the test. Fix the root cause.

### Scout (Playwright) fixes

| Anti-pattern                             | Fix                                                         |
| ---------------------------------------- | ----------------------------------------------------------- |
| `page.waitForTimeout(N)`                 | `await expect(locator).toBeVisible()` / `toHaveText()`      |
| Polling in a sleep loop                  | `await expect.poll(() => ..., { timeout: N })`              |
| Asserting count immediately after action | `await expect(locator).toHaveCount(N)` (auto-retries)       |
| Race on navigation                       | Wait for a specific element that confirms the page is ready |
| `page.waitForLoadState('networkidle')`   | Wait for a specific visible element instead                 |
| Missing `afterEach` cleanup              | Add cleanup to restore state for the next test              |

### FTR (Mocha/Selenium) fixes

| Anti-pattern                           | Fix                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `browser.sleep(N)`                     | `retry.try(async () => { ... })` from the `retry` service                          |
| `testSubjects.find(...)` without retry | `testSubjects.existOrFail(...)`                                                    |
| Waiting for URL with sleep             | `retry.waitFor('desc', async () => (await browser.getCurrentUrl()).includes('x'))` |
| State leakage between tests            | Add `before`/`after` hooks that reset saved objects / UI settings                  |

---

## Step 6 — Verify the fix compiles

```bash
node scripts/eslint --fix <test-file-path>
node scripts/type_check --project <nearest-tsconfig.json>
node scripts/check_changes.ts
```

Find the nearest `tsconfig.json` by walking up from the test file directory.

---

## Step 7 — Local validation

### Scout

**Ask the user before running:** _"Do you want to validate the fix locally by running the test 50 times? This takes several minutes but gives high confidence before opening a PR."_

- If **yes** → run and evaluate results (see below)
- If **no** → proceed to Step 8

```bash
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --config <playwright-config-path> \
  --repeatEach 50
```

- If all 50 pass → proceed to Step 8
- If any fail → analyze the new failure, revise the fix, re-run (max 3 attempts total)
- After 3 failed local attempts → stop and tell the user the root cause is unclear; do not create a PR

### FTR

There is no `--repeatEach` equivalent. Run a targeted smoke-run against both stateful and serverless configs to catch syntax/runtime errors before pushing:

```bash
# Stateful
node scripts/functional_tests \
  --config <stateful-config-path> \
  --grep '<test.name>'

# Serverless
node scripts/functional_tests \
  --config <serverless-config-path> \
  --grep '<test.name>'
```

- If both pass → proceed to Step 8
- If either fails → analyze the failure, revise the fix, re-run (max 3 attempts total)
- After 3 failed attempts → stop and tell the user the root cause is unclear; do not create a PR

---

## Step 8 — Create branch and commit

```bash
git checkout main && git pull upstream main
git checkout -b fix/flaky-<ISSUE_NUMBER>-<short-test-slug>

git add <test-file-path>
git commit -m "$(cat <<'EOF'
fix flaky test: <short description>

<If ISSUE_NUMBER is a GitHub issue number: "Fixes #<ISSUE_NUMBER>">
<If ISSUE_NUMBER is bk-<BUILD_NUMBER>: "Ref: https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>">

Root cause: <one sentence>
Fix: <one sentence>
EOF
)"

git push origin fix/flaky-<ISSUE_NUMBER>-<short-test-slug>
```

---

## Step 9 — Create or update the draft PR

First check if a PR already exists for this branch:

```bash
gh pr list --repo elastic/kibana --head "$(git branch --show-current)" --json number,url
```

If a PR **already exists** → skip creation, use the existing PR number.

If **no PR exists** → create one. Most contributors work from a fork, so include `--head`:

```bash
FORK_USER=$(gh api user --jq .login)
PR_URL=$(gh pr create \
  --repo elastic/kibana \
  --head "${FORK_USER}:<branch-name>" \
  --title "fix flaky test: <short description>" \
  --body "$(cat <<'EOF'
## Summary

<If from GitHub issue: "Fixes the flaky test reported in #<ISSUE_NUMBER>.">
<If from Buildkite: "Fixes a flaky test identified in Buildkite build https://buildkite.com/elastic/<PIPELINE>/builds/<BUILD_NUMBER>.">

**Root cause:** <explanation>
**Fix:** <explanation>

**Test type:** Scout / FTR
**Test file:** `<test-file-path>`
**Config:** `<config-path>`

## Validation

- [<LOCAL_VALIDATION>] Local validation (50 × `--repeatEach`, Scout only) — replace `<LOCAL_VALIDATION>` with `x` if run, ` ` if skipped
- [ ] CI flaky test runner (triggered below)
EOF
)" \
  --draft \
  --label "auto-flaky-fix")
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
```

If the `auto-flaky-fix` label does not exist:

```bash
gh label create "auto-flaky-fix" \
  --repo elastic/kibana \
  --description "Automated PR created by flaky-test-resolver agent" \
  --color "e4e669"
```

---

## Step 10 — Trigger the CI flaky test runner

**Scout:**

```bash
gh pr comment "$PR_NUMBER" --repo elastic/kibana \
  --body "/flaky scoutConfig:<config-path>:100"
```

**FTR:** trigger once per config — stateful and serverless separately:

```bash
# Stateful
gh pr comment "$PR_NUMBER" --repo elastic/kibana \
  --body "/flaky ftrConfig:<stateful-config-path>:100"

# Serverless (find the matching serverless config in the same directory)
gh pr comment "$PR_NUMBER" --repo elastic/kibana \
  --body "/flaky ftrConfig:<serverless-config-path>:100"
```

To find the serverless config, look for a sibling config in the same `configs/` directory. Example: if the stateful config is `x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts`, check for a corresponding file under `configs/serverless/`.

Config path rules: relative to kibana root, no leading `./` or `/`, no `..`, no trailing `/`.

---

## Step 11 — Monitor options

Present the user with three options:

**A — Watch live** (blocks until CI finishes):

```bash
gh pr checks <PR_NUMBER> --repo elastic/kibana --watch
```

**B — Background polling** (non-blocking, notifies every 10 min):

> Use `/loop 10m` to periodically check: `gh pr checks <PR_NUMBER> --repo elastic/kibana`

**C — Manual** — the user checks the PR on GitHub when convenient and marks it ready for review themselves.

---

## References

- Scout testing patterns: `../scout-ui-testing/SKILL.md`
- FTR testing patterns: `../ftr-testing/SKILL.md`
- Flaky runner trigger workflow: `.github/workflows/trigger-flaky.yml`
