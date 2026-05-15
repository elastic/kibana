---
name: dead-code-cleanup
description: >
  Identify and remove unused source files in Kibana plugins/packages with high confidence.
  Combines knip (static dead-code detection) with a resolve-aware import scanner that
  handles edge cases knip misses: jest.mock() string paths, package-id deep imports
  (@kbn/<pkg>/<sub>), barrel/index.ts ambiguity, and dynamic loaders. Use when:
  (1) auditing a single package for dead code before refactor, (2) running a repo-wide
  sweep, (3) answering "is this file safe to delete?", (4) building a per-package work
  queue for a longer cleanup project.
---

# Dead Code Cleanup

## Overview

Knip alone is not safe enough to drive deletes in Kibana — its resolver misses several
patterns that are common here:

- **Package-id deep imports**: `import x from '@kbn/foo/bar/baz'` from another package.
- **`jest.mock(string)`**: tests reference modules by string path.
- **Webpack-alias mocks**: `__storybook_mocks__/` resolved at bundle time only.
- **Barrel/sibling ambiguity**: `@kbn/foo/bar` may resolve to `bar.ts` *or* `bar/index.ts`.
- **Dynamic loaders**: `readdirSync`, `globby`, `path.resolve(__dirname, ...)`.

This skill wraps knip with a verification step that closes those gaps, then drives a
disciplined per-package workflow that's safe to run unattended.

## When to use

- Auditing a single package: jump to **Phase 2** with that package.
- Repo-wide sweep: do **Phase 1** to build a priority queue, then iterate Phase 2.
- Spot-checking a candidate file: just the verification steps under "Verify a candidate".

## Phase 1 — Build the leaderboard

Skip if `dead-code-leaderboard.md` already exists at the repo root — re-use it as a queue.

Run:

```bash
bash .agents/skills/dead-code-cleanup/scripts/scan.sh > dead-code-leaderboard.md
```

The scanner walks every `kibana.jsonc` in the repo, generates a per-package `knip.json`
with the right entry surface (see "Entry derivation" below), runs knip in parallel, and
emits a sorted leaderboard. ~10 min for the full repo on a typical laptop.

Output columns: rank, unused-file count, package id, owning team(s), path, status,
optional `(dynamic-loader)` annotation.

## Phase 2 — Process one package

For each package on the leaderboard (top-down or as needed):

### Setup

1. Optional: work in a git worktree to keep the cleanup branch isolated.
2. Bootstrap the worktree (`yarn kbn bootstrap`) if not already — codegen scripts need
   it. **Do not symlink `node_modules` from the main repo**: the symlink masks tooling
   version drift between branches and CI errors that should be visible locally.

### Pre-flight skip checks

Before running knip, check these:

1. **Cypress packages.** If the package contains `cypress/` or `*.cy.ts` files,
   per-package knip can't model the multi-root test setup. Skip with note
   "needs better recipe".

2. **Dynamic loaders — partition, don't blanket-skip.** Run:
   ```bash
   grep -rEn 'readdirSync|require\.context|globSync|fast-?glob|globby|path\.resolve.*__dirname.*__fixture' <pkg>
   ```
   If hit, distinguish "package loads its own files dynamically" (real concern for knip)
   from "package is a CLI that scans external paths passed as args" (false alarm). For
   the former:
   - Identify the loader-target directory (`__fixture__/`, `__fixtures__/`, `scenarios/`,
     `configs/`, `test_d/`).
   - Run knip and partition the candidate list:
     - **Bucket A** — files inside the loader-target directory: alive but invisible to
       knip. Add the directory to the package's `knip.json` `entry:`.
     - **Bucket B** — files OUTSIDE the loader-target directory: verify and delete
       normally. Often a real orphan hides here.

### Entry derivation (knip.json)

For each package, the right `entry:` set is:

- The package's `kibana.jsonc`-declared surfaces: `server/index.ts`, `public/index.ts`,
  `common/index.ts`, plus any bare-root `*.ts` (e.g. `api.ts`, `ui.ts`).
- **For shared/common packages**, every public-entry path consumed via package-id deep
  imports — discover with:
  ```bash
  grep -rn "@kbn/<pkgname>/" --include="*.ts" --include="*.tsx" \
    | awk -F"'" '{print $2}' | sort -u
  ```
  For each `@kbn/foo/bar` result, list **both** `bar.ts` and `bar/index.ts` in `entry:` —
  the wrong choice makes the real entry look unused.
