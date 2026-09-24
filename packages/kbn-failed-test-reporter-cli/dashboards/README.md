# Flaky test summaries

The QA cluster's `flaky_tests_daily` transform is defined in
[`flaky_tests_daily_transform.json`](flaky_tests_daily_transform.json). Its destination index has
one row per UTC day, test ID, owning team, pipeline, test title, file, and framework, with separate
passed and failed attempt counts. The CI space reads it through the
`appex-qa:flaky_tests_daily` data view. The transform retains 365 days of summaries.

The [Flaky tests by team](https://ops.kibana.dev/s/ci/app/dashboards#/view/ci-flaky-tests-by-team)
dashboard uses those rows for the selected date range. The top table requires at least two failed
attempts, one passed attempt, and ten completed attempts. It ranks tests by failure percentage;
the bottom table counts qualifying test IDs by team. The dashboard description marks older dates
as incomplete while the historical backfill is running.

Thirty stopped batch transforms named `flaky_tests_backfill_YYYYMMDD` cover complete UTC days from
2026-08-24 through 2026-09-22. They use the same grouping and destination. Start one at a time
after the continuous transform's first checkpoint completes, check
`GET /_transform/<id>/_stats` until its first checkpoint completes, then delete its transform
definition without deleting `flaky_tests_daily`. The continuous transform covers recent events;
the early hours of 2026-09-23 need a separate boundary audit before claiming a complete 30-day
history. Keep the source-cluster API key out of files and command-line arguments.
