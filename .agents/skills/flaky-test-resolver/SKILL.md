---
name: flaky-test-resolver
description: "Automates the end-to-end pipeline for resolving Kibana flaky test issues: parses the GitHub issue, identifies and fixes the root cause of flakiness, validates Scout fixes locally with --repeatEach 50 and optionally against MKI, then creates a draft PR and triggers the CI flaky test runner. Works for both Scout (Playwright) and FTR tests."
---

# Flaky Test Resolver

## Trigger
When the user provides a flaky test GitHub issue number or URL (e.g., "fix the flaky test in issue #12345", "resolve https://github.com/elastic/kibana/issues/12345").

## Prerequisites
Confirm `gh` is authenticated: `gh auth status`

---

## Step 1 — Fetch and parse the issue

```bash
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,labels
```

Extract the **structured metadata** from the `kibanaCiData` HTML comment at the bottom of the body:

```
<!-- kibanaCiData = {"failed-test":{"test.class":"<suite>.<file·path>","test.name":"<full test name>","test.failCount":N}} -->
```

Key fields:
- `test.class`: `<CI Suite Name>.<file/path/to/test·ts>` — the file path uses `·` (middle dot U+00B7) as the final `.` before the extension
- `test.name`: the full test name (suite + test title)
- `test.failCount`: how many times it has failed

**Derive the test file path** from `test.class` by:
1. Taking everything after the first `.` (the file path portion)
2. Replacing the trailing `·ts` with `.ts` (and `·js` with `.js`)

Example: `Chrome X-Pack UI Functional Tests with ES SSL - Embeddable Alerts Table.x-pack/platform/test/functional_with_es_ssl/apps/embeddable_alerts_table/embeddable_alerts_table·ts`
→ file: `x-pack/platform/test/functional_with_es_ssl/apps/embeddable_alerts_table/embeddable_alerts_table.ts`

---

## Step 2 — Identify test type

| Signal | Type |
|--------|------|
| `selenium-webdriver` in stack trace, FTR services (`retry.try`, `testSubjects`) | **FTR** |
| Playwright-style stack trace, `@kbn/scout`, `test/scout*/` in path | **Scout** |
| `jest.fn()`, `@testing-library`, `*.test.ts` path | **Jest** (out of scope — skip) |

FTR CI suite names include: "Functional Tests", "Chrome X-Pack UI", "Serverless".
Scout CI suite names include: "Scout", "Playwright".

---

## Step 3 — Find the config path

### For Scout tests
Walk up from the test file to find the nearest `playwright.config.ts`:
```bash
find $(dirname <test-file>) -maxdepth 3 -name "playwright.config.ts" | head -5
# Also check for parallel config if the test lives in parallel_tests/
find $(dirname <test-file>) -maxdepth 3 -name "parallel.playwright.config.ts" | head -5
```
The config is typically at `<module-root>/test/scout<variant>/ui/playwright.config.ts` (sequential) or `parallel.playwright.config.ts` (parallel).

### For FTR tests
Search for the config file that includes this test directory:
```bash
TESTDIR=$(dirname <test-file-path>)
grep -rl "$TESTDIR" x-pack --include="config*.ts" | grep -E "test/" | head -5
# Confirm it's enabled in CI
grep -rl "$(basename $TESTDIR)" .buildkite/ftr_*_configs.yml
```
The config is usually `config.ts` or `config.base.ts` in the parent `test/<suite>/` directory.

---

## Step 4 — Read and analyze the test

```bash
cat <test-file-path>
```

Read the full test file. Look for the specific failing test (`test.name` from the issue). Understand:
1. What the test asserts
2. What could cause non-determinism
3. The exact error from the issue body (timeout? element not found? race condition?)

---

## Step 5 — Fix the flakiness

Never skip or comment out the test. Fix the root cause.

### Scout (Playwright) fixes

| Anti-pattern | Fix |
|---|---|
| `page.waitForTimeout(N)` | Replace with `await expect(locator).toBeVisible()` or `await expect(locator).toHaveText(...)` |
| Polling in a sleep loop | Use `await expect.poll(() => ..., { timeout: N })` |
| Asserting count immediately after action | Use `await expect(locator).toHaveCount(N)` (auto-retries) |
| CSS/text selectors | Add `data-test-subj` attribute + use `page.testSubj.locator(...)` |
| Missing `afterEach` cleanup | Add cleanup to restore state for the next test |
| Race on navigation | Wait for a specific element that signals the page is ready (not a timeout) |
| `page.waitForLoadState('networkidle')` | Wait for a specific element instead — network idle is unreliable |

**Use Playwright auto-waiting**: `expect(locator).toBeVisible()`, `toHaveText()`, `toHaveCount()` all retry automatically until timeout.

### FTR (Mocha/Selenium) fixes

