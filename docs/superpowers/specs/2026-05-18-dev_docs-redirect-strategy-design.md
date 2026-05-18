# `dev_docs` Redirect Strategy — Design

**Date:** 2026-05-18
**Status:** Approved (brainstorming complete; ready for implementation planning)
**Author:** brainstorming session, Larry Gregory

## Problem

The Kibana developer documentation was migrated from a legacy MDX system under
`dev_docs/` (rendered at `docs.elastic.dev/kibana-dev-docs/...`) to a new
Markdown-based system under `docs/extend/` (rendered by `docs-builder` and
hosted at `https://www.elastic.co/docs/extend/kibana/...`).

To preserve bookmarks and external links, every legacy `dev_docs/**/*.mdx`
file was stripped down to a placeholder containing a `redirect_url:` in the
frontmatter and a body `DocCallOut` linking to the new location. **Both of
these URLs are wrong** in nearly every placeholder:

1. **Wrong domain.** Current placeholders point at
   `https://codex.elastic.dev/r/kibana-dev-docs/...`. They should point at
   `https://www.elastic.co/docs/extend/kibana/...`.
2. **Wrong path.** The target paths were generated as if the new site used a
   flat structure mirroring filenames. The real site follows the folder
   hierarchy declared in `docs/extend/toc.yml`. For example,
   `key-concepts/audit-logging` is now `key-concepts/security/audit-logging`,
   and `key-concepts/anatomy-of-a-plugin` is now
   `key-concepts/platform-architecture/anatomy-of-a-plugin`.

Two companion files, `dev_docs/url-mapping.json` and
`dev_docs/url-mapping-full.json`, encode the same broken mapping and must be
kept in sync.

`docs/redirects.yml` already defines many of the post-migration moves inside
the new docs system and is therefore the highest-trust signal for resolving
non-1:1 mappings.

There are 83 placeholder mdx files in scope.

## Goal

A reusable, agent-driven playbook with four self-contained phases that can be
dispatched independently (different agents may pick up different phases). The
playbook must produce correct redirects for every placeholder, leave a clear
audit trail, and verify the result against `docs-builder serve` running
locally.

## Non-goals

- Modifying any content under `docs/extend/**`.
- Editing `docs/redirects.yml`. That file is owned by the docs migration and
  is treated as a read-only signal.
- Deleting any placeholder mdx file. Legacy URLs must keep redirecting; the
  placeholders are the redirect mechanism.
- Resolving redirects for pages that have no destination at all (those are
  flagged and left untouched for human follow-up).

## Architecture

```
┌─ Phase 1: Build Mapping ──────┐
│  Reads:  docs/extend/toc.yml  │
│          docs/extend/**/*.md  │
│          docs/redirects.yml   │
│          dev_docs/**/*.mdx    │
│          dev_docs/url-mapping.json
│          dev_docs/.artifacts/docs/html/links.json
│  Writes: dev_docs/_redirect_mapping.json
│          (optional) scripts/build_redirect_mapping.ts
└───────────────────────────────┘
              │
              ▼
┌─ Phase 2: Audit Existing ─────┐
│  Reads:  dev_docs/_redirect_mapping.json
│          dev_docs/**/*.mdx    │
│          dev_docs/url-mapping*.json
│  Writes: dev_docs/_audit_report.md
└───────────────────────────────┘
              │
              ▼
┌─ Phase 3: Update Files ───────┐
│  Reads:  dev_docs/_redirect_mapping.json
│  Writes: dev_docs/**/*.mdx (redirect_url + DocCallOut)
│          dev_docs/url-mapping.json
│          dev_docs/url-mapping-full.json
│          dev_docs/_needs_review.md
└───────────────────────────────┘
              │
              ▼
┌─ Phase 4: Verify (live) ──────┐
│  Prereq: user has `docs-builder serve` on :3000
│  Reads:  dev_docs/**/*.mdx (post-Phase-3)
│          dev_docs/_needs_review.md
│  Writes: dev_docs/_verify_report.md
└───────────────────────────────┘
```

