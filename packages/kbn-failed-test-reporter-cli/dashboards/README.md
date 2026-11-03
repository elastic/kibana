# Flaky test summaries

The QA cluster's `flaky_tests_daily` transform is defined in
[`flaky_tests_daily_transform.json`](flaky_tests_daily_transform.json). Its destination index has
one row per UTC day, test ID, owning team, pipeline, test title, file, and framework, with separate
passed and failed attempt counts. The CI space reads it through the
`appex-qa:flaky_tests_daily` data view. The transform retains 365 days of summaries.
Its fixed source lower bound lets a delayed checkpoint catch up without losing events to a moving
`now-1d` filter.

The [Flaky tests by team](https://ops.kibana.dev/s/ci/app/dashboards#/view/ci-flaky-tests-by-team)
dashboard uses those rows for the selected date range. The top table requires at least two failed
attempts, one passed attempt, and ten completed attempts. It ranks tests by failure percentage;
the bottom table counts qualifying test IDs by team. The dashboard description marks older dates
as incomplete while the historical backfill is running.

Thirty-one stopped batch transforms named `flaky_tests_backfill_YYYYMMDD` cover complete UTC days from
2026-08-24 through 2026-09-23. They use the same grouping and destination. The September 23 batch
overlaps the continuous transform's first checkpoint; matching document IDs let it update those rows
with the complete day's counts. Start one at a time
after the continuous transform's first checkpoint completes, check
`GET /_transform/<id>/_stats` until its first checkpoint completes, then delete its transform
definition without deleting `flaky_tests_daily`. Keep the source-cluster API key out of files and
command-line arguments.
