# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads the JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job. With
`--report-failing-suites` it also files one `Failing … suite` issue per test file whose tests
started failing every attempt build after build, by the Scout test events, in `elastic/kibana` or
the `--failing-suites-repo owner/name` given.

Issues for FTR, Jest (unit and integration) and Scout tests link to the
[Single test history](https://ops.kibana.dev/s/ci/app/dashboards#/view/test-failure-history)
dashboard in the CI space, which shows the test's daily passed and failed attempts, its daily
failure percentage and its recent failed attempts with their Buildkite jobs. Existing issues get
the link the next time the reporter updates them; failure comments on `main` include it too.
Tests without an exact file path get no link.

For every failure the reporter asks ci-stats which `failed-test` issue tracks the test, by name,
file or Scout test id, and links it from the failure's HTML report, the Buildkite annotation and
the Slack message. If that issue is a flaky suite issue (see below), the failure is recorded there
as on a per-test issue: the count goes up, the issue is reopened if needed and a comment names the
test and the build. The count is kept in the issue's `failed-test` metadata; the daily report's
body and `flaky-test-suite` metadata are left alone.

## `node scripts/report_flaky_test_issues`

Files one `failed-test` issue per flaky test suite, from the report written by
`node scripts/scout discover-flaky-tests`, and keeps those issues up to date while the suite stays
flaky. The `kibana-report-flaky-tests` pipeline runs it every day, after the report is generated.

```bash
node scripts/scout discover-flaky-tests --pipelines kibana-on-merge --lookbackDays 7 --classifications flaky
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --dry-run
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --github-repo elastic/appex-qa-ai
```

`--dry-run` reads the real issues and logs what would be filed or updated without writing
anything. `--github-repo owner/name` files the issues in another repository, e.g. a sandbox. What
was done for each suite is logged and written as JSON to `--summary-path`. A GitHub write that
fails is logged, the run goes on with the next suite and exits non-zero at the end.

### What counts as flaky

A test is flaky when, on a single branch within the report window, it ran in at least `minBuilds`
builds (default 10), failed in at least `minFailedBuilds` of them (default 2) and in at least
`minFailRate` of them (default 3%), and passed at least once or recovered on a retry anywhere in
the window. Thresholds are checked per branch, so a clean branch cannot hide a flaky one; the
branch a test qualified on is recorded as `flakiestBranch`. Tests that never passed in the window
are consistently failing, not flaky, and are not reported.

Tests that have been skipped since are left out (`--no-omit-skipped-tests` keeps them): on every
branch the test failed on, its latest run in every pipeline, config and target was a skip. A suite
left with no test gets no issue (`all-tests-skipped`).

### What gets an issue

Flaky tests are grouped into suites: one per framework, file and `describe` block. Tests without
a suite title in the report form one suite per file.

A suite gets an issue when at least one of its tests is not tracked yet (below), worst suites
first and at most `--max-new-issues` per run (default 10). The issue is titled
`Flaky <Framework> [UI|API] suite: <suite title>` (`Flaky Scout API suite: …`,
`Flaky Jest integration suite: …`) and labelled `failed-test` plus the owning teams' labels (in
`elastic/kibana` only). The body shows the numbers of each flaky test and the branch it qualified
on, what the config runs, the suite's distinct errors with their share of the failures and where
each was last seen, breakdowns by branch (⏭️ marks the branches every setup skips it on), by Scout
target and by pipeline, and links issues that mention the same file as possibly related.

### Which issues count as tracking a test

- An open `failed-test` issue about the test (the per-test issues `report_failed_tests` files),
  about the suite, or about the whole file.
- A closed one, as long as the test has not failed since it was closed. Once it fails again the
  closed issue stops counting, and the new suite issue links it as "Previously tracked in #N"
  (`supersedes` in the summary). Without this, a closed issue would keep the suite silent for up
  to `--closed-since-days`: once `report_failed_tests` stops writing, its per-test issues get no
  new comments and the stale sweep closes them. The suite's own issue is the exception: it is
  reopened instead (below).
- Closed issues last updated more than `--closed-since-days` ago (default 365) are not looked at.

While issues are filed in a sandbox, the issues of `elastic/kibana` count too (`--tracking-repo`,
default `elastic/kibana`; empty disables it, and it is skipped when it names `--github-repo`
itself). That repository is only read, never written to, and its closed issues are not linked.

### Keeping suite issues up to date

When the daily report finds a suite flaky again, its own issue (one this command filed for that
`describe` block, not a per-test or whole-file one) is refreshed. `--no-update-issues` turns this
off.

- The body text stays as filed. Only the hidden metadata is updated (report count, history, last
  report); the test ids and branches recorded before are kept, so `/skip` still covers a branch
  the suite stopped failing on this week.
- A comment with the new numbers ("This test suite still appears to be flaky […]") is posted when
  the suite failed since the last one, or since the issue was filed, and at least
  `--comment-cooldown-days` later (default 3). Failures in between are covered by the next
  comment. Every comment ends with how to skip the test.
- A closed issue is reopened, with a comment, when the suite failed after it was closed. It stays
  closed when it was closed as a duplicate, or when the suite has not failed since: the report
  window can still hold the failures a fix was merged for.
- An issue that already has the report, as on a retried build, is left alone.

In `elastic/kibana`, a `kibanamachine` comment on a `failed-test` issue runs the failed-test
alert of `elastic/kibana-operations` (`triage/`): a Slack message to the teams that opted in to
alerts for existing failures (none at the time of writing). The alert reads `report.count` from
the metadata, so the body is updated before the comment is posted. Editing a body or reopening an
issue runs no alert; a reopen does start the `failed-test-investigator` workflow again.

The stale `failed-test` sweep closes the issues of suites that drop out of the report, as nothing
refreshes them any more.

### Hidden metadata

The body ends with `flaky-test-suite` metadata (`<!-- kibanaCiData = … -->`): the suite's file,
title, framework and test ids, the branches its tests failed on (`suite.branches`, pull requests
left out), the pipelines its file failed on (`suite.pipelines`), and the reports that found it
flaky (`report.count`, `report.generatedAt`, the last 30 in `report.history`, and
`report.commentedAt` once a comment was posted). This command uses it to recognise its own issues;
`elastic/kibana-operations` (`triage/`) reads it too: `/skip` for the `describe` block to skip and
the branches to skip it on, the failed-test alerts for the pipelines and the report count.

### How issues are matched

The command lists every open `failed-test` issue and the closed ones updated in the last
`--closed-since-days` through the issues API, about a hundred requests, and matches them locally.
It does not use the search API: its 30 requests a minute are shared with every CI job using the
same token, and its 1000-result cap and 256-character queries drop issues silently. Issues are
indexed by the file names they mention (JUnit's `path·ts` spelling restored), the Jest directory
in their classname and the Scout test id, so a suite is only compared with the issues that could
be about it. An issue matches a suite as:

- `suite`: its `flaky-test-suite` metadata names the file, and the suite title unless it is about
  the whole file;
- `test`: a per-test issue from `report_failed_tests` about one of the flaky tests, by Scout test
  id, or by test name together with the file (for Jest, the directory in the classname);
- `moved`: same test and file name at another location, i.e. the file moved since;
- `file`: it only mentions the file, for another test; linked as related, never counts as tracking
  the suite.