### Key design decisions

- **`dev_docs/_redirect_mapping.json` is the single source of truth that
  flows through Phases 2–4.** If anything looks wrong, fix the mapping (not
  the mdx files) and re-run Phase 3 + Phase 4.
- **Phase 1 is the only "thinking" phase.** Phases 2–4 are mechanical.
- **Intermediate artifacts live under `dev_docs/` with leading underscores**
  (`_redirect_mapping.json`, `_audit_report.md`, `_needs_review.md`,
  `_verify_report.md`) so they are visibly transient.
- **URL derivation rule:** `docs/extend/<rel>/<name>.md` maps to
  `https://www.elastic.co/docs/extend/kibana/<rel>/<name>` (no `.md`
  extension, folder hierarchy preserved from the filesystem, which matches
  `toc.yml`).

## Phase 1 — Build Mapping

**Goal.** Produce `dev_docs/_redirect_mapping.json` mapping every legacy
slug to a resolved new URL (or `needs_review`).

**Inputs (read-only).**

- `docs/extend/toc.yml`
- `docs/extend/**/*.md`
- `docs/redirects.yml`
- `dev_docs/**/*.mdx`
- `dev_docs/url-mapping.json` (current broken state — useful only as a hint
  for the intended basename of the destination)
- `dev_docs/.artifacts/docs/html/links.json` (anchor inventory, for
  collision detection)

**Output schema** (`dev_docs/_redirect_mapping.json`):

```json
{
  "version": 1,
  "generated_at": "2026-05-18T...",
  "url_prefix": "https://www.elastic.co/docs/extend/kibana",
  "summary": {
    "exact": 0,
    "redirects_yml": 0,
    "best_guess": 0,
    "needs_review": 0
  },
  "entries": [
    {
      "legacy_mdx": "dev_docs/key_concepts/navigation.mdx",
      "legacy_slug": "/kibana-dev-docs/routing-and-navigation",
      "new_relpath": "key-concepts/platform-architecture/routing-navigation-and-url",
      "new_url": "https://www.elastic.co/docs/extend/kibana/key-concepts/platform-architecture/routing-navigation-and-url",
      "resolution": "exact",
      "evidence": [
        "docs/extend/key-concepts/platform-architecture/routing-navigation-and-url.md exists",
        "filename matches url-mapping.json target after folder-hierarchy correction"
      ],
      "notes": ""
    }
  ]
}
```

**Resolution algorithm** (deterministic; agent applies in order and stops at
the first hit):

1. **`redirects_yml`** — `docs/redirects.yml` is the highest-trust signal.
   Build a lookup key by taking the `url-mapping.json` target for the
   legacy slug, prefixing it with `extend/`, and appending `.md` (e.g.
   target `key-concepts/audit-logging` → lookup key
   `extend/key-concepts/audit-logging.md`). If that key exists in
   `docs/redirects.yml`, follow the redirect chain to its final target
   (resolve transitively if the value itself maps further). The final
   target's path (minus the `extend/` prefix and `.md` suffix) becomes
   `new_relpath`.
2. **`exact`** — the basename of the `url-mapping.json` target has exactly
   one match anywhere under `docs/extend/**/*.md`. Use that match's full
   relative path. Covers both same-folder and hierarchy-corrected cases.
3. **`best_guess`** — the basename has multiple matches OR is missing
   entirely. Pick the closest by token overlap with the legacy slug + the
   mdx frontmatter `title`. Record alternatives in `notes`.
4. **`needs_review`** — no match found, or genuinely ambiguous (multiple
   equally-plausible best-guesses). Set `new_url: null` and record
   candidates in `notes`.

**Implementation styles allowed.** Agent's choice:

