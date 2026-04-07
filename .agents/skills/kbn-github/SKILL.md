---
name: kbn-github
description: GitHub interactions via gh CLI for the Kibana repo. Use when performing any GitHub interaction — creating, viewing, or modifying PRs or issues, posting comments or reviews, checking CI status, applying labels, creating releases, or making any gh/API call.
---

# GitHub (gh CLI)

## Defaults & Constraints

- Use `gh` CLI for all GitHub interactions.
- Set `GH_PAGER=cat` for all `gh` calls to avoid interactive pagers.
- The repo is `elastic/kibana`; when not inside a local clone, prefer `-R elastic/kibana` for `gh` subcommands. For `gh api`, `-R` is not supported; use explicit `repos/elastic/kibana/...` endpoints or set `GH_REPO=elastic/kibana` when using `{owner}/{repo}` placeholders.
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

## PR Reviews

> **Read [references/review.md](references/review.md) before creating or modifying any PR review.** It contains mandatory instructions for comment anchoring, verification, and avoiding irreversible API mistakes.

### Core Rule: Pending vs Published

- Never include `event` in a review-creation payload (`POST /repos/{o}/{r}/pulls/{n}/reviews`). Without `event` the review stays `PENDING`; with it, the review is **immediately and irreversibly published**.
- Always verify that the `event` key is absent from your review-creation payload before executing the command.
- To publish a review, you must use the separate submission endpoint: `POST /repos/{o}/{r}/pulls/{n}/reviews/{id}/events` with `-f event=APPROVE` (or COMMENT / REQUEST_CHANGES).

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
