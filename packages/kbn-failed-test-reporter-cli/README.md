# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/report_flaky_tests`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests` and files one
`failed-test` issue per flaky test file (titled `Flaky test suite: <file>`), or brings the issue
filed earlier for that file up to date (reopening it when closed, with a comment). Suites that
dropped out of the report are left alone: the issue stops being updated and the
[stale sweep](../../.github/workflows/close-stale-failed-test-issues.yml) closes it after three
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
failed builds out of total builds, last failure and the branches it fails on. Once a suite has
been flagged more than once, a second line shows how the fail rate moved across reports. Below
that come the suite details, a per-test table for suites with several flaky tests, collapsed
recent failure messages and a hidden `kibanaCiData` footer under the `flaky-test-suite` key that
the next run uses to find the issue again (`suite.filePath`) and to extend the trend
(`report.history`, capped at the last 10 reports). Suites whose tests already have an open
per-test `failed-test` issue are skipped by default; `--failed-test-issues link` files the suite
issue anyway and lists the related issues in it. `--max-new-issues` (default 10) caps how many issues one run may create; existing issues
are always updated. A JSON summary of what was done is written to `--summary-path`. To try the
output on a sandbox repository, pass `--github-repo owner/name` with a token that has write
access to its issues.

The [kibana / scout / report-flaky-tests](https://buildkite.com/elastic/kibana-scout-report-flaky-tests)
pipeline runs both commands daily. Its second step stays in dry-run mode until
`FLAKY_TESTS_REPORT_TO_GITHUB=true` is set on the pipeline or schedule.
