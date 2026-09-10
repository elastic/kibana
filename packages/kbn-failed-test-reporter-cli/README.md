# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/report_flaky_tests`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests` and files one
`failed-test` issue per flaky test file that has no open issue yet, titled
`Flaky <Scout|Jest|FTR|Cypress> test suite: <file>`. Files that already have an open issue are
left untouched, and so are issues of files that dropped out of the report: the
[stale sweep](../../.github/workflows/close-stale-failed-test-issues.yml) closes them after three
weeks without activity, like any other `failed-test` issue.

A test counts as flaky when, within the report window, it ran in at least `minBuilds` builds
(default 10), failed in at least `minFailedBuilds` of them (default 2) and passed at least once
or recovered on an in-run retry. Tests that never passed in the window are consistently failing
rather than flaky and are not reported. To regenerate the report behind an issue locally:

```bash
node scripts/scout discover-flaky-tests --pipelines kibana-on-merge --lookbackDays 7 --classifications flaky
```

```bash
# Preview what would be filed, without touching GitHub
node scripts/report_flaky_tests --input .scout/flaky_tests.json --dry-run

# File issues, linking the report they came from
GITHUB_TOKEN=... node scripts/report_flaky_tests --input target/flaky_tests/flaky_tests.json --report-url https://buildkite.com/...
```

Each issue opens with one line of impact: the suite's rank among all flaky tests of the report,
failed builds out of total builds, last failure and the branches it fails on. Below that come
the suite details, a per-test table for files with several flaky tests, and a hidden
`kibanaCiData` footer under the `flaky-test-suite` key that the next run uses to find the issue
again (`suite.filePath`). `--max-new-issues` (default 10) caps how many issues one run may
create, worst suites first. A JSON summary of what was done is written to `--summary-path`. To
try the output on a sandbox repository, pass `--github-repo owner/name` with a token that has
write access to its issues.

The [kibana / scout / report-flaky-tests](https://buildkite.com/elastic/kibana-scout-report-flaky-tests)
pipeline runs both commands daily. Its second step stays in dry-run mode until
`FLAKY_TESTS_REPORT_TO_GITHUB=true` is set on the pipeline or schedule.
