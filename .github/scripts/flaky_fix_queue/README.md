# Flaky fix queue

`ai:fix-flaky` requests an automatic fix. The investigator and humans keep using
the same label. The dispatcher polls every 15 minutes; it does not require an
issue event to survive GitHub Actions' pending-run cancellation behaviour.

The default limits are five outstanding fixes and one active fixer per owning
team. Change `MAX_OUTSTANDING` and `MAX_RUNNING` in
[the dispatcher workflow](../../workflows/flaky_fix_dispatcher.yml) to tune them.

- `MAX_OUTSTANDING` limits unfinished work per team: open fix PRs plus active
  fixer runs, counting a run and its resulting PR only once. It limits the backlog.
- `MAX_RUNNING` limits fixer runs active at the same time per team, including
  queued executions. It limits simultaneous investigations and fixes.

## Admission

- Team buckets come from the source issues' `Team:` or legacy `:area` labels.
  These are workload proxies, not CODEOWNERS or requested reviewers. Multi-team
  requests consume capacity in every team; unowned requests share an `unowned` bucket.
- Open `flaky-test-fixer` PRs, including drafts, consume capacity through the issues
  their bodies close. There is no issue-age cutoff. A PR counts once per team even
  if it closes several issues. PRs without a closing reference use their own team labels.
- Queued, running, waiting, and pending fixer executions also consume capacity.
  An execution that already produced a counted PR is not counted twice.
- Waiting issues keep their label and consume no capacity. Within available
  capacity, label application time determines order, not issue creation time.
- Closing an issue or removing its request label cancels a waiting request.
- One dispatcher at a time admits work. The investigator's existing eligibility
  rules and opt-outs remain in place.
- Manual `workflow_dispatch` of Flaky Test Fixer remains a capacity override.
  Its execution and resulting PR still count against later automatic admissions.

## Attempts and recovery

The label event ID identifies a request. Before dispatch, a bot comment records
an admission receipt. The dispatcher requests GitHub's run ID, verifies the run
identity, and updates that comment with the run link. The original label actor is
passed to the fixer for mentions and reviewer requests.

This receipt makes attempts durable even if Actions run listings lag. A completed
or failed attempt is not automatically retried while its label remains present.
After a failure, remove and reapply `ai:fix-flaky` to create a new request.
Do not reapply it while the old fixer is still running.

If the dispatcher stops between reserving and recording a run, the receipt says
`run:pending`. That team's slot stays occupied; dispatch is never blindly retried.
Inspect the failed dispatcher and fixer runs. If a run was created, wait for it to
finish. Then remove/reapply the label to retry, or remove it to abandon the request.
A removed label does not cancel an already started execution.

Incomplete API reads fail the sweep before admission. A disappeared run referenced
by a receipt also requires inspection rather than silently freeing its capacity.
During rollout, active fixer runs with the old, unidentifiable title temporarily
pause admission until they finish.

The dispatcher supports a read-only `dry_run` input (the default for manual
dispatcher runs). Schedules perform real admission. Its logs show admitted and
capacity-deferred requests; it does not repeatedly comment on waiting issues.

## Validation

These standalone scripts run under Node's native TypeScript stripping in
`actions/github-script@v9`; Kibana bootstrap is not needed on the dispatcher runner.

From a bootstrapped checkout using the pinned Node version:

```sh
node --test .github/scripts/flaky_fix_queue/*.test.ts
node node_modules/typescript/bin/tsc -p .github/scripts/flaky_fix_queue/tsconfig.json
gh aw compile flaky-test-fixer failed-test-investigator --validate --no-check-update
```

The tests simulate GitHub state across successive sweeps, including a 13-request
burst, reviewer backlog limits, delayed run indexing, re-labelling, and failures
before/after dispatch. API adapter tests exercise Octokit's actual pagination
against simulated HTTP responses without sending requests to GitHub.
