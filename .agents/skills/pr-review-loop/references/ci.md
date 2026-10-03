# CI

Kibana's PR pipeline is the Buildkite pipeline `kibana-pull-request`. It reports on each commit as the `kibana-ci` commit status, whose link is the build. `.buildkite/pull_requests.json` configures when it runs:

- It builds every push to a non-draft PR. Drafts build only with the `ci:build-draft` label, and the `skip-ci` label turns it off.
- It skips commits that only change files such as docs, `.md` files, `.github/` or `.libra/`. `pr.sh wait --for ci` then reports `none`, which is expected.
- A PR comment that is exactly `/ci` (or `buildkite test this`) starts a new build of the PR head.

kibanamachine pushes fix-up commits to PR branches, and CI runs again on them. That's why `pr.sh wait --for ci` follows the PR head instead of a fixed SHA.

## Reading a failure

Use the `bk` CLI. It needs a Buildkite token (`BUILDKITE_API_TOKEN` or `bk auth login`); if it isn't set up, ask the user.

1. Take the build number from the `url=` that `wait` printed (`https://buildkite.com/elastic/kibana-pull-request/builds/<number>`).
2. List the failed jobs:

   ```bash
   bk build view <number> -p kibana-pull-request -s failed,broken -o json
   ```

3. Read each failed job's log in a form sized for an agent:

   ```bash
   bk job log <job-id> --agent --format markdown --max-tokens 4000
   ```

When the build has finished, kibanamachine also posts a "Build Failed" comment on the PR listing the failed steps and tests with links. Read the newest one:

```bash
gh pr view <pr> --json comments --jq '[.comments[] | select(.author.login == "kibanamachine")] | last | .body'
```

## Triage

Each failed job or test is a finding:

- **Caused by the PR** (valid): the failure is in code, tests, types or lint rules the PR touches or affects. Reproduce it locally first, for example with `node scripts/jest <test file>`. Then fix it like any other valid finding: state the rule, sweep, fix, and confirm the test passes locally.
- **Flaky or unrelated** (out of scope): the failure is in an area the PR doesn't affect, an open issue already tracks the test, or the job failed on infrastructure (lost agent, timeout, network). Look for a tracking issue:

  ```bash
  gh issue list -R elastic/kibana --label failed-test --state open --search "<test title>"
  ```

Never skip, disable or delete a test to make CI pass.

## Retrying flaky failures

Retry each flaky or unrelated failed job once per commit. Note the time first, then retry the job, not the whole build:

```bash
since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
bk job retry <job-id>
```

If your token can't retry jobs, comment `/ci` on the PR instead, which rebuilds everything. Then wait with `--since`:

```bash
pr.sh wait <pr> --for ci --since "$since"
```

Until the new attempt reports, the `kibana-ci` status still shows the failure you retried. `--since` makes `wait` ignore it, so the result you get is the retry's. If the same job fails again, stop retrying and list it in the final report with the build link and any tracking issue.
