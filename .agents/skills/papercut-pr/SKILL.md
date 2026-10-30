---
name: papercut-pr
description: Turn a screenshot or short description of a small UI bug or papercut into a draft PR with before/after screenshots embedded in the PR description. Use when the user shares a screenshot of something visibly wrong (misalignment, overflow, wrong spacing, broken layout, clipped text, wrong icon or color) and wants it fixed, or asks for a "papercut PR". Not for features, new UX patterns, copy changes, or anything that needs design or product decisions.
---

# Papercut PR

Go from "this looks wrong" (usually a screenshot) to a draft PR whose description shows before and after screenshots. No GitHub issue is created. The reviewer sees the evidence directly in the PR.

## Scope gate (do this first)

Continue only if all of these hold. Otherwise stop, say why, and suggest an issue or a conversation with the owning team instead.

- It is a bug or papercut: something is broken or inconsistent, not something that could be done differently.
- The fix needs no new UX pattern and no design decision. Removing or restoring existing behavior, aligning with an existing pattern, or fixing spacing, wrapping, overflow or a wrong token is fine.
- No new or changed user-facing text, no HTTP API, schema, saved object or config change.
- The diff is small, roughly 50 changed lines or fewer in one module.

If the fix visibly changes the design (a divider disappears, spacing changes, a control moves), it can still be a papercut, but the PR must say **Design change: yes** (see the template).

## Workflow

1. **Restate.** In two sentences, say what is wrong in the screenshot and what "fixed" looks like. If the screenshot does not show enough (viewport, data, state), ask for it once.
2. **Dedup.** Search for an existing PR or issue before writing code:
   `GH_PAGER=cat gh pr list -R elastic/kibana --search "<area keywords>" --state open` and `gh issue list -R elastic/kibana --search "<area keywords>" --state open`.
   If one already covers it, stop and link it.
3. **Reproduce and capture "before".** Follow [references/capture_screenshots.md](references/capture_screenshots.md). The before shot must use the same viewport and state as the user's screenshot.
4. **Fix.** Make the smallest change that fixes it. Follow the module's existing patterns and the UI rules in `.claude/CLAUDE.md` (public component props, Emotion, EUI tokens; no internal class names, no `!important`).
5. **Capture "after"** with the same script, viewport and data as "before". If a measurement shows the difference (pixel offset, width, count), record it for the PR.
6. **Verify.** Run only what the change touches: the scoped Jest test, `node scripts/eslint <files>`, and `node scripts/type_check --project <tsconfig>`. Run `git status` and confirm no screenshots, scratch specs or `.scout` artifacts are staged.
7. **Open the draft PR** with `gh pr create --draft` and `--attach` (below). Use [references/pr_template.md](references/pr_template.md) for the body.
8. **Read back** the PR with `gh pr view <n> --json body` and confirm the images were rewritten to `github.com/user-attachments/...` URLs. Report the PR URL.

## Embedding screenshots in the PR description

`gh` can upload images itself. Do not commit screenshots, and do not push them to a branch or fork.

- Write the body to a file with local references, for example `![Before](./before-overview-1100.png)` and `![After](./after-overview-1100.png)`.
- Pass the same files with `--attach`. `gh` uploads them to GitHub and rewrites the references in the body to the hosted URLs:

```bash
gh pr create --draft \
  --title "[<Area>] <human-readable summary>" \
  --body-file "$TMP/body.md" \
  --attach "$TMP/before-overview-1100.png#Before: <what is wrong>" \
  --attach "$TMP/after-overview-1100.png#After: <what it looks like now>"
```

- Paths in `--body-file` resolve relative to the body file's directory, so keep the body and the screenshots in the same temp directory outside the repo.
- Use `gh pr edit <n> --attach ...` to add or replace images on an existing PR. Without a body flag, the images are appended to the current body.
- `--attach` takes images and video (a short screen recording works for interaction bugs). Up to 50 files per command.
- If some uploads fail, `gh` still creates the PR with the ones that worked and exits non-zero. Check the read-back and retry the missing ones with `gh pr edit`.
- Requires `gh` 2.99.0 or later (`gh --version`), and an account that can push to the target repository. The Actions `GITHUB_TOKEN` cannot attach.

Before attaching, look at every screenshot. Kibana is a public repository, so the images must not contain customer data, real hostnames, credentials or personal data. Use mock or generated data.

## Rules

- Always a draft PR. Never mark it ready, apply labels, request reviewers or merge unless the user asks. Suggest labels in the PR body instead (`release_note:skip` for visual fixes).
- Follow the repository's PR conventions in the `kbn-github` skill, including pushing from the user's fork and using the PR target the user normally uses.
- Never commit scratch specs, screenshots or temp files.
- Do not widen the scope. If you notice a second problem, mention it in your reply and leave it out of the PR.
- If the change cannot be verified visually (the screenshot cannot be reproduced locally), say so in the PR instead of implying it was verified.
