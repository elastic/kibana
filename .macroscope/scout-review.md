---
title: Scout Test Review
model: claude-opus-4-6
reasoning: high
effort: high
input: full_diff
include:
  - '**/test/scout*/**'
  - '**/kbn-scout*/**'
conclusion: neutral
---

Review this PR for compliance with Kibana Scout test best practices.

**Scope**: Focus on **Scout test behavior and best practices** — things that affect test reliability, coverage, and maintainability. Do NOT flag general code quality issues (unused imports/exports, naming conventions, code style) unless they directly impact test behavior. The goal is actionable feedback on tests, not code correctness nitpicks.

Only review files that are:

1. **Scout test code**: files under `**/test/scout*/**` paths (spec files, fixtures, page objects, API services, constants, global setup hooks).
2. **Scout packages**: files under `**/kbn-scout*/**`, but only page objects, API services, fixtures, and test utilities that tests consume. Skip internal framework implementation files.

Skip all other changed files entirely. If no matching files were changed in this PR, conclude with no comments.

Do NOT post flaky test runner nudges. A separate agent handles this.

## Review instructions

Follow the skill at `.agents/skills/scout-best-practices-reviewer/SKILL.md` for scope, checklist, reuse rules, and migration parity. You can use the `browse_code` tool to explore the codebase. Use the output instructions below to format the review:

## Output

Post a **brief summary comment** — a few lines with count, severity, and optionally a one-liner per finding. Keep it scannable; detailed explanations and fixes go in inline comments.

```
## Scout Test Review

Found 2 issues (1 major, 1 minor). See inline comments for details.

This review is experimental. Share your feedback in the #appex-qa channel.
```

All detailed findings must go in **inline GitHub PR comments** on the specific line where each issue occurs. For each inline comment:

- Start with the severity emoji (🔴 Blocker, 🟡 Major, 🔵 Minor, or ⚪ Nit)
- State the rule violated (use the section heading from `docs/extend/scout/best-practices.md`)
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

### Link to specific sections of the Best Practices document when possible

Where applicable, link to a specific section of the [Best Practices for Scout Tests](https://www.elastic.co/docs/extend/kibana/scout/best-practices) document so developers can learn more. A section-scoped link looks like this: `https://www.elastic.co/docs/extend/kibana/scout/best-practices#avoid-conditional-logic-in-page-objects`. You can infer the `#anchor` from the `docs/extend/scout/best-practices.md` file (e.g., `[avoid-conditional-logic-in-page-objects]`).

### Updates to the PR

When a developer updates the PR, review the newer code blocks and suggest improvements while keeping the review high-signal and focused — avoid being overly nitpicky.
