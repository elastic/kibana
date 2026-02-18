---
name: prepare-for-pr
description: Run common CI checks on changed files — type checking, unit tests, eslint fixes, CODEOWNERS generation, and moon project regeneration. Use when the user wants to prepare a branch for a pull request, run pre-merge checks, check that CI will pass, or validate changes before pushing.
---

# Pull Request Preparation

Run focused, speed-optimized checks on changed files before opening a pull request.
Do **not** use the MCP `run_ci_checks` tool — run each step directly via shell instead.

## Shell timeouts

Set `block_until_ms` on every shell command to avoid background polling with `sleep`.
Use these minimums based on observed runtimes:

| Command | `block_until_ms` |
|---------|-----------------|
| `git diff`, `git merge-base` | 10000 |
| `node scripts/lint_ts_projects.js` | 60000 |
| `yarn test:type_check --project` | 60000 |
| `yarn test:jest` | 60000 |
| `node scripts/eslint` | 60000 |
| `node scripts/generate codeowners` | 30000 |
| `node scripts/regenerate_moon_projects.js` | 30000 |

## Workflow

Run these steps **sequentially**. Do not stop on failure — continue through all steps.
At the end, summarize any issues that would likely cause the PR to fail its first CI run.

### Step 0: Identify affected packages

Collect **both** committed and uncommitted changes. Detect the base branch rather than assuming `main`:

```bash
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD origin/main)
# Committed changes on the branch.
git diff --name-only "$BASE"...HEAD
# Uncommitted changes in the working tree.
git diff --name-only
```

Combine and deduplicate the results. From the changed file paths, identify:
- The affected packages — walk up from each changed file to the nearest `kibana.jsonc` and read its `id` field for the package ID.
- The `tsconfig.json` files for those packages (sibling to `kibana.jsonc`).
- The changed `.ts`/`.tsx`/`.js`/`.jsx` files for eslint scoping.

**Prerequisite check**: verify the TS project map exists by running a quick type check on one package. If it fails with `TS Project map missing`, **stop** and ask the user if they'd like you to run `yarn kbn bootstrap`. Once bootstrap completes (or if the user declines), proceed with the remaining steps.

### Step 1: Lint TS projects

Validate and auto-fix `tsconfig.json` files across affected packages.

```bash
node scripts/lint_ts_projects.js --fix
```

This runs repo-wide but is fast. If any files were modified by `--fix`, note them in the summary. Report any remaining errors that couldn't be auto-fixed.

### Step 2: Type check

Run type checking scoped to each affected package's `tsconfig.json`.
Only one `--project` flag per invocation — run separate commands for each package.

```bash
yarn test:type_check --project path/to/tsconfig.json
```

**Also check downstream dependents** — find packages whose `kbn_references` include any affected
package ID and type-check those too. This catches cross-package breakage that CI's full
`tsc -b tsconfig.refs.json` would find.

```bash
grep -rl '"@kbn/affected-package-id"' --include='tsconfig.json' .
```

Deduplicate against already-checked packages. If a package has more than **20** downstream
tsconfigs, skip the downstream check and warn the user that a full `tsc -b` may be needed.

### Step 3: Unit tests

Run unit tests **per affected package** using the MCP `run_unit_tests` tool with coverage enabled:

```
run_unit_tests(package: "@kbn/package-name", collectCoverage: true)
```

The `package` parameter accepts a package ID (e.g., `@kbn/content-list-table`) or directory path.
Report uncovered line numbers and overall coverage to the user — let them judge acceptable thresholds.

If the MCP tool is unavailable, fall back to `yarn test:jest --coverage path/to/package/src/`.

### Step 4: ESLint with auto-fix

Run eslint with `--fix` scoped to each affected package's directory rather than listing individual files.
Walk up from the changed files to the nearest `.eslintrc.js` or `.eslintrc.json` parent directory and pass that directory.

```bash
node scripts/eslint --fix path/to/affected-package/
```

Run once per affected package directory. If eslint produces remaining errors after auto-fix, report them.

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

If the user asks to re-run pr-prep after making fixes, or if you make changes as the result of a failure, run all steps again.

## After all checks have run

Report a summary including:
- TS project lint pass/fail.
- Type check pass/fail per package (or "skipped" if unchanged).
- Test results and coverage per package (or "skipped" if unchanged).
- ESLint errors remaining after auto-fix (and which files were auto-fixed).
- Whether CODEOWNERS or moon configs need to be committed.

### Offering to fix issues

After reporting the summary, offer to fix issues based on risk level:

- **Type errors and remaining eslint errors** — offer to fix these automatically. These are usually mechanical (wrong types, missing arguments, import issues) and safe to correct.
- **TS project lint errors not resolved by `--fix`** — offer to fix. These are typically structural tsconfig issues.
- **Test failures** — ask before touching test code. Test fixes can change intent, so the user should confirm before proceeding.

Do **not** commit or stage automatically — let the user decide.