- Test/story/mock entries (so the things they reference don't appear as unused):
  ```
  **/*.test.{ts,tsx,js,jsx}
  **/*.stories.{ts,tsx,js,jsx}
  **/__mocks__/**/*.{ts,tsx,js,jsx}
  **/__storybook_mocks__/**/*.{ts,tsx,js,jsx}
  **/*.mock.{ts,tsx,js,jsx}
  **/tsd_tests/test_d/**/*.ts
  ```
- `**/__jest__/**/*.{ts,tsx,js,jsx}` if the package has a `__jest__/` directory (some plugins
  put integration tests there, outside the standard `server/public/common/src` glob).

### Verify a candidate

For each file in knip's "Unused files":

a. **Skip without verifying** — only one shape is genuinely justified:
   - `__storybook_mocks__/*` — Storybook webpack-alias mocks; resolved at bundle time
     and invisible to any static scan.

   **Everything else MUST be verified** — including `latest.ts`, `v1.ts`, `__mocks__/`,
   `public/mocks.ts`, etc. The verification steps below cover them. Don't blanket-skip
   versioned barrels; they're often legitimate orphans (e.g. `domain/x/latest.ts` that
   re-exports `./v1` but consumers deep-import `./v1` directly).

b. **Resolve-aware import scan** — run:
   ```bash
   node .agents/skills/dead-code-cleanup/scripts/verify.mjs <candidate-file-path>
   ```
   Walks every `.ts`/`.tsx` in the repo, parses each `import`/`from`, and resolves
   Node-style (`<base>.ts`, `<base>.tsx`, `<base>/index.ts`, `<base>/index.tsx`). Any
   match means the file is alive — keep.

   The script also scans `jest.mock('relative/path', ...)` strings and `@kbn/<pkg>/<sub>`
   package-id deep imports — both are invisible to plain `import` parsing but caught
   here.

   **`jest.mock`-only is dead.** If the only references are `jest.mock()` strings — no
   real `import`/`require` from production code — the file is dead and the mock is
   orphaned (it's mocking something nothing under test imports). The verifier reports
   this as `DEAD (jest.mock-only)` and lists the orphan test files. Delete the source
   file AND remove the orphan `jest.mock(...)` blocks from each listed test in the
   same commit.

   If a match comes from an **external package**, STOP and skip — Kibana convention
   forbids cross-package deep imports, so this is a real bug. Open a follow-up issue
   against the owning team rather than deleting. Tells: a comment like
   `// TODO: This file exists only to provide the type export for <pkg>` is a strong
   signal of the anti-pattern.

   **Internal-only chain pattern**: the verifier may mark file B as ALIVE because file A
   imports it, while A is itself in the candidate-dead set. If EVERY importer of B is
   inside the candidate set, the whole chain is safe to delete together. If ANY importer
   lies OUTSIDE the candidate set (e.g. a `scripts/` CLI that's outside the knip project
   glob), keep the whole chain.

c. **Read the file** for dynamic `require`/`import()` strings, registry registrations
   by string id, or anything that might route through string matching the verifier
   doesn't model. Skip and document if you see any.

### Common legitimate-delete shapes

- **Orphan barrel `index.ts`** that re-exports from a sibling, where consumers
  consistently bypass the barrel and deep-import the sibling directly.
- **Versioned barrel orphans** — `latest.ts` re-exports `./v1` but consumers
  deep-import `./v1` directly.
- **Dead error classes** never thrown.
- **Dead UI components/icons** not in any registry.
- **Whole abandoned feature directories** — re-runnable knip catches these as
  internal-only chains after the first pass.

After deletes, **re-run knip**. Chained orphans appear (e.g. `errors.ts` only used
by the just-deleted `wrap_handler.ts`). Verify those too.

### Validate before commit

1. **Regenerate codegen artifacts** that reference the deleted files:
   ```bash
   node scripts/lint_ts_projects --fix              # tsconfig.json include arrays
   node scripts/regenerate_moon_projects.js --update # moon.yml project lists
   node scripts/i18n_check --fix                    # orphaned translations/*.json IDs
   ```
   Stage the resulting changes alongside the deletions in the same commit. Skipping
   any of these surfaces as a CI failure on Kibana's "Quick Checks" step — the first
   two get auto-fixed and pushed back as separate commits, the third hard-fails until
   you fix it.

2. **Type-check** the affected package:
   ```bash
   node scripts/type_check --project <pkg>/tsconfig.json
   ```
   Filter the output for errors mentioning files in this package — Kibana has thousands
   of pre-existing repo-wide `rootDir` errors that are not yours.

3. `node scripts/eslint --fix $(git diff --name-only)`.

## Hard rules

- **Never delete a file the verifier hasn't cleared.** Knip alone is insufficient; the
  resolve-aware scan is required. If verification is ambiguous, skip and document.
- **Files-only.** Ignore knip's "unused exports" / "unused exported types" — those are
  noisier and might be public API.
- **One package per commit.** Don't bundle multiple packages — clean per-package commits
  make later split-by-team workflows mechanical (commit body should identify the
  owning team from `kibana.jsonc`).
- If knip itself fails on a package, note it and skip — don't rabbit-hole on tooling.

## Reference

PR #265375 demonstrates the verify-then-delete pattern: 13 dead files in
`workplace_ai_app` removed after knip + cross-repo grep + type-check, all with zero
behavior change.