- Hand-derive the JSON after walking files via tooling, OR
- Author `scripts/build_redirect_mapping.ts` (Node + TypeScript, only stdlib
  + `js-yaml` which is already a repo dependency) and commit both the script
  and its output. Script approach is preferred when the agent is comfortable
  with it because it makes the mapping reproducible if files move again.

**Guardrails.**

- Phase 1 MUST NOT modify any file other than
  `dev_docs/_redirect_mapping.json` and (optionally)
  `scripts/build_redirect_mapping.ts`.
- Phase 1 MUST NOT trust `dev_docs/url-mapping.json` as ground truth — it is
  the broken input we are fixing. Use it only as a hint for the basename of
  the intended destination.
- The four summary counts must equal the number of mdx files with a
  `redirect_url:` frontmatter field.

**Exit criteria.**

- `dev_docs/_redirect_mapping.json` exists and validates against the schema
  above.
- Every `dev_docs/**/*.mdx` with a `redirect_url:` has a corresponding
  entry. (Coverage assertion in the summary.)
- Counts logged in `summary` block and emitted in the agent's final message.
- Agent halts after writing the mapping. It does NOT edit any mdx file.

## Phase 2 — Audit Existing

**Goal.** Produce a compact, table-formatted, human-readable diff
(`dev_docs/_audit_report.md`) showing what's currently in each placeholder
versus what Phase 3 will write. Read-only — no file edits except the report
itself.

**Inputs.**

- `dev_docs/_redirect_mapping.json` (must exist; if missing, halt)
- All `dev_docs/**/*.mdx`
- `dev_docs/url-mapping.json` and `dev_docs/url-mapping-full.json`

**Output template** (`dev_docs/_audit_report.md`):

```markdown
# Redirect Audit Report — <date>

## Summary
| metric | count |
|---|---|
| total placeholders | N |
| already correct | N |
| will change | N |
| needs-review | N |
| frontmatter/body drift | N |

## Counts by resolution
| resolution | count |
|---|---|
| exact | N |
| redirects_yml | N |
| best_guess | N |
| needs_review | N |

## Per-file changes
| legacy_mdx | legacy_slug | current_url | proposed_url | resolution | drift |
|---|---|---|---|---|---|
| dev_docs/key_concepts/navigation.mdx | /kibana-dev-docs/routing-and-navigation | …/key-concepts/routing-navigation-and-url | …/key-concepts/platform-architecture/routing-navigation-and-url | exact | no |

## Mapping file changes
| file | entries changing | notes |
|---|---|---|
| dev_docs/url-mapping.json | N | all targets rewritten |
| dev_docs/url-mapping-full.json | N | domain + path rewritten |
```

Long URLs may use ellipsis in the table; the JSON mapping holds the full
values for any agent that needs them.

**Checks performed.**

- Every legacy mdx file has an entry in the mapping (sanity check on Phase
  1's completeness).
- Per-file drift detection: does the frontmatter `redirect_url:` match the
  body `DocCallOut` link? (Currently they appear consistent, but this check
  protects against silent divergence.)
- Schema validation: every entry has all required fields; `new_url` is
  `null` if and only if `resolution == "needs_review"`.
- Coverage check: every key in `dev_docs/url-mapping.json` has a
  corresponding entry, and vice versa.

**Guardrails.** Audit phase MUST NOT touch any file other than
`dev_docs/_audit_report.md`.

**Exit criteria.**

- `dev_docs/_audit_report.md` exists.
- Summary counts match the file count under `dev_docs/`.
- Agent emits the four `resolution` counts plus the four `summary` counts in
  its final message.

**Why this phase exists.** A human reviewer (or the project owner) can read
this report and approve or reject the mapping before any mdx file is
touched. If the report shows surprises, fix Phase 1's output (the mapping
JSON) and re-run Phase 2. Never edit mdx files based on a mapping you
haven't reviewed.

## Phase 3 — Update Files

**Goal.** Apply all changes implied by the mapping. Purely mechanical — no
decisions.

**Inputs (read).**

