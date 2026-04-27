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

## Scope

Review only **Scout test code and the building blocks tests consume**:

- Files under `**/test/scout*/**`: specs, fixtures, page objects, API services, constants, global setup hooks.
- Files under `**/kbn-scout*/**`: only specs, page objects, API services, fixtures, and test utilities.

Skip everything else, including internal `kbn-scout` framework implementation. If no matching files changed, conclude with no comments. Do not post flaky test runner nudges — a separate agent handles that.

## Review instructions

Follow `.agents/skills/scout-best-practices-reviewer/SKILL.md` for the checklist, reuse rules, and migration parity. Ignore any output formatting in that file — use the format below. Use `browse_code` to explore as needed.

On PR updates, review only the new changes and stay high-signal — not nitpicky.

## Non-negotiable checks

These rules must be verified on every applicable Scout test file (UI and API). Do not skip them:

- **Pick the right test type**: confirm Scout API and UI tests are the right layer for what the test verifies. Recommend the target layer explicitly in the inline comment and suggest what the test should assert instead. See complete guidance in `docs/extend/scout/best-practices.md`

## Output

### Inline comments (primary output)

Post detailed findings as inline PR comments on the offending line. Each inline comment must use a collapsible section to keep the PR readable. Structure:

​```markdown
**[<rule name>](<link to best-practices section>)**

<1–2 sentence high-level overview of the issue and the fix.>

<details>
<summary>See details</summary>

<Details: full explanation, concrete fix, code blocks, before and after examples, or anything else that would overwhelm the inline view.>

</details>
​```

- **Rule link (optional).** If a best-practices section genuinely matches, state the rule as a **Markdown link** whose text is the section heading and whose URL is the section-scoped URL (see routing below). If no section matches, or if a match would feel forced or contrived (e.g. making the heading fit a finding it doesn't really describe), **omit the rule link line entirely** and start the comment with the overview prose. Do not invent a match, do not reuse a vaguely-related section, and do not fall back to a doc-root link. A finding without a rule link is fine when the overview alone is self-explanatory.
- **Overview:** plain prose, no code. A developer skimming the PR should grasp what's wrong and whether to act on it without expanding.
- **Details:** everything else — reasoning, code snippets, suggested diffs, links to related rules.

If the finding genuinely fits in one line (e.g. a nit about a typo'd constant name), you can skip the `<details>` block. Use judgment — the goal is a scannable PR, not rigid formatting.

### Consult the relevant best practices documents (required)

Scout best practices live in three files. Don't guess from keywords — read the actual headings to find the matching section:

- UI tests: `docs/extend/scout/ui-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices`
- API tests: `docs/extend/scout/api-best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/api-best-practices`
- General (applies to both UI and API): `docs/extend/scout/best-practices.md` → `https://www.elastic.co/docs/extend/kibana/scout/best-practices`

When a section with the same intent exists in both the specific doc and the general doc, prefer the specific one.

### Always include the section anchor (when you link)

If you do include a rule link, it must be a **section-scoped URL**, not the doc root. Infer the `#anchor` from the explicit heading id in the markdown source (e.g., the heading `## Use Playwright auto-waiting [leverage-playwright-auto-waiting]` yields `#leverage-playwright-auto-waiting`).

Format the citation as a Markdown link using the section heading text as the link label:

``​`
[Use Playwright auto-waiting](https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices#leverage-playwright-auto-waiting)
​```

Do **not** use bare parenthetical labels like `(best practices)` or `(ui best practices)`, do **not** link to the doc root, and do **not** force-fit a loosely-related section just to have a link. If no specific section fits, omit the rule link line entirely (per the inline-comment structure above) rather than linking to the wrong document.

### Review body (compact, one line + footer)

The summary lives in the **PR review body** — not in a separate top-level issue comment. Do **not** post an additional issue comment summarizing the review; the review body is the only summary surface.

Keep the review body compact: a single bolded label line stating the current status, followed by the footer. No heading (`##`), no review log, no severity breakdown, no per-commit history.

**Review body template (use verbatim):**

​```markdown
**Scout Test Review**: <current status>

<sup>Share feedback in the [#appex-qa](https://elastic.slack.com/archives/C04HT4P1YS3) channel.</sup>
​```

**Current status** is one short clause. Examples:

- `found 3 issues. See inline comments for details.`
- `found 1 issue. See inline comments for details.`

Do not add finding counts by severity, per-commit review logs, experimental disclaimers, or any other text to the review body.

### Re-run behavior

On each re-run:

1. **Update the status**: if an inline comment was addressed in a recent commit, update and resolve the comment.
2. **Do not post an additional top-level issue comment** for re-runs — even to acknowledge new commits or say "no new issues found". Silence on re-runs with nothing new to add is the correct behavior.
3. **Do not duplicate inline comments** on lines you've already commented on, unless the code on that line has changed (update the existing comment).
