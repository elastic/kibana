---
name: kbn-github
description: GitHub interactions via gh CLI for the Kibana repo. Use when performing any GitHub interaction — creating, viewing, or modifying PRs or issues, posting comments or reviews, checking CI status, applying labels, creating releases, or making any gh/API call.
---

# GitHub (gh CLI)

## Defaults & Constraints

- Use `gh` CLI for all GitHub interactions.
- Set `GH_PAGER=cat` for all `gh` calls to avoid interactive pagers.
- The repo is `elastic/kibana`; use `-R elastic/kibana` when not inside a local clone.
- Follow repository merge settings (squash/rebase/merge); do not enforce a merge strategy.
- Never merge into the base branch via CLI; merges happen via the GitHub UI.

## First Actions

1. Resolve the exact target repo/object (PR, issue, comment thread, release) before mutating anything.

## PR Targeting

- If the user uses implicit-current phrasing ("this PR", "current PR", "PR for this branch") and does not specify a PR URL/number, resolve the PR for the current branch: `gh pr view --json number -q .number`.
- Do not assume an unspecified GitHub task targets the current branch PR unless the wording clearly implies the current PR.

## PR Workflow

- Always open PRs as draft: `gh pr create --draft`.
- Check CI status: `gh pr checks`.
- View PR details: `gh pr view`.
- View PR diff: `gh pr diff`.
- List PR files: `gh pr diff --name-only`.
- Read PR review comments:
  `gh api repos/elastic/kibana/pulls/{number}/comments`.

## PR Creation

- Always ask which existing issue the PR should reference (do not invent issue numbers).
- Ask the user whether the PR should `Closes #X` or `Addresses #X` before creating the PR.
- If there is no existing issue, stop and ask whether to create one; do NOT create issues unless the user explicitly instructs you to.
- PR title is a human-readable change summary (not necessarily the Conventional Commit header).

## Issue Workflow

- View an issue: `gh issue view {number}`.
- Search issues: `gh issue list --search "query"`.
- Create an issue: `gh issue create`.

## Approvals

- Any GitHub side effect requires explicit approval unless the user instructed otherwise. Examples (non-exhaustive): create/edit PRs or issues, post comments/reviews, apply metadata (labels/assignees/milestones/projects), merge, or create releases.

## PR Review Side Effects (Draft / Pending Reviews)

> **CRITICAL — pending vs published reviews:**
>
> - When the user says "pending review", "draft review", or "post pending": the review MUST stay in `PENDING` state (visible only to you, not the PR author).
> - **NEVER include `event` in the create-review payload.** If you include `"event": "COMMENT"` (or `APPROVE` / `REQUEST_CHANGES`), the review is **immediately and irreversibly published** to the PR author and all subscribers.
> - The default behavior of `POST /reviews` **without** `event` is `PENDING`. That is the only safe way to create a draft review.
>
> **Pre-flight checklist (mandatory before every review POST):**
>
> 1. Read back the JSON payload you are about to send.
> 2. Confirm the `event` key is **absent** from the payload.
> 3. If `event` is present, **remove it** before sending.
> 4. Only add `event` in a **separate** submit call after the user explicitly asks to publish.

- Create a PENDING review by omitting `event` in: `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- Include all inline comments in the `comments` array in that same request.
- Every inline comment must resolve to a valid diff anchor.
- GitHub allows only one `PENDING` review per user per PR. Pending comments are not editable via API — do not try to PATCH them or attach new comments via the PR comments endpoint (it won't accept `pull_request_review_id`). If you need to change bodies or anchors, delete the pending review and recreate it.
- File-level review comments (`subject_type=file`) are immediately visible; they are not part of a pending review.
- Verification:
  - `GET /repos/{o}/{r}/pulls/{n}/reviews` will show the `PENDING` review
  - `GET /repos/{o}/{r}/pulls/{n}/comments` should remain unchanged until you submit (draft comments are attached to the review, not publicly posted)
- Prefer `line`/`side` anchoring over `position` (less error-prone):
  - Use `line` (the file line number on the right side) + `side: "RIGHT"`.
  - For left-side-only comments, use `side: "LEFT"` + the old-file line number.
  - For multi-line ranges, add `start_line` + `start_side`.
  - The `line`/`side` approach uses absolute file line numbers (visible in the GitHub diff UI), so there is no off-by-one math to get wrong.
- If you must use `position` (diff-relative, 0-indexed from the `@@` header):
  - Fetch the file's `patch` from `GET /repos/{o}/{r}/pulls/{n}/files`.
  - Split by newlines. The `@@` hunk header at index 0 = position 0 (not a valid comment target). The first content line at index 1 = position 1.
  - In short: the 0-based array index of the split **is** the position value.
  - If a file has multiple hunks (or repeated target lines), create separate comments and verify the correct hunk/occurrence.
  - Common trap: the patch changes when new commits are pushed. Always re-fetch the patch from the current PR head before computing positions.
- Keep the review summary body empty unless the user explicitly wants a public summary.

After submitting, verify what actually posted:

- The submitted review body is whatever you submit with the final event call. If you want a summary, include it explicitly when submitting (COMMENT/APPROVE/REQUEST_CHANGES).
- For COMMENT/REQUEST_CHANGES, treat the body as required: always include it.
- Count posted inline comments and reconcile anything missing; if needed, post a follow-up (non-batch) comment with leftover deep links.

Example (create a pending review with line/side anchoring — preferred):

```bash
cat > /tmp/review-payload.json <<'JSON'
{
  "commit_id": "HEAD_SHA",
  "body": "",
  "comments": [
    { "path": "path/to/file.ts", "line": 42, "side": "RIGHT", "body": "Comment text." },
    { "path": "path/to/file.ts", "line": 78, "side": "RIGHT", "body": "Another comment." }
  ]
}
JSON

