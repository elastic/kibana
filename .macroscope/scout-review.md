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

IMPORTANT:

- Do NOT review backport PRs (these usually merge changes into branches that aren't `main`)
- Do NOT post flaky test runner nudges. A separate agent handles this.

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
- State the rule violated as a **Markdown link** whose text is the section heading from the matching best-practices document and whose URL is the section-scoped URL (see routing below). The link is required, not optional.
- Explain the issue in 1–2 sentences
- Suggest a concrete fix

### Pick the right best-practices document (required)

Scout best practices live in three files. Don't guess from keywords — read the actual headings to find the matching section:

- UI tests: `docs/extend/scout/ui-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices`
- API tests: `docs/extend/scout/api-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/api-best-practices`
- General (applies to both UI and API): `docs/extend/scout/best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/best-practices`

**Selection rule:**

1. Start from the file being reviewed. If it lives under `test/scout*/ui/**` (or is a UI page object / fixture), check `ui-best-practices.md` first. If it lives under `test/scout*/api/**` (or is an API service / client fixture), check `api-best-practices.md` first.
2. Scan that doc's headings for one that matches the rule you're about to cite. If found, use it.
3. Otherwise, scan the general `best-practices.md`. Use it only when the rule genuinely applies to both UI and API tests (test naming, suite independence, hooks, cleanup, etc.).
4. When a section with the same intent exists in both the specific doc and the general doc, prefer the specific one.

### Always include the section anchor

Every finding must link to a **section-scoped URL**, not the doc root. Infer the `#anchor` from the explicit heading id in the markdown source (e.g., the heading `## Use Playwright auto-waiting [leverage-playwright-auto-waiting]` yields `#leverage-playwright-auto-waiting`). Only fall back to the doc root URL if the rule genuinely has no matching section (rare — re-read the doc first).

Format the citation as a Markdown link using the section heading text as the link label:

```
🔵 [Use Playwright auto-waiting](https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices#leverage-playwright-auto-waiting)
```

Do **not** use bare parenthetical labels like `(best practices)` or `(ui best practices)` — the citation must be a real link that takes the reader to the specific section. If you cannot identify a specific section, state the rule in plain text rather than linking to the wrong document.

### Updates to the PR

When a developer updates the PR, review the newer code blocks and suggest improvements while keeping the review high-signal and focused — avoid being overly nitpicky.
