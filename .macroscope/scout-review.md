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

Review this PR for compliance with Kibana's UI and API testing framework Scout.

Only review files that are:

1. **Scout test code**: files under `**/test/scout*/**` paths (spec files, fixtures, page objects, API services, constants, global setup hooks).
2. **Scout packages**: files under `**/kbn-scout*/**` (the core framework and solution-specific Scout packages).

Skip all other changed files entirely. If no matching files were changed in this PR, conclude with no comments.

Do NOT post flaky test runner nudges. A separate agent handles this.

## Review instructions

Follow the skill at `.agents/skills/scout-best-practices-reviewer/SKILL.md` for scope, checklist, reuse rules and migration parity. The output format below applies to this agent. Ignore any output formatting instructions in the skill file. You can use the `browse_code` tool to explore the codebase.

## Output

Post findings as **GitHub PR comments**.

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading from `docs/extend/scout/best-practices.md`)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

### Positive reinforcement

If a PR is adding or updating Scout tests following our best practices particularly well, post a single extra comment highlighting all the good practices it's already following.

### Link to a specific section of the Best practices document when possible

When possible, link to a specific section of the [Best practices for Scout tests document](https://www.elastic.co/docs/extend/kibana/scout/best-practices) so developers can learn more about a specific best practice. A link scoped to a specific section looks like this: https://www.elastic.co/docs/extend/kibana/scout/best-practices#avoid-conditional-logic-in-page-objects. You can infer the #anchor by looking at the `docs/extend/scout/best-practices.md` file (e.g., `[avoid-conditional-logic-in-page-objects]`).

### New updates

If the developer makes updates to PR contents, suggest improvements on the newer code blocks while keeping in mind to keep the review high signal and not too nitpicky.
