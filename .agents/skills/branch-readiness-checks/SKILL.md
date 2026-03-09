---
name: branch-readiness-checks
description: "Validate branch readiness before push or PR using base-diff and local-change checks."
disable-model-invocation: true
---

# Branch Readiness

Run focused checks before push/PR.

## Command Timing

Use bounded polling rather than agent-specific timeout fields.
For each command, set a `max_wait_ms`, poll every `poll_interval_ms`, and stop when the command completes or the max wait is reached.
If `max_wait_ms` is exceeded, report a timeout and continue to the next workflow step.

| Command type | `max_wait_ms` | `poll_interval_ms` |
|---|---:|---:|
| `git diff`, `git merge-base` | 15000 | 1000 |
| `node scripts/check_changes.ts --ref "$BASE"` | 180000 | 2000 |
| `node scripts/lint_ts_projects.js`, `yarn test:type_check --project` | 120000 | 2000 |
| `node scripts/generate codeowners`, `node scripts/regenerate_moon_projects.js` | 60000 | 2000 |
| `yarn test:jest` (per package) | 300000 | 5000 |

## Workflow

Run these steps **sequentially**. Continue through all steps even if one fails.
At the end, summarize issues that are likely to fail CI.

### Step 0: Identify affected packages

Collect changes relative to branch base, including untracked files. Detect the base branch rather than assuming `main`:

```bash
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD origin/main)
# Files changed since the branch base (committed + working tree changes).
git diff --name-only "$BASE"
# Untracked files.
git ls-files --others --exclude-standard
```

Combine and deduplicate results. From the changed file paths, identify:
- The affected packages — walk up from each changed file to the nearest `kibana.jsonc` and read its `id` field for the package ID.
- The `tsconfig.json` files for those packages (sibling to `kibana.jsonc`).

**Prerequisite check**: verify the TS project map exists by running a quick type check on one package. If it fails with `TS Project map missing`, **stop** and ask the user if they'd like you to run `yarn kbn bootstrap`. Once bootstrap completes (or if the user declines), proceed with the remaining steps.

### Step 1: Run `check_changes` against branch base

Run `check_changes` using the `BASE` computed in Step 0:

```bash
node scripts/check_changes.ts --ref "$BASE"
```

Record failures in the final summary, then continue with the remaining steps.

### Step 2: Lint TS projects

Validate and auto-fix `tsconfig.json` files across affected packages.

```bash
node scripts/lint_ts_projects.js --fix
```

This runs repo-wide but is fast. Note files modified by `--fix` and report any remaining errors.

### Step 3: Type check

Run type checking scoped to each affected package's `tsconfig.json`.
Only one `--project` flag per invocation — run separate commands for each package.

```bash
yarn test:type_check --project path/to/tsconfig.json
```

**Also check downstream dependents** — find packages whose `kbn_references` include any affected
package ID and type-check those too. This catches cross-package breakage that CI's full
`tsc -b tsconfig.refs.json` would find.

Use `rg` if available, otherwise fall back to `grep`:

```bash
# Preferred (rg).
rg -l '"@kbn/affected-package-id"' --glob 'tsconfig.json' .
# Fallback (grep).
grep -rl '"@kbn/affected-package-id"' --include='tsconfig.json' .
```

Deduplicate against already-checked packages. If a package has more than **20** downstream
tsconfigs, skip the downstream check and warn the user that a full `tsc -b` may be needed.

### Step 4: Unit tests

Run unit tests **per affected package** with coverage enabled.

```bash
yarn test:jest --coverage path/to/package/src/
```

If your environment provides a package-scoped unit-test tool, use the equivalent command.

After the run, read the coverage summary output and report overall line/branch/function coverage percentages per package. Flag any package whose line coverage is **below 80%** and provide recommendations to bring it above that threshold. Use specific uncovered files or line ranges when the coverage output provides them.

### Step 5: CODEOWNERS generation

Regenerate the CODEOWNERS file from `kibana.jsonc` owner fields.

```bash
node scripts/generate codeowners
```

Check `git diff .github/CODEOWNERS` afterward — if the file changed, note it in the summary.

### Step 6: Moon project regeneration

Regenerate moon project configs.

```bash
node scripts/regenerate_moon_projects.js --update
```

Check for unstaged changes afterward — if any moon configs changed, note them in the summary.

## Re-runs within the same session

If the user asks to re-run branch-readiness checks after fixes, or if you make changes due to failures, run all steps again.

## After all checks have run

Report a summary including:
- Check changes pass/fail and key failures (if any).
- TS project lint pass/fail.
- Type check pass/fail per package (or "skipped" if unchanged).
- Test results and coverage per package (or "skipped" if unchanged); flag packages below 80% line coverage.
- Whether CODEOWNERS or moon configs need to be committed.

### Offering to Fix Issues

After reporting the summary, offer fixes by risk level:

- **Check changes failures, type errors, and TS project lint errors not resolved by `--fix`** — offer to fix automatically when mechanical and low risk.
- **Test failures** — ask before touching test code. Test fixes can change intent, so the user should confirm before proceeding.
- **Coverage gaps (below 80%)** — offer to add tests for uncovered code, but ask first. Coverage improvements are optional and the user may choose to defer them.

Do **not** commit or stage automatically — let the user decide.
