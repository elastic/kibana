---
name: bot-parity-review
description: Fresh-eyes review of local, not-yet-pushed changes using the exact same criteria the real @claude GitHub PR bot applies, so its findings surface before a PR exists instead of after.
allowed-tools: Read, Grep, Glob, Bash
context: fork
disable-model-invocation: true
argument-hint: "[base-ref, defaults to main]"
---

# Bot-Parity Review

The real `@claude` PR bot (`.github/workflows/reviewer-claude.md`, using the instructions in
`.github/agents/code-reviewer.md`) regularly finds issues that pre-PR review passes like `review-connector`
miss. Two separate gaps cause that:

1. **Different criteria.** `review-connector` is a connector-domain checklist (`OWNER` export, `lazySchema()`
   wrapping, ICU-unsafe text, auth field defaults, etc.). The real bot applies a completely different,
   generic checklist — correctness, security/authz, test sufficiency, architectural fit, backward
   compatibility — and there is no routing that ever makes it load `review-connector` instead. Nothing
   upstream of the real PR currently checks the bot's actual criteria at all.
2. **Same-agent bias.** Upstream review happens inline, in the same agent session that wrote the code — no
   fresh, uninvolved reviewer looks at the diff before the real bot does.

This skill closes both gaps: it runs the bot's own review criteria, in a forked context with no memory of
having written the change, before any PR exists.

## Step 1: Determine the base ref and compute the diff

Use `$ARGUMENTS` as the base ref if given, otherwise `main`. From the repo root
(`git rev-parse --show-toplevel`), run:

```bash
git diff "$(git merge-base <base-ref> HEAD)"...HEAD --stat
```

to list every changed file, then inspect each file's actual diff one at a time:

```bash
git diff "$(git merge-base <base-ref> HEAD)"...HEAD -- <file>
```

Review the files in the order `--stat` listed them. Do not assume you already know what changed or why —
treat this exactly like reviewing a stranger's diff cold, the way the real bot reviews a PR it didn't write.

Skip generated or output-only files exactly as the real bot's own process instructs it to — e.g.
`all_specs.ts`, `connector_icons_map.ts`, or any file whose header says "GENERATED FILE - DO NOT EDIT BY
HAND".

## Step 2: Apply the bot's own review criteria

Read `.github/agents/code-reviewer.md` (from the repo root) in full, right now — do not paraphrase it from
memory or from this skill's summary above, since that document changes independently of this skill and is
the actual source of truth for what the real bot checks. Apply its "Review priorities", "Report when the
issue is concrete", and "Do not report" sections verbatim to every file from Step 1.

Ignore every other part of `code-reviewer.md` — it also contains instructions that only make sense against
a real, already-open PR (reading prefetched artifacts under `/tmp/gh-aw/agent/`, posting inline comments
with `create-pull-request-review-comment`, submitting a review with `submit-pull-request-review`,
deduplicating against prior review threads, follow-up response mode). None of that applies here: there is no
PR yet, and this skill never writes GitHub review comments.

## Step 3: Report back

List every distinct concrete finding retained across the full pass, with a file and line reference for
each, exactly as if it were the inline comment the real bot would have posted. Do not fix anything yourself
— this skill only reports, matching the real bot's own read-only behavior. Do not stop at the first issue
found in a file; keep going through every changed file before reporting.

If you find nothing after reviewing every changed file, say exactly "No issues found" and nothing else.
