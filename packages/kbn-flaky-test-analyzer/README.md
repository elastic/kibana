# @kbn/flaky-test-analyzer

Finds test flakiness that is **worth fixing** by aggregating Scout test events over a rolling
window, grouping failures into clusters, and writing a schema-validated report.

This package is read-only. It queries Elasticsearch and writes a JSON file; it creates no GitHub
issues and mutates nothing. Issue creation is a separate, later stage that consumes the report.

## Usage

```sh
node scripts/flaky_test_analyzer \
  --lookbackDays 7 \
  --pipelines kibana-on-merge \
  --branches main,9.4,8.19 \
  --output flakiness-report.json
```

Elasticsearch credentials default to the `SCOUT_REPORTER_ES_URL` and `SCOUT_REPORTER_ES_API_KEY`
environment variables. Run with `--help` for the full flag list.

## How it decides what counts as flaky

**Builds are the denominator, not test runs.** Test executions within one build are not
independent: a stack that fails to boot fails every test in the file at once, which is one piece
of evidence rather than thirteen. Ranking on per-execution rates buries the worst offenders —
a spec that broke 412 of 570 builds ranks fifth by per-execution rate because its 7,566 executions
dilute the numerator.

**Admission uses a Wilson score lower bound, not a raw rate plus a minimum-sample gate.** A
minimum-runs floor is both inert in practice (the smallest real sample is in the hundreds) and
meaningless at any value small enough to write down — at a true 3% rate, 50 samples give a 95%
interval of roughly 0–7.7%. The lower bound makes small samples earn their place automatically,
and doubles as the ranking key.

**Thresholds are per-framework.** Over 7 days on `kibana-on-merge`, 13 Playwright spec files
exceed a 3% build failure rate and no FTR, Jest, or Cypress file does. A single global threshold
would silently scope the system to Playwright.

**Failures are also bucketed by mechanism**, which is a separate axis from the cluster's
granularity. Mechanism gates whether an automated fix attempt is appropriate at all: `infra`
failures are broken dependencies, not test bugs, and changing the test is the wrong response.

## Querying strategy

Three queries, because one would not finish:

1. **Spec-level rates** for every file that failed at least once. The only unscoped scan, and the
   expensive one (~33s over 7 days). Grouping by `test.file.path` rather than `test.id` keeps it
   viable — ~88K groups instead of ~943K.
2. **Test-level rates**, scoped to the specs that cleared the bar. Scoping is a requirement rather
   than an optimisation: unscoped, the same aggregation did not return within five minutes;
   scoped to a handful of specs it returns in under a second.
3. **Failure samples**, also scoped, for mechanism classification and issue evidence. Error
   messages are mapped as `text` and cannot be aggregated in Elasticsearch, so classification
   happens client-side.

## Layout

| Path | Contents |
|---|---|
| `src/report/schema.ts` | Zod schemas for the report. This is the contract other stages read. |
| `src/policy/` | Wilson bound and the admission policy |
| `src/mechanism/` | Failure-mechanism classification |
| `src/clustering/` | Spec-level cluster assembly and ranking |
| `src/query/` | ES\|QL queries |
| `src/cli/` | CLI entry point |
