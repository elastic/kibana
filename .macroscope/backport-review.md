---
title: Backport Review
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - '**/test/scout*/**'
  - 'src/platform/test/**'
  - 'x-pack/**/test/**'
conclusion: neutral
---

Review backport PRs within the context of:

1. the PR that was merged into `main` branch - are all changes backported?
2. the version branch the backport PR is targeting - do the changes make sense within the context of this version branch?

You should particularly pay attention to tests that are being backported - may the PR author have made mistakes?

IMPORTANT: only run this check on backport PRs. Hints on how to identify backport PRs will follow.

## 1. Check: is this a backport PR?

Backport PRs often have these characteristics:

- PR has the `backport` label
- PR title starts with a target branch version (e.g., `[9.4]`, `[8.19]`).
- PR body contains the `This will backport the following commits from` text.

Stop if the PR isn't a backport and do NOT leave any comments on the PR to not create noise.

## 2. Identify the original PR

The goal is to identify the original PR that was merged into the `main` branch. It is often linked from within the PR description, and will very likely have a similar title to the backport PR (without any version prefix).

Fetch the original PR's diff and file list via `GET /repos/elastic/kibana/pulls/{originalPR}`.

## 3. Review the backport PR

Review the backport PR diff against the original PR. When a parity issue is found, link to the equivalent line in the original PR.

Highlight:

- **Missing or extra files:** flag files missing from the backport (dropped cherry-picks) or unjustified new files (scope creep)
- **Test-specific parity:** ensure tests are backported, if it makes sense from within the context of the version branch.
- **Stray markers:** let the author know if `<<<<<<<`, `=======`, or `>>>>>>>` exist in the diff.
- **Config drift ("ghost references"):** if a file is deleted, ensure no lingering references remain (e.g., `.github/CODEOWNERS`, deleted global setups still in Playwright config, `require.resolve` of deleted fixtures).
- **Versions-specific terms:** flag APIs or terms that do not exist on the `targetBranch` (e.g., using "Data View" on a 7.17 backport).

## 4. Output

Provide a compact review. Surface signal; humans decide on merging.

### Inline comments (primary output)

Post findings as inline PR comments on the offending line. Each inline comment must use a collapsible section to keep the PR readable. Structure:

```markdown
**<short finding title>**

<1–2 sentence high-level overview of the issue and the fix.>

<details>
<summary>See details</summary>

<Full explanation, concrete fix, code blocks, before and after examples, and — for parity findings — a link to the equivalent line in the original PR like [original PR line](https://github.com/elastic/kibana/pull/<originalPR>/files#diff-...).>

</details>
```

- **Overview:** plain prose, no code. A developer skimming the PR should grasp what's wrong and whether to act on it without expanding.
- **Details:** everything else — reasoning, code snippets, suggested fixes, links back to the original PR line for parity findings.

Skip the `<details>` block if the finding genuinely fits in one line (e.g., a stray conflict marker). Preserve the blank lines inside the template exactly as shown; GitHub needs them to render the collapsible correctly.

### Review body (only when issues are found)

When at least one inline comment is posted, the review comment body should follow this structure:

**Review body template (use verbatim):**

```markdown
**Backport Review**: <status>

<sup>Share feedback in the [#appex-qa](https://elastic.slack.com/archives/C04HT4P1YS3) channel.</sup>
```

`<status>` must be exactly:

- `found <N> issue(s). See inline comments for details.`

No heading (`##`), no severity breakdown, no per-commit log.

## 5. New commit pushes

On new comment pushes:

- Update/resolve existing inline comments. Do not post a new top-level comment. You may post additional inline comments if they're highly relevant.
- Do not duplicate inline comments on unchanged lines.
- **Ignore:** flaky test runner nudges and standard best-practices (these are handled by other agents).
