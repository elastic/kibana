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

If no matching files were changed in this PR, conclude with no comments.

Do NOT post flaky test runner nudges. A separate agent handles this.

## Review instructions

Follow the skill at `.agents/skills/scout-best-practices-reviewer/SKILL.md` for scope, checklist, reuse rules, migration parity, and output structure.

## Output

Post findings as **GitHub PR comments**. If no issues are found, don't post any comments.

Group findings by severity: 🔴 Blocker → 🟡 Major → 🔵 Minor → ⚪ Nit. For each finding:

- State the rule violated (use the section heading from `docs/extend/scout/best-practices.md`)
- Quote the file and line
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

IMPORTANT:

- If all Scout best practices are followed, report "All Scout test best practices are followed. No issues found.
- If the developer makes updates to PR contents, you're free to suggest improvements but don't overwhelm developers with nitpicks.
