# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

## `node scripts/check_flaky_test_issues`

Reads a flaky test report written by `node scripts/scout discover-flaky-tests`, groups the flaky
tests by file and tells, for every file, whether an open `failed-test` issue titled
`Flaky <framework> test suite: <file>` already tracks it. Read-only: nothing is filed or edited.
Filing issues for the untracked suites is a separate step that does not exist yet.

A test counts as flaky when, within the report window, it ran in at least `minBuilds` builds
(default 10), failed in at least `minFailedBuilds` of them (default 2) and passed at least once
or recovered on an in-run retry. Tests that never passed in the window are consistently failing
rather than flaky and are not reported.

```bash
node scripts/scout discover-flaky-tests --pipelines kibana-on-merge --lookbackDays 7 --classifications flaky
GITHUB_TOKEN=... node scripts/check_flaky_test_issues --input .scout/flaky_tests.json
```

The result is logged per suite and written as JSON to `--summary-path`. `--github-repo owner/name`
searches another repository, e.g. a sandbox.

The [kibana / scout / report-flaky-tests](https://buildkite.com/elastic/kibana-scout-report-flaky-tests)
pipeline runs both commands daily and annotates the build with the tracked and untracked suites.
