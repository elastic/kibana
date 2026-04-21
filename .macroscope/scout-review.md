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
- Files under `**/kbn-scout*/**`: only page objects, API services, fixtures, and test utilities.

Skip everything else, including internal `kbn-scout` framework implementation. If no matching files changed, conclude with no comments. Do not post flaky test runner nudges — a separate agent handles that.

## Review instructions

Follow `.agents/skills/scout-best-practices-reviewer/SKILL.md` for the checklist, reuse rules, and migration parity. Ignore any output formatting in that file — use the format below. Use `browse_code` to explore as needed.

On PR updates, review only the new changes and stay high-signal — not nitpicky. If a `## Scout Test Review` summary comment already exists on the PR, edit it in place instead of posting a new one.

## Non-negotiable UI test checks

These rules must be verified on every applicable UI test file. Do not skip them:

- [Test behavior, not data correctness](docs/extend/scout/ui-best-practices.md): if a test case is validating data, the test belongs in a different layer (component test or API test, see details in the best practices document).

## Output

Post detailed findings as **inline PR comments** on the offending line. Optionally post one **summary comment** with a `## Scout Test Review` header and a brief severity breakdown, ending with this footer, verbatim:

`markdown
<sup>Share feedback on this review in the [#appex-qa](https://elastic.slack.com/archives/C04HT4P1YS3) channel.</sup>
`

### Inline comment format

Each inline comment must use a collapsible section to keep the PR readable. Structure:

```markdown
<severity emoji> **[<rule name>](<link to best-practices section>)**

<1–2 sentence high-level overview of the issue and the fix.>

<details>
<summary>See details</summary>

<Full explanation, concrete fix, code blocks, before and after examples, or anything else that would overwhelm the inline view.>

</details>
```

- **Severity emoji:** 🔴 Blocker, 🟡 Major, 🔵 Minor, ⚪ Nit
- State the rule violated as a **Markdown link** whose text is the section heading from the matching best-practices document and whose URL is the section-scoped URL (see routing below). The link is required, not optional.
- **Overview:** plain prose, no code. A developer skimming the PR should grasp what's wrong and whether to act on it without expanding.
- **Details:** everything else — reasoning, code snippets, suggested diffs, links to related rules.

If the finding genuinely fits in one line (e.g. a nit about a typo'd constant name), you can skip the `<details>` block. Use judgment — the goal is a scannable PR, not rigid formatting.

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

Always include the section anchor

Format the citation as a Markdown link using the section heading text as the link label:

```
🔵 [Use Playwright auto-waiting](https://www.elastic.co/docs/extend/kibana/scout/ui-best-practices#leverage-playwright-auto-waiting)
```

Do **not** use bare parenthetical labels like `(best practices)` or `(ui best practices)` — the citation must be a real link that takes the reader to the specific section. If you cannot identify a specific section, state the rule in plain text rather than linking to the wrong document.