gh api repos/elastic/kibana/pulls/NUM/reviews -X POST --input /tmp/review-payload.json

# Verify:
# - Confirm the review is PENDING:
gh api repos/elastic/kibana/pulls/NUM/reviews --jq '.[] | {id,state}'
# - Confirm pending review has N draft comments:
gh api repos/elastic/kibana/pulls/NUM/reviews/REVIEW_ID/comments --jq 'length'
# - Confirm visible PR review comments are still empty (until submission):
gh api repos/elastic/kibana/pulls/NUM/comments --jq 'length'

# Submit later (include body explicitly if you want a summary):
gh api repos/elastic/kibana/pulls/NUM/reviews/REVIEW_ID/events -X POST -f event=APPROVE -f body=$'Looks good.'
```

## Posting PR Review Comments

Inline review comment (line or range; supports GitHub suggestion blocks):

````bash
gh api repos/elastic/kibana/pulls/NUM/comments -f body=$'Text.\n\n```suggestion\ncode\n```' -f commit_id=SHA -f path=FILE -f side=RIGHT -f line=LINE
````

For multi-line, add: `-f start_line=START -f start_side=RIGHT`.

File-level review comment (file-scoped, immediately visible):

```bash
gh api repos/elastic/kibana/pulls/NUM/comments \
  -f body=$'Text.' \
  -f commit_id=SHA -f path=FILE -f subject_type=file
```

Reply in an existing review thread:

```bash
gh api repos/elastic/kibana/pulls/NUM/comments \
  -f body=$'Text.' \
  -F in_reply_to=COMMENT_ID
```

- The request field is `in_reply_to` (integer). The response field is `in_reply_to_id`.
- Do NOT use `in_reply_to_id` in the request; it may create a new top-level comment instead of a reply.
- If you are posting an anchored comment that requires `commit_id`, and GitHub rejects it as "commit_id is not part of the pull request", use the `commit_id` from the target review comment you're replying to.

PR-level timeline comment (use sparingly):

```bash
gh pr comment NUM -b "<text>"
```

## Advanced / API

- For anything beyond standard `gh` subcommands, use `gh api` with the GitHub REST or GraphQL endpoints.
- Multiline bodies/comments: use bash/zsh `$'...'` so `\n` becomes real newlines. Do NOT rely on `\\n` escapes inside normal quotes (especially `gh api -f body=...`).
- Payloads with arrays: prefer `gh api ... --input /path/to/payload.json` over `-f`/`-F` flags to avoid shell escaping issues.
- If you need to add query params to a GET `gh api` call, use `-X GET`. In practice, adding `-f` or `-F` without `-X GET` can cause `gh` to hit the POST schema by default.
- zsh gotcha: avoid unquoted `?ref=...` in endpoints (triggers `no matches found`). Prefer: `gh api -X GET repos/elastic/kibana/contents/PATH -F ref=main`.

## Output & Verification

- Before each side effect, restate the exact target and action you are about to perform.
- After each side effect, verify via read-back (`gh`/API) and report the URL, identifier, or resulting state.

Do not add/modify repo `.github/*` templates unless the user explicitly asks.

## Sub-Issues API

GitHub's sub-issue API creates real parent-child relationships (not tasklists).

Create hierarchy:

1. Create child issues first with full descriptions.
2. Get GraphQL IDs:

   ```bash
   gh api graphql -f query='{ repository(owner:"elastic",name:"kibana") { issue(number:N) { id } } }'
   ```

3. Link:

   ```bash
   gh api graphql -f query="mutation { addSubIssue(input:{issueId:\"PARENT_ID\",subIssueId:\"CHILD_ID\"}) { issue { number } } }"
   ```

4. Verify: `gh api repos/elastic/kibana/issues/NUM/sub_issues`

Mutations: `addSubIssue`, `removeSubIssue`, `reprioritizeSubIssue`
