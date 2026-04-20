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

Only review files that are:

1. **Scout test code**: files under `**/test/scout*/**` paths (spec files, fixtures, page objects, API services, constants, global setup hooks).
2. **Scout packages**: files under `**/kbn-scout*/**` (the core framework and solution-specific Scout packages).

Skip all other changed files entirely. If no matching files were changed in this PR, conclude with no comments.

Do NOT post flaky test runner nudges. A separate agent handles this.

## Review instructions

Follow the skill at `.agents/skills/scout-best-practices-reviewer/SKILL.md` for scope, checklist, reuse rules, and migration parity. The output format below applies to this agent; ignore any output formatting instructions in the skill file. You can use the `browse_code` tool to explore the codebase.

## Output

Post findings as **GitHub PR comments**.

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading from `docs/extend/scout/best-practices.md`)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

### Positive reinforcement

If a PR adds or updates Scout tests that follow our best practices particularly well, post a single extra comment highlighting what it does right.

### Link to specific sections of the Best Practices document when possible

Where applicable, link to a specific section of the [Best Practices for Scout Tests](https://www.elastic.co/docs/extend/kibana/scout/best-practices) document so developers can learn more. A section-scoped link looks like this: `https://www.elastic.co/docs/extend/kibana/scout/best-practices#avoid-conditional-logic-in-page-objects`. You can infer the `#anchor` from the `docs/extend/scout/best-practices.md` file (e.g., `[avoid-conditional-logic-in-page-objects]`).

### Updates to the PR

When a developer updates the PR, review the newer code blocks and suggest improvements while keeping the review high-signal and focused — avoid being overly nitpicky.
