# Claude reviewer

The Claude reviewer is a GitHub Agentic Workflow (`.github/workflows/reviewer-claude.md`) that follows the instructions in `.github/agents/code-reviewer.md`. It posts as `github-actions[bot]`, which it shares with the Codex (`reviewer:codex`) and Scout (`reviewer:scout`) reviewers. Only the marker in the review body, `workflow_id: reviewer-claude`, says which reviewer wrote a review. `pr.sh` matches on that marker, so it never picks up another reviewer's threads.

## When it reviews

- It runs only while the PR has the `reviewer:claude` label, and never when it has `reviewer:skip-ai`. Don't add or remove either label yourself.
- Adding the label starts a review. After that, every push of a normal commit starts one. Merge commits are skipped, which is why the loop's fix commit goes on top of any merge.
- It reviews draft PRs too.
- A run waits in the GitHub Actions queue, then can take up to about half an hour. A push while a review is running cancels that review and starts a new one.

`pr.sh wait --for claude` finds the workflow runs for the commit. Every label change also starts a run that skips the review, so the script ignores those. It reports `findings` with the review ID when the run posted a review, `clean` when it finished without one, `skipped` when no run on that commit reviewed it, and `error` when the run failed or was cancelled.

## Where findings appear

All findings are inline threads (`pr.sh threads <pr> --reviewer claude`), at most 10 per review. The review body is only a summary and contains no extra findings.

Some comments include a GitHub `suggestion` block. Apply it only if it's the right fix, and still sweep for other instances of the rule.

On later pushes, it reviews only the new changes and doesn't repeat findings on unchanged lines.

## Replies and follow-ups

Claude reads a reply only when the reply mentions `@claude`. Such a reply starts a separate follow-up run that answers in the same thread. That answer comes back from `threads` with `followUp: true` in a later round.

- **Valid**: reply without mentioning `@claude`. The review of the pushed fix checks the thread anyway.
- **False positive** or **out of scope**: start the reply with `@claude` so it can reconsider. Each mention starts a run, so mention it once per reply, and only in those replies.

Don't post a top-level `@claude` comment to ask for a new review; the push already starts one.

If a round ends without a push, Claude's answers to that round's replies arrive after the loop stops. List those threads in the final report as waiting for Claude.

## Resolving

Don't resolve Claude's threads yourself. When it reviews the next push, it resolves its own threads whose concern is fixed, which also confirms the fix. List any Claude thread you fixed that is still unresolved at the end in the final report.

## Self-review

Before committing, read the round's diff against the review priorities in `.github/agents/code-reviewer.md`.
