# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/report_flaky_tests`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests` and files one
`flaky-test-suite` issue per flaky test file, or brings the issue filed earlier for that file up
to date (reopening it when closed, with a comment). Suites that dropped out of the report are
left alone; closing an issue is a human decision.

```bash
# Preview what would be filed, without touching GitHub
node scripts/report_flaky_tests --input .scout/flaky_tests.json --dry-run

# File issues, linking the report they came from
GITHUB_TOKEN=... node scripts/report_flaky_tests --input target/flaky_tests/flaky_tests.json --report-url https://buildkite.com/...
```

Each issue carries the suite's impact over the report window (failed builds, fail rate, in-run
retry flakes, flakiest branch and latest run per test), recent failure messages, and a hidden
`kibanaCiData` footer under the `flaky-test-suite` key that the next run uses to find the issue
again (`suite.filePath`). Suites whose tests already have an open `failed-test` issue are skipped
by default; `--failed-test-issues link` files the suite issue anyway and lists the related issues
in it. `--max-new-issues` (default 10) caps how many issues one run may create; existing issues
are always updated. A JSON summary of what was done is written to `--summary-path`.

The [kibana / scout / report-flaky-tests](https://buildkite.com/elastic/kibana-scout-report-flaky-tests)
pipeline runs both commands daily. Its second step stays in dry-run mode until
`FLAKY_TESTS_REPORT_TO_GITHUB=true` is set on the pipeline or schedule.