- `dev_docs/_redirect_mapping.json` (must exist; if missing, halt)
- All `dev_docs/**/*.mdx`
- Existing `dev_docs/url-mapping.json` and `dev_docs/url-mapping-full.json`

**Writes.**

1. **Each placeholder mdx** — for every entry where
   `resolution != "needs_review"`:
   - Replace the frontmatter `redirect_url:` value with `entry.new_url`.
   - Replace the body `DocCallOut` link target AND the visible link text
     with `entry.new_url`.
   - For `resolution == "best_guess"`, insert a single MDX comment near the
     top of the body:
     ```mdx
     {/* needs-review: best_guess resolution; alternatives: <list>; from _redirect_mapping.json */}
     ```
     The comment must not alter rendered output.
   - For `resolution == "needs_review"`, do NOT modify the file. Append its
     path to `dev_docs/_needs_review.md` instead.
   - Touch nothing else in the file (preserve frontmatter ordering, body
     text, blank lines).

2. **`dev_docs/url-mapping.json`** — regenerate from the mapping. Format:
   `{ "<legacy_slug>": "<new_relpath>" }` (preserves the existing schema
   where the value is a path, not a full URL). Skip `needs_review` entries.

3. **`dev_docs/url-mapping-full.json`** — regenerate. Format:
   `{ "https://docs.elastic.dev<legacy_slug>": "<new_url>" }` (preserves
   the existing schema where both sides are full URLs).

**Idempotency requirement.** Running Phase 3 twice against the same mapping
must be a no-op the second time. The agent must verify this on its own
output before exiting.

**Implementation note.** Edit each mdx file with a targeted string
replacement on the two URL occurrences (do not regenerate the file from
scratch) to preserve incidental formatting and any non-standard frontmatter
fields. The two URL strings are guaranteed identical within a single file
(the original generator wrote them that way), so a single string-replace is
safe. If the audit phase reports drift for a file, Phase 3 must fall back
to two separate replacements for that file.

**Guardrails.**

- Phase 3 MUST NOT touch any file outside `dev_docs/`.
- Phase 3 MUST NOT modify `docs/redirects.yml`, `docs/extend/`, or any
  source mdx body content other than the `DocCallOut` URL and (for
  `best_guess`) inserting the single MDX comment.
- Phase 3 MUST NOT make any "decisions" — every change is dictated by the
  mapping JSON. If the mapping says `needs_review`, the file is skipped.
- Phase 3 MUST NOT delete any placeholder.

**Exit criteria.**

- Every entry with `resolution != "needs_review"` has been applied to its
  mdx file (re-grep verifies the new URL is present and the old URL is
  absent).
- `dev_docs/url-mapping.json` and `dev_docs/url-mapping-full.json` are
  regenerated.
- `dev_docs/_needs_review.md` exists (possibly empty) listing skipped
  files.
- Agent emits a final summary: `files updated: N, mapping files updated: 2,
  skipped (needs_review): M`.

## Phase 4 — Verify (live)

**Goal.** Prove that every rewritten URL resolves to a real page on the
docs site. This is the "evidence before assertions" gate — Phase 3 cannot
be considered done without it.

**Prerequisite (manual).** The user starts `docs-builder serve` locally so
`http://localhost:3000` mirrors what will eventually live at
`https://www.elastic.co/docs/extend/kibana/`. The user confirms the server
is up before invoking Phase 4. The `docs-builder` binary does not run inside
the agent sandbox, so the agent depends on the user running it.

**Inputs.**

- All `dev_docs/**/*.mdx` (post-Phase-3) — agent extracts the
  `redirect_url:` from each frontmatter.
- `dev_docs/_needs_review.md` (to know which files were intentionally
  skipped).
- Configurable base URLs:
  - `local_base_url` (default `http://localhost:3000`)
  - `production_base_url` (`https://www.elastic.co/docs/extend/kibana`)

**Procedure.**

