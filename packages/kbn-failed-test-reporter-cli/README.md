# @kbn/failed-test-reporter-cli

CLIs that turn CI test results into GitHub issues on `elastic/kibana`.

## `node scripts/report_failed_tests`

Reads JUnit and Scout reports of a CI job and files or updates one `failed-test` issue per
failing test. Run by `.buildkite/scripts/lifecycle/post_command.sh` after every job.

FTR, Jest (unit and integration), and Scout issues link to the CI space's
[Single test history](https://ops.kibana.dev/s/ci/app/dashboards#/view/test-failure-history)
dashboard. The link filters `appex-qa:scout-test-events-*` by the test ID and
shows daily passed/failed attempts, the daily failure percentage, and recent failed
attempts linked to their Buildkite jobs. Existing issues receive the link the next time the reporter
updates them; failure comments on `main` include it too. Tests without an exact file path are left
without a history link.