| Anti-pattern | Fix |
|---|---|
| `browser.sleep(N)` / bare `setTimeout` | Use `retry.try(async () => { ... })` from the `retry` service |
| `testSubjects.find(...)` without retry | Use `testSubjects.existOrFail(...)` which retries by default |
| Waiting for URL change with sleep | Use `retry.waitFor('description', async () => { const url = await browser.getCurrentUrl(); return url.includes('expected'); })` |
| Fixed-timeout `waitForVisualization` | Wrap in `retry.try` or increase the `waitFor` timeout with a meaningful message |
| State leakage from prior test | Add `before`/`after` hooks that reset state (delete saved objects, clear UI settings) |
| Hardcoded index/data assumption | Use `esArchiver` to load a known fixture |

---

## Step 6 — Validate locally with --repeatEach 50 (Scout only)

> **FTR tests**: skip this step entirely — there is no local repeat equivalent. Proceed to Step 7.

Validate the fix locally before creating a PR. This is the primary quality gate.

**Prerequisite:** Kibana must be running locally. If it is not, stop and ask the user to start it before continuing.

Run only the specific failing test file, repeated 50 times:

```bash
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --testFiles <test-file-path> \
  --repeatEach 50
```

> `--config` and `--testFiles` are mutually exclusive — use `--testFiles` to target a specific file.

### Outcome A — all 50 pass ✅
Proceed to Step 7.

### Outcome B — any run fails ❌
Do **not** proceed. Instead:
1. Analyse the failure output — understand what is still flaky
2. Revise the fix (apply a different approach from the Step 5 patterns)
3. Lint: `node scripts/eslint --fix <test-file-path>`
4. Re-run the 50-repeat command

Repeat up to **3 attempts total**. If the test is still failing after attempt 3, stop and tell the user:
- What was tried in each attempt and why it didn't work
- Your best hypothesis for the root cause
- Suggested next steps for manual investigation

Do **not** create a branch or PR if local validation never passed.

---

## Step 6b — Validate against ECH / MKI (optional)

Ask the user: *"Do you want to validate the fix against a cloud environment (ECH or MKI) before creating the PR?"*

Also run this step automatically (without asking) if the test is cloud-specific — indicated by a `mki_` filename prefix, a `skipMKI` tag, or a path containing `mki_only` or `serverless`.

> **Note:** `--repeatEach` is not supported for cloud runs. The test runs once per target. Multi-run validation is handled by the CI flaky runner in Step 10.

Use this table to decide which target applies:

| Target | Architecture | When to use |
|--------|-------------|-------------|
| **ECH** | Stateful | Test path is stateful, tags contain `@cloud-stateful-*` |
| **MKI** | Serverless | Test path is serverless, tags contain `@cloud-serverless-*`, or test is MKI-specific |
| **Both** | — | User explicitly requests both, or test runs on both architectures |

---

### Scout + ECH

Check the config file exists:
```bash
test -f .scout/servers/cloud_ech.json && echo "found" || echo "missing"
```
If missing → invoke the `cloud-env-setup` skill targeting ECH, wait for it to complete, then continue. Do not proceed if setup fails.

```bash
node scripts/scout run-tests \
  --location cloud \
  --arch stateful \
  --domain <domain> \
  --config <config-path>
```

### Scout + MKI

Check the config file exists:
```bash
test -f .scout/servers/cloud_mki.json && echo "found" || echo "missing"
```
If missing → invoke the `cloud-env-setup` skill targeting MKI, wait for it to complete, then continue. Do not proceed if setup fails.

Determine the serverless domain from test tags or config path (`search`, `security_complete`, `observability_complete`, etc.).

```bash
node scripts/scout run-tests \
  --location cloud \
  --arch serverless \
  --domain <domain> \
  --config <config-path>
```

---

### FTR + ECH

Check the required env vars are set:
```bash
[[ -n "$TEST_ES_URL" && -n "$TEST_KIBANA_URL" ]] && echo "found" || echo "missing"
```
If missing → invoke the `cloud-env-setup` skill targeting ECH. Once complete, source the env vars from `.scout/servers/cloud_ech.json`:
```bash
export TEST_ES_URL=$(jq -r '.hosts.elasticsearch' .scout/servers/cloud_ech.json)
export TEST_KIBANA_URL=$(jq -r '.hosts.kibana' .scout/servers/cloud_ech.json)
```

```bash
TEST_CLOUD=1 \
node scripts/functional_test_runner.js \
  --config <config-path>
```

### FTR + MKI