1. Read every `dev_docs/**/*.mdx`. For each with a `redirect_url:`, extract
   the URL.
2. Compute the local equivalent by replacing the `production_base_url`
   prefix with `local_base_url`. Preserve the rest of the path.
3. Curl each local URL with `-o /dev/null -s -w "%{http_code}"`. Use GET
   (not HEAD) since static-site servers often misbehave with HEAD.
4. A request is `PASS` iff status is `200`. Anything else (301, 404, 500,
   connection refused) is `FAIL`.
5. Cross-check: every file listed in `_needs_review.md` should NOT appear
   in the verify report (it should still have its old broken URL; Phase 4
   skips these and notes them separately).
6. If `docs-builder serve` is not reachable on `localhost:3000`, agent
   stops immediately with a single clear message and does not curl any
   production URL. We never hammer the live site.
7. Use a small concurrency cap (e.g. 5 in-flight requests).

**Output template** (`dev_docs/_verify_report.md`):

```markdown
# Verify Report — <date>

## Summary
| metric | count |
|---|---|
| checked | N |
| pass (200) | N |
| fail | N |
| skipped (needs_review) | N |

## Failures
| legacy_mdx | new_url | local_url | status |
|---|---|---|---|
| dev_docs/foo/bar.mdx | …/foo/bar | http://localhost:3000/foo/bar | 404 |

(Section must be present even when empty, for grep-ability.)

## Passes
<details><summary>show passes</summary>

| legacy_mdx | new_url | status |
|---|---|---|
| … | … | 200 |

</details>

## Skipped
| legacy_mdx | reason |
|---|---|
| dev_docs/x/y.mdx | needs_review (no resolvable target in mapping) |
```

**Guardrails.**

- Phase 4 MUST NOT modify any file other than `_verify_report.md`.
- Phase 4 MUST NOT hit production URLs (`www.elastic.co/docs/extend/...`).
  Localhost only.

**Exit criteria.**

- `dev_docs/_verify_report.md` exists.
- Agent declares **PASS** only if `fail == 0`. Any failure means: re-open
  Phase 1 (or hand-edit the mapping JSON), re-run Phase 3, re-run Phase 4.
  Do NOT band-aid a failure by editing the mdx file directly.
- Agent emits the summary counts in plain text at the end.

## Cross-cutting concerns

### Branch and commit hygiene

Each phase commits its artifacts before the next phase runs so the diff per
phase is reviewable in isolation. Suggested commit titles:

- `docs(redirects): phase 1 — build mapping`
- `docs(redirects): phase 2 — audit`
- `docs(redirects): phase 3 — update`
- `docs(redirects): phase 4 — verify`

### Rollback

Phases 1–3 are file-based and each commits independently, so any phase can
be rolled back with `git revert <commit>`. Phase 4 writes only a report.

### Re-runnability

- Phase 1 is fully deterministic given its inputs.
- Phase 3 is idempotent.
- The loop "fix mapping → re-run Phase 3 → re-run Phase 4" works without
  any cleanup.

### Scope lock

The playbook explicitly forbids touching `docs/extend/**`,
`docs/redirects.yml`, or anything outside `dev_docs/`. The only exception is
the optional Phase 1 helper script at `scripts/build_redirect_mapping.ts`.

### Phase dispatch

Each of the four phase descriptions above is self-contained: each lists its
inputs, outputs, algorithm, guardrails, and exit criteria. A separate agent
can be dispatched against any single phase with no context from prior
phases other than the artifact file it consumes.

## Open items (intentional)

- The `best_guess` similarity heuristic is left loose. The first
  implementation may pick the cheapest workable choice (e.g., longest
  common substring on the slug + title). Tightening it is fine if Phase 2's
  audit shows poor picks.
- The placeholder for the optional helper script
  (`scripts/build_redirect_mapping.ts`) deliberately specifies behavior and
  inputs but not code structure. The Phase 1 agent decides whether to
  produce a script and what it looks like.
