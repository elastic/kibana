# PR Review API Reference

Detailed reference for creating, verifying, and submitting PR reviews via `gh api`. See the main skill for the core rules on pending vs published reviews.

## Creating a Pending Review

- Always submit the review-creation request via `--input <file>` pointing at a JSON file. The strip-review-event hook denies every `-f event=...` / `-F event=...` / `--field event=...` flag shape on the creation endpoint because the only safe sanitisation is parsing the JSON file.
- The `--input` path must not contain `$VAR`, `$(...)`, backticks, or a leading `~`; the hook reads the literal path and cannot expand shell metacharacters. Pass an absolute or already-expanded path.
- `--input -` (stdin) is denied — the hook can't inspect or rewrite stdin.
- Include all inline comments in the `comments` array in the same request.
- Every inline comment must resolve to a valid diff anchor.
- GitHub allows only one `PENDING` review per user per PR. Pending comments are not editable via API — do not try to PATCH them or attach new comments via the PR comments endpoint (it won't accept `pull_request_review_id`). If you need to change bodies or anchors, delete the pending review and recreate it.
- File-level review comments (`subject_type=file`) are immediately visible; they are not part of a pending review.
- Keep the review summary body empty unless the user explicitly wants a public summary.

## Comment Anchoring

Prefer `line`/`side` anchoring over `position` (less error-prone):

- Use `line` (the file line number on the right side) + `side: "RIGHT"`.
- For left-side-only comments, use `side: "LEFT"` + the old-file line number.
- For multi-line ranges, add `start_line` + `start_side`.
- The `line`/`side` approach uses absolute file line numbers (visible in the GitHub diff UI), so there is no off-by-one math to get wrong.

Avoid `position` unless `line`/`side` cannot express the anchor. GitHub's REST docs describe `position` as closing down, and say it is "the number of lines down from the first `@@` hunk header" where the line just below that header is position 1.

- Fetch the file's `patch` from `GET /repos/{o}/{r}/pulls/{n}/files`.
- Count from the first `@@` hunk header using GitHub's definition; do not treat source-file line numbers as positions.
- If a file has multiple hunks (or repeated target lines), create separate comments and verify the correct hunk/occurrence.
- Common trap: the patch changes when new commits are pushed. Always re-fetch the patch from the current PR head before computing positions.
- After posting, read back the returned comment and confirm the `path`, `line`, `side`, and `position` match the intended anchor.

## Verification

After creating a review:

- Confirm the review is PENDING: `gh api repos/elastic/kibana/pulls/NUM/reviews --jq '.[] | {id,state}'`
- Confirm pending review has N draft comments: `gh api repos/elastic/kibana/pulls/NUM/reviews/REVIEW_ID/comments --jq 'length'`
- Confirm visible PR review comments are still empty (until submission): `gh api repos/elastic/kibana/pulls/NUM/comments --jq 'length'`

After submitting a review:

- The submitted review body is whatever you submit with the final event call. If you want a summary, include it explicitly when submitting.
- For COMMENT/REQUEST_CHANGES, treat the body as required: always include it.
- Count posted inline comments and reconcile anything missing; if needed, post a follow-up (non-batch) comment with leftover deep links.

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

## Example: Create a Pending Review

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

# Submit later (include body explicitly if you want a summary):
gh api repos/elastic/kibana/pulls/NUM/reviews/REVIEW_ID/events -X POST -f event=APPROVE -f body=$'Looks good.'
```
