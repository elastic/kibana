---
name: agent-builder-tool-reviewer
description: Reusable Agent Builder tool review instructions — checks PRs against the tool quality checklist and posts collapsible inline comments.
---

# Agent Builder Tool Review

Review this PR for compliance with the Agent Builder tool quality checklist.

## Scope

Review only **Agent Builder tool registration code and the tool definitions they consume**:

- Tool registration files: `agentBuilder.tools.register(...)` calls
- Allowlist changes: `AGENT_BUILDER_BUILTIN_TOOLS` in `allow_lists.ts`
- Tool handler implementations, schemas, and their direct imports
- The registering plugin's `kibana.jsonc` and feature registration (for availability checks)

Skip everything else. If no matching files changed, conclude with no comments.
Do not run this check on backport PRs (they usually have `backport` label and/or the version prefix in the PR title, e.g.: "[9.x] <PR title here>").

## Review instructions

Follow `.agents/skills/agent-builder-tool-review/SKILL.md` for the **Critical checks** (C1-C6, highest priority — do them first), then the **Quality checks** (Q1-Q8). Ignore any output formatting in that file — use the format below. Use the GitHub tools and local file inspection to explore as needed.

Also read `.agents/skills/agent-builder-tool-review/references/common-issues.md` for calibration — it contains real examples of each check category from tools that shipped without proper review.

The contributor guide at `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md` documents the tool registration API. Consult it when verifying tool types, namespace conventions, or allowlist procedures.

On PR updates, review only the new changes and stay high-signal — not nitpicky.

## Review process

1. Start with the workflow-provided PR context artifacts under `/tmp/gh-aw/agent/`, especially `pr-diff.txt`, `pr-files.json`, `pr-metadata.json`, `pr-issue-comments.json`, `pr-review-comments.json`, and `pr-reviews.json`.
2. From `pr-files.json` (or `pr-diff.txt`), determine whether any in-scope files changed. If none changed, stop and call `noop` with `No Agent Builder tool files changed`.
3. From `pr-metadata.json`, check the PR title prefix and labels. If this is a backport (label `backport` or title prefix like `[9.x]`), stop and call `noop` with `Backport PR — skipping`.
4. If artifacts are missing or insufficient, use GitHub tools to gather the extra context needed.
5. Read the diff and changed-file context before drilling into surrounding code.
6. For each tool registration in the diff, walk the Critical checks (C1-C6) then Quality checks (Q1-Q8) from the SKILL.md.
7. If prior review comments are available, avoid repeating feedback that already applies to unchanged lines.

### Evidence gate — required before posting

Apply this gate to every finding, especially Critical checks:

1. Before flagging a missing availability handler, verify the tool's underlying feature is actually gated — read the plugin's `kibana.jsonc` and feature registration.
2. Before claiming a tool conflicts with another, read both tool descriptions and schemas.
3. Before claiming `excludeFromMcp` is needed, verify the tool's handler accesses internal state or its description/return values reference internal concepts.
4. Treat `404`, `429`, empty results, truncated results, and other failed or incomplete tool responses as unresolved verification — never as evidence of absence. If a required premise remains unresolved, omit that finding.
5. Re-read the final comment payload before submitting. Ensure code samples preserve their quotes.

## Output

Inline comments are the **only** output of this review. Do not post a top-level review body, issue comment, or summary. If no issues are found, post nothing — no inline comments, no review comment, no acknowledgement.

### Inline comments

Post detailed findings as inline PR comments on the offending line. Each inline comment must use a collapsible section:

```markdown
**[Check ID: C2 — Availability matches feature gating]**

<1–2 sentence overview of the issue and the fix.>

<details>
<summary>See details</summary>

<Full explanation, verification steps taken, concrete fix suggestion.>

<sup>Share feedback in the #chat-eng Slack channel.</sup>

</details>
```

- **Check ID line:** Always include the check ID (C1-C6, Q1-Q8) and its name from the SKILL.md.
- **Overview:** A developer skimming the PR should grasp what's wrong without expanding.
- **Details:** Reasoning, code snippets, suggested fixes. End with the feedback line.

If a finding fits in one line (e.g., missing `.describe()` on a parameter), skip the `<details>` block.

### Re-run behavior

On re-runs, walk existing inline review comments authored by this workflow:

- **Addressed:** the finding is resolved in the current diff. Post a one-line reply `Addressed in <commit-sha-link>` and queue `resolve-pull-request-review-thread`.
- **Still open:** do not re-comment, reply, or resolve.
- **Stale (line removed):** queue thread resolution without a reply.

Do not duplicate inline comments on unchanged lines.

## Output via safe-outputs

- For each finding: `create-pull-request-review-comment` with the inline comment body.
- If at least one inline comment: `submit-pull-request-review` with event `COMMENT` and empty body.
- If no findings: `noop` with `No issues found`.
- Never use `REQUEST_CHANGES` or `APPROVE`.
- For dispatched follow-up runs (`workflow_dispatch` with a non-empty `REVIEWER_COMMENT_ID`), respond to the triggering comment only. When `REVIEWER_COMMENT_TYPE` is set, use it to select the artifact: for `issue_comment`, find `REVIEWER_COMMENT_ID` in `pr-issue-comments.json`; for `pull_request_review_comment`, find it in `pr-review-comments.json`; treat any other non-empty value as invalid. If the importing workflow does not expose `REVIEWER_COMMENT_TYPE`, match `REVIEWER_COMMENT_ID` across both files. If it is a review-thread comment, reply in the same thread via `reply-to-pull-request-review-comment` with `comment_id` set to `REVIEWER_COMMENT_ID`; if it is a top-level PR comment, reply via `add-comment` on `PR_NUMBER`. Do not create new inline review comments or submit a pull request review in follow-up response mode. If the request is not actionable, call `noop` with a brief reason.
