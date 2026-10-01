# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/report_flaky_test_issues`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests`, groups the flaky
tests into suites, one per framework, file and `describe` block (tests for which the report has no suite
title form a single suite per file), and files one `failed-test` issue per flaky suite that has
none yet. Run daily by
the `kibana-report-flaky-tests` pipeline after the report is generated.

For every suite in the report, worst first: when its tests are not all covered by an issue, a
suite issue is filed, at most `--max-new-issues` (default 10) per run, titled
`Flaky <Framework> [UI|API] suite: <suite title>` (the category comes from the config, e.g.
`Flaky Scout API suite: …`, `Flaky Jest integration suite: …`) and labelled `failed-test` plus the
owning teams' labels (in `elastic/kibana` only). The body carries the per-test numbers with the
branch each test qualified on, the suite details including what the config runs, the suite's
distinct errors with their share of its failures and the pipelines, branches, targets and job each
was last seen in, and breakdowns by branch, by Scout target (deployment mode and location, for
suites that recorded one) and by pipeline naming the branches each failed on; issues that merely
mention the file are linked as possibly related. A suite is
skipped, and the issue recorded, when every one of its tests has an issue, open or closed, a
per-test one or one about the suite or its file.

A suite whose issue is its own, one this command filed for that `describe` block rather than for
the whole file, has it refreshed instead (`--no-update-issues` turns this off):

- the body is rewritten with the report's numbers, and its metadata keeps the test ids and branches
  recorded before, so `/skip` still covers a branch the suite stopped failing on this week;
- a comment is posted when the suite failed since the last report, saying it still appears to be
  flaky, with a link to its failures in the Scout dashboard (filtered on its file and `describe`
  block) and how to skip it. Comments by `kibanamachine` are what the Slack notifications of
  `triage/` react to, so the body is written first: the notification reads `report.count` from
  it to tell a new failure from an existing one;
- a closed issue is reopened, with a comment, when the suite failed after it was closed. It stays
  closed when the suite has not failed since, as the report window can still hold the failures
  from before a fix, and when it was closed as a duplicate;
- an issue that already has the report, as on a retried build, is left alone.

Editing a body or reopening an issue sends no Slack notification, only the comment does; a
reopen does start the `failed-test-investigator` workflow again. The stale
`failed-test` sweep closes the issues of suites that drop out of the report, as nothing refreshes
them any more.

The body ends with hidden `flaky-test-suite` metadata (`<!-- kibanaCiData = … -->`): the suite's
file, title, framework and test ids, the branches a test of the suite failed on (`suite.branches`,
pull requests left out) and the pipelines its file failed on (`suite.pipelines`), and the reports
that found it flaky (`report.count`, with the last 30 in `report.history`). Besides the
matching below, `/skip` and the Slack notifications of `elastic/kibana-operations` (`triage/`)
read it to find the `describe` block to skip and the branches to skip it on.

A GitHub write that fails is logged and recorded, the run goes on with the next suite and exits
non-zero at the end. `--dry-run` reads the real issues and logs what would be filed or updated
without writing anything.

Open and closed `failed-test` issues both count. The command lists every open `failed-test` issue
and the closed ones updated in the last `--closed-since-days` (default 365) through the issues
API, about a hundred requests against the core rate limit, and matches locally. With
`--tracking-repo owner/name` (default `elastic/kibana`) the same listing runs against a second
repository that is never written to: while the issues are filed in a sandbox, a suite gets none
there when every one of its flaky tests already has an issue in `elastic/kibana`, a per-test issue
about that test or an issue about the suite or its file. One test without an issue is enough for
the suite issue to be filed. Empty disables the check; it is skipped when it names `--github-repo`
itself. It deliberately
avoids the search API, whose 30-requests-a-minute limit is shared with every other CI job using the
same token and whose 1000-result cap and 256-character queries lose issues silently. Issues are
indexed by the file names they mention (after restoring JUnit's `path·ts` spelling), the Jest
directory in their classname and the Scout test id, so a suite is only compared with the issues
that could be about it. The matching rules then decide which suite an issue is really about:

- `suite`: it records the file, and the suite title unless it is about the whole file, in its
  `flaky-test-suite` metadata;
- `test`: a per-test issue filed by `report_failed_tests` about one of the flaky tests, by the
  Scout test id, or by the test name together with the file (for Jest, the directory in the
  classname);
- `moved`: same test and file name at another location, i.e. the file moved since;
- `file`: it only names the same file, for another test; it never counts as tracking the suite.

A test counts as flaky when, within the report window, a single branch ran it in at least
`minBuilds` builds (default 10), failed it in at least `minFailedBuilds` of them (default 2) and
in at least `minFailRate` of them (default 3%), and it passed at least once or recovered on an
in-run retry anywhere in the window. Thresholds apply per branch so that a clean branch cannot
dilute a flaky one; the branch a test qualified on is recorded as `flakiestBranch`. Tests that
never passed in the window are consistently failing rather than flaky and are not reported.

```bash
node scripts/scout discover-flaky-tests --pipelines kibana-on-merge --lookbackDays 7 --classifications flaky
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --dry-run
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --github-repo elastic/appex-qa-ai
```

The actions are logged per suite and written as JSON to `--summary-path`. `--github-repo
owner/name` targets another repository, e.g. a sandbox. Closed issues last updated before the
`--closed-since-days` horizon never count as tracking a suite; open ones always do.
