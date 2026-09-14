# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/report_flaky_test_issues`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests`, groups the flaky
tests by file and keeps one `failed-test` issue per flaky suite up to date. Run daily by the
`kibana-report-flaky-tests` pipeline after the report is generated.

For every suite in the report, worst first:

- no issue is about it: a suite issue is filed, at most `--max-new-issues` (default 10) per run,
  titled `[<Module>] Flaky <Framework> test suite: <suite title>` and labelled `failed-test` plus
  the owning teams' labels (in `elastic/kibana` only). The body carries the per-test numbers with a
  14-day trend, the suite details, the most frequent sampled failures and a collapsed breakdown
  by pipeline; issues that merely mention the file are linked as possibly related;
- an open issue is about it, its own or a per-test issue filed by `report_failed_tests`: a
  still-flaky comment with today's numbers is posted, at most once per
  `--min-comment-interval-days` (default 3) per issue, on the strongest open match only, naming
  the others. On suite issues only the hidden metadata of the body is updated, the visible text
  stays as filed;
- the strongest issue about it is closed: it is reopened with a comment when at least two builds
  failed on the days after the closing (from the report's daily trend), otherwise nothing happens;
- an issue labelled `skipped-test` (`/skip`) is left alone.

Suites that drop out of the report are not touched; the stale `failed-test` sweep closes their
issues. A GitHub write that fails is logged and recorded, the run goes on with the next suite and
exits non-zero at the end. `--dry-run` reads the real issues and comments and logs what would be
filed, commented on or reopened without writing anything.

Open and closed `failed-test` issues both count. The command lists every open `failed-test` issue
and the closed ones updated in the last `--closed-since-days` (default 365) through the issues
API, about a hundred requests against the core rate limit, and matches locally. It deliberately
avoids the search API, whose 30-requests-a-minute limit is shared with every other CI job using the
same token and whose 1000-result cap and 256-character queries lose issues silently. Issues are
indexed by the file names they mention (after restoring JUnit's `path·ts` spelling), the Jest
directory in their classname and the Scout test id, so a suite is only compared with the issues
that could be about it. The matching rules then decide which suite an issue is really about:

- `suite`: it records the file in its `flaky-test-suite` metadata (or, for issues filed before
  the suite title was used, is titled `Flaky <framework> test suite: <file>`);
- `test`: a per-test issue filed by `report_failed_tests` about one of the flaky tests, by the
  Scout test id, or by the test name together with the file (for Jest, the directory in the
  classname);
- `moved`: same test and file name at another location, i.e. the file moved since;
- `file`: it only names the same file, for another test; it never counts as tracking the suite.

A test counts as flaky when, within the report window, it ran in at least `minBuilds` builds
(default 10), failed in at least `minFailedBuilds` of them (default 2) and passed at least once
or recovered on an in-run retry. Tests that never passed in the window are consistently failing
rather than flaky and are not reported. Tests without an execution in the last `maxInactiveHours`
(default 24), e.g. skipped, moved or deleted since, are dropped by the report itself.

```bash
node scripts/scout discover-flaky-tests --pipelines kibana-on-merge --lookbackDays 7 --classifications flaky
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --dry-run
GITHUB_TOKEN=... node scripts/report_flaky_test_issues --input .scout/flaky_tests.json --github-repo elastic/appex-qa-ai
```

The actions are logged per suite and written as JSON to `--summary-path`. `--github-repo
owner/name` targets another repository, e.g. a sandbox. Closed issues last updated before the
`--closed-since-days` horizon never count as tracking a suite; open ones always do.
