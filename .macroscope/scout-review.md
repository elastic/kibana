---
title: Scout Test Review
model: claude-opus-4-6
reasoning: high
effort: high
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
  - 'packages/**'
  - 'plugins/**'
  - 'scripts/**'
  - 'typings/**'
  - '.buildkite/**'
conclusion: neutral
---

Review this PR for compliance with Kibana Scout test best practices.

Only review files that are:

1. **Scout test code**: files under `**/test/scout*/**` paths (spec files, fixtures, page objects, API services, constants, global setup hooks).
2. **Scout packages**: files under `**/kbn-scout*/**` (the core framework and solution-specific Scout packages).

Skip all other changed files entirely.

If no matching files were changed in this PR, report "No Scout files in this PR — nothing to review" and conclude with no comments.

## Best practices reference

Read `docs/extend/scout/best-practices.md` with `browse_code` and enforce all rules documented there. The sections below cover additional conventions NOT in that document.

## Reuse

- Before creating new helpers, use `browse_code` to check what's already available in `@kbn/scout`, solution Scout packages (`@kbn/scout-oblt`, `@kbn/scout-search`, `@kbn/scout-security`), and plugin-local `test/scout/` directories.
- When adding helpers, place them in the correct scope: plugin-local `test/scout/` for plugin-specific, solution Scout package for cross-plugin within a solution, `@kbn/scout` for cross-solution.
- Flaky Test Runner nudges for PRs: `.macroscope/flaky-test-runner-nudge.md` (Scout and FTR).

## Output Format

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading from `docs/extend/scout/best-practices.md` or from this file)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

If all Scout best practices are followed, report "All Scout test best practices are followed. No issues found."