Check the required env vars are set:
```bash
[[ -n "$TEST_CLOUD_HOST_NAME" && -n "$TEST_ES_URL" && -n "$TEST_KIBANA_URL" ]] && echo "found" || echo "missing"
```
If missing → invoke the `cloud-env-setup` skill targeting MKI. Once complete, source the env vars from `.scout/servers/cloud_mki.json`:
```bash
export TEST_CLOUD_HOST_NAME=$(jq -r '.cloudHostName' .scout/servers/cloud_mki.json)
export TEST_ES_URL=$(jq -r '"\(.hosts.elasticsearch):443"' .scout/servers/cloud_mki.json)
export TEST_KIBANA_URL=$(jq -r '.hosts.kibana' .scout/servers/cloud_mki.json)
```

```bash
TEST_CLOUD=1 \
node scripts/functional_test_runner.js \
  --config <config-path> \
  --exclude-tag=skipMKI
```

---

### Outcome
- **Pass** → proceed to Step 7
- **Fail** → analyse the failure, revise the fix, re-run local validation (Step 6) if needed, then re-run cloud validation. Same 3-attempt limit as Step 6.

---

## Step 7 — Lint and compile check

```bash
node scripts/eslint --fix <test-file-path>
node scripts/check_changes.ts
```

---

## Step 8 — Create branch and commit

First check if a PR already exists for the current branch:
```bash
gh pr list --repo elastic/kibana --head "$(git branch --show-current)" 2>&1
```

If a PR already exists, skip branch creation and go straight to `git add` + `git commit` + `git push`. Otherwise:

```bash
BRANCH="fix/flaky-<ISSUE_NUMBER>-<short-test-slug>"

git checkout main
git pull origin main
git checkout -b "$BRANCH"

git add <test-file-path>
git commit -m "$(cat <<'EOF'
fix flaky test: <short test description>

Fixes #<ISSUE_NUMBER>

Root cause: <one sentence explaining why the test was flaky>
Fix: <one sentence describing what was changed>
EOF
)"

git push origin "$BRANCH"
```

---

## Step 9 — Create the draft PR

```bash
gh pr create \
  --repo elastic/kibana \
  --title "fix flaky test: <short test description>" \
  --body "$(cat <<'EOF'
## Summary

Fixes the flaky test reported in #<ISSUE_NUMBER>.

**Root cause:** <explanation>

**Fix:** <explanation>

**Test type:** Scout / FTR
**Test file:** `<test-file-path>`
**Config:** `<config-path>`

## Validation

- [x] Passed 50/50 local runs (`--repeatEach 50`) before PR creation *(Scout only)*
- [ ] Validated against ECH *(if applicable)*
- [ ] Validated against MKI *(if applicable)*
- [ ] CI flaky test runner (50 runs) — triggered via `/flaky` comment below

## Checklist

- [ ] Flaky Test Runner was used on any tests changed
EOF
)" \
  --draft \
  --label "auto-flaky-fix"
```

If the `auto-flaky-fix` label does not exist in the repo, create it first:
```bash
gh label create "auto-flaky-fix" \
  --repo elastic/kibana \
  --description "Automated PR created by flaky-test-resolver agent" \
  --color "e4e669"
```

---

## Step 10 — Trigger the CI flaky test runner

```bash
PR_NUMBER=$(gh pr view --repo elastic/kibana --json number --jq .number)
```

**For Scout tests:**
```bash
gh pr comment "$PR_NUMBER" --repo elastic/kibana --body "/flaky scoutConfig:<config-path>:50"
```

**For FTR tests:**
```bash
gh pr comment "$PR_NUMBER" --repo elastic/kibana --body "/flaky ftrConfig:<config-path>:50"
```

Config path: relative to kibana root, no leading `./` or `/`, no `..`, no trailing `/`.

---

## Step 11 — Report back and offer monitoring options

Tell the user:
- PR URL
- Root cause and what was fixed
- For Scout: how many local attempts were needed
- That the CI flaky runner has been triggered (50 runs)

Then ask the user which monitoring option they prefer:

**Option A — Watch live (blocks terminal until CI finishes):**
```bash
gh pr checks $PR_NUMBER --repo elastic/kibana --watch
```
When all checks pass, remind the user to mark the PR ready for review:
```bash
gh pr ready $PR_NUMBER --repo elastic/kibana
```

**Option B — Background polling (non-blocking, notifies when done):**
Invoke the `loop` skill to poll every 10 minutes:
```
/loop 10m check if gh pr checks <PR_NUMBER> --repo elastic/kibana shows the flaky runner passed; if yes, run gh pr ready <PR_NUMBER> --repo elastic/kibana and notify me
```

**Option C — Manual (user checks when convenient):**
Share the PR URL and let the user check on their own time.

---

## References

- Scout testing patterns: `../scout-ui-testing/SKILL.md`
- FTR testing patterns: `../ftr-testing/SKILL.md`
- Flaky test runner trigger workflow: `.github/workflows/trigger-flaky.yml`
