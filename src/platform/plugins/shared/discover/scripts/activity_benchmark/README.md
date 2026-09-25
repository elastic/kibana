# Activity detector feasibility experiment

This is a local experiment, not a new Discover feature. It does not change the panel,
chat, public APIs or production thresholds, and makes no LLM calls.

A first local quality run found interval and periodicity limitations. It does not
establish scalability or production readiness; use the JSONL report for each measured revision.

## Reuse in Discover and known limits

Discover and this runner call the same `detectActivityChangePointSeries` implementation
in `common/activity_investigation/describe_activity_change_points.ts`. It processes every
input series, retaining one result per input and all candidate diagnostics. The runner
keeps the field/value identities, including rare, missing and overlapping groups.

Detection and presentation are now separate: the detector retains every assessable
positive increase, including those at or below 20%. Discover applies the unchanged
strict >20% display filter before selecting one increase per series, then ranks all
selected increases by excess count and keeps at most ten across the whole search.
No field is excluded by that final result limit, and it is not a false-alarm correction.
The runner preserves `rawChangePoint` separately; its historical `changePoint` candidate
statuses still apply the shared display filter. Configuration records this scoring stage
and the selection settings. `score.presentation` now measures the selected result per
series and global ten-result list using Discover's selector and comparator; candidate-level
metrics remain separate. This does not exercise collection, rendering or refresh stability.

Elasticsearch CHANGE_POINT remains the detector. Log Rate Analysis supplies the preceding
reference window (`getWindowParameters`, with a one-bucket gap) and spike extension
(`getExtendedChangePoint`). Reference boundaries are rounded inward to complete buckets
and clipped to the selected period and previous structural change. Both rates are exact
mean counts per bucket: AIOps' rounded display-rate helper is deliberately not used for
the strict percentage floor. No new statistical model or ML job is introduced.

The returned increase includes its reference time range. Discover freezes this same
reference, duration and filter for the chat. Change Point is the only detection strategy.
No public attachment schema or UI changes are needed. The shared AIOps implementations
remain untouched.

Field/group collection and question presentation are separate from the detector measured
here. These synthetic quality measurements do not exercise the browser or data collection.

Keep the observed limitations open: false signals on noise at high group counts,
percentage estimates crossing the 20% floor near the boundary (a noisy 19% increase
was estimated at about 21%), missed increases under strong noise, and unresolved
seasonality. Reusing the spike helper does not establish that these are fixed.

The original daily/weekly repetition veto is restored. The POC does not claim seasonal
anomaly detection: recognized repetition makes the series **unassessable**, even when
a real increase is present. Seasonal references and residual intervals remain local
experiments, not feature code or candidates for inclusion in the POC PR.
Read every measurement with its saved configuration. The September 22 selection measurement
below uses the restored veto and separate display filter; older reports remain unchanged.

### Bounded measurement of the shared detector — 2026-09-21

Two authorized quality runs used seed 42 and 48 hourly buckets on Elasticsearch
9.6.0-SNAPSHOT. Each ran all 30 existing scenarios once; some scenarios have a minimum
of two or five series even with `--groups 1`.

| Configured groups | Series analyzed | Detected eligible increases | Searches with false signals | Unassessable series | Detector median / observed p95 |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 35 | 15 / 18 | 0 / 30 | 5 | 15.2 / 17.6 ms |
| 10 | 300 | 15 / 18 | 0 / 30 | 5 | 19.3 / 21.6 ms |

Both runs had zero execution errors and 30 detector requests, excluding preflight. The
three missed eligible increases were the +21% and +30% cases with strong noise and the
increase within a daily cycle. The rare group and the growing group under a stable total
were found. Top-K simulation would lose the rare group in the ten-group run; actual
detection does not apply that filter. The earlier noisy +19% boundary case was not
flagged in this run, but this is not evidence that all near-threshold errors are fixed.

Reports: `/tmp/discover-activity-benchmark-70c880fa-3f03-474f-b79d-2368555cd9db.jsonl`
and `/tmp/discover-activity-benchmark-a2516dab-3fd6-439b-bdaf-47a9567dac7d.jsonl`.
Times cover synchronous ES|QL on synthetic counts plus local interpretation, not document
collection, rendering, LLMs or production capacity. There is only one seed and one Poisson
search per run; neither the mixed 0/30 nor these timings establish a reliability target or
resolve the earlier 1,000-group false alarms. No thresholds were tuned after these runs.

### Current final-selection measurement — 2026-09-22

Four authorized quality runs used seeds 100–119, the existing 30 scenarios, 48 hourly
buckets, and Elasticsearch 9.6.0-SNAPSHOT. Each completed 600 searches without execution
errors. Configured group counts were 1, 10, 100 and 1,000; actual total series processed
were 700, 6,000, 60,000 and 600,000 respectively (some scenarios require several series).
The detector, restored repetition veto, strict >20% display floor and final ten-result
cap were unchanged throughout these runs. No indices were created and no LLM was called.

The stationary-Poisson scenario has independent counts with constant mean 20 per bucket
and no injected change or periodicity. The following counts refer to the final list after
one result per series and the global top ten, not all raw candidates:

| Series per search | Searches with a false suggestion | False suggestions displayed | Unassessable series / analyzed series |
| ---: | ---: | ---: | ---: |
| 1 | 3 / 20 | 3 | 1 / 20 |
| 10 | 9 / 20 | 11 | 3 / 200 |
| 100 | 19 / 20 | 72 | 20 / 2,000 |
| 1,000 | 20 / 20 | 200 | 158 / 20,000 |

At 1,000 series every null search filled the ten-result list. All 712 assessable upward
candidates in that Poisson run already exceeded the 20% floor. The cap limits presentation,
not the probability of at least one false suggestion. These are observations on this null
model and these seeds, not universal false-alarm probabilities or calibrated p-values.
The four scales reuse seeds and are not four independent validation sets.

Clean +30% steps, isolated spikes, the rare group and growth under a stable total were
selected in all 20 repetitions at each scale. The +21% and +30% steps with strong paired
noise (amplitude 40) were missed in all 20 at each scale. Deterministic positive scenarios
repeat across seeds and cannot establish a general detection rate. Near the floor, the
nominal +20% step with amplitude-10 noise was displayed in 6, 5, 13 and 8 searches across
the four scales: keep these reference/effect-size boundary cases separate from null noise.

Reports, in increasing series-count order:

- `/tmp/discover-activity-benchmark-f6b4c75a-ecda-45b6-8277-c091e32fba1c.jsonl`
- `/tmp/discover-activity-benchmark-c16a11f3-3dc4-48bd-b023-eccfff14718a.jsonl`
- `/tmp/discover-activity-benchmark-57867e7f-5fa0-4015-813e-8c254eebd000.jsonl`
- `/tmp/discover-activity-benchmark-48874829-9301-4e68-a547-f919792bc8fc.jsonl`

The existing Poisson diagnosis also completed on seeds 42, 45, 48, 53 and 55. For each
seed, two lowest-p-value detected series and one no-signal control were replayed alone,
in their original batch and in reversed order. All 45 comparisons preserved native
points, types, p-values and local interpretation exactly: ten signalled series remained
signalled in every shape and five controls remained controls. No execution-shape or adapter
discrepancy was observed in these selected cases. ES already reports these changes on
stationary noise; this does not establish a statistical bug or universally calibrated
significance. The diagnostic report retains synthetic counts, query text, raw responses,
configuration and ES version, without request headers or credentials:
`/tmp/discover-activity-benchmark-5605702d-6d04-4319-b597-3f4584c87185.jsonl`.

Limits: the runner sends aggregate series directly, not through Discover's collector.
In particular, its 1,000-series case does not imply that Discover accepts 1,000 values in
one field (the collector skips fields beyond 100). This measures the detector/selector
at that total series count, not correlations between fields, production query coverage,
ingestion delay, sliding-window refresh stability, browser behaviour or collection cost.
No production correction or new statistical threshold was introduced after these results.

## Execution and safety

Use the Node version in `.nvmrc`. All commands below require explicit approval before
execution. Network modes use `KIBANA_URL` (including the current base path/space) and
`KIBANA_AUTH` (`username:password`), following the local Kibana API utilities. There is
no host discovery, credential fallback, retry, TLS bypass or external reporting.

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js --help
```

Every command below also requires `--out <new-report.jsonl>`: there is no default location.
Use a persistent directory outside the repository; `/tmp` is cleared on reboot, which
removed the earlier `/tmp` reports cited in this document. Existing reports are never
overwritten. Reports contain query/filter context and group values: treat them as local
data, not shareable telemetry. Credentials are not recorded.

### 1. Controlled quality cases — reads only

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode quality --run --groups 10 --seeds 20
```

Preflight records the actual ES version object (including `build_hash`) and license, and
checks both single-series and grouped CHANGE_POINT responses. Quality mode sends synthetic
bucket arrays through the real command; it does not create indices. Repeat with 100 and
1,000 groups to measure false alarms per **whole search**, not merely per series.

Each quality search also records its input series (`quality-input`), every ES|QL query
(`quality-request`) and every raw response (`quality-response`), so Elasticsearch points
and p-values can be analyzed separately from the Discover selection. With 1,000 groups
this is large: use `--scenario <name>` to run a single scenario. The filter is applied
after generation, so the selected scenario's series are identical to those of a full run
with the same seed and group count. Raw capture adds local I/O to the recorded timings.

The cases cover percentage boundaries, spikes, steps, trends, stable totals with a
growing subgroup, rare groups, periodicity, zeros, missing and overlapping values.
Balanced noise keeps injected percentages exact; a separate stationary Poisson case
tests independent noise. This is a finite test distribution, not a universal false-alarm guarantee.

CHANGE_POINT supplies locations, types and p-values. The shared adapter measures
the increase against the mean rate in the bounded AIOps reference. CHANGE_POINT supplies a point,
not the duration. For `spike`, the runner now reuses `getExtendedChangePoint` from
`@kbn/aiops-log-rate-analysis` to find the right boundary: adjacent buckets remain in the
spike while their counts are closer to the spike value than to the rounded whole-series
mean. The helper's first excluded bucket is the exclusive end. If it reaches the edge,
the end is the selected series boundary; the next structural change also caps the window.
Only the right boundary is reused: the candidate still starts at the reported point,
and an earlier onset is not reconstructed. No data outside the selected period is used.

Step and trend changes retain the existing local least-squares fit, which estimates an
elevated level followed by a return to the preceding baseline, or an increase continuing
to the end. For these types, a closed interval needs at least six subsequent buckets;
isolated noisy buckets do not automatically close it. The spike helper is not applied
to gradual growth, whose first changed value need not resemble the rest of the increase.

Both are interval estimates, not confidence bounds or new significance tests. Window
selection can bias effect sizes; the percentage-boundary and noisy cases remain in the
report. The configuration records both interval methods and the reference definition so
earlier reports using different reference or spike-interval methods are not mistaken
for measurements of this revision. See the bounded measurement above for the shared path.
Interval estimation is local and counted in detector timings. The reference requires
six earlier buckets as an explicit experimental guard, not a confidence guarantee. Zero or
insufficient reference produces `unassessable`, never an invented percentage. The floor
is strictly **above 20%**. The report separates detection, interval overlap and percentage errors.

The conservative veto checks daily and weekly repetition within the selected series:
at least two cycles, at least six buckets per cycle, correlation >= 0.9 at the cycle lag,
and negative correlation at half the cycle. A recognized cycle yields **unassessable**,
with `repeating-cycle-needs-seasonal-reference` on its candidates and no selected increase.
This is abstention, not a learned seasonal reference or evidence that no incident exists.
Real increases in recognized cycles are intentionally lost; short ranges, incompatible
bucket widths and shifted cycles can escape the screen. Retain both periodic controls
and injected increases in reports, and count abstentions separately from correct negatives.
Previous reports with and without the veto remain unchanged.

A detection matches an injected window at intersection-over-union >= 0.5. False
signals outside that window count even if the same group also has a correct detection.
Top-K is a coverage simulation on the complete result, **not** a faster query plan.
ES p-values are retained; the runner adds no cross-series multiple-testing correction
and makes no whole-search false-alarm guarantee.

The `quality-summary.byScenarioAndKind` records separate each scenario, total number
of analyzed series, and Change Point kind (`all` is the whole-search result). A kind's
false-alarm denominator includes every successful search in that scenario, including
searches with no point of that kind. Failures are counted separately, never as successful
negatives. Abstentions are reported as `unassessable` series and candidates, not hidden.
Per-candidate scores separate the reported point from the locally estimated interval.
`matchedSignalErrors` summarizes the best matched detection per expected group, with
sample counts, signed and absolute boundary errors, overlap and percentage-point errors.
Use the per-candidate scores to inspect missed or misaligned signals too: those are not
included among successfully matched detections.

In the saved 20-seed, 1,000-group experiment, the mixed total of 20 false-alarm searches
out of 600 hides **20 out of 20 stationary-Poisson searches**. Read null scenarios
separately; the mixed total is not an estimate of reliability on each noise model.

### 1a. Poisson false-alarm diagnosis — synthetic requests only

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode diagnose --run
```

This mode fixes seeds `42, 45, 48, 53, 55`, 1,000 groups, hourly buckets and top-K 5.
Only `--out` customizes the run; quality/performance override flags are rejected.
It creates no indices, reads no user documents, calls no LLM and changes no threshold.
It still contacts Kibana/Elasticsearch and requires explicit authorization.

For each seed, the existing detector first analyzes the entire synthetic Poisson search.
The two detected series with the lowest p-values (ties use input order), plus the first
`no-signal` control, are then executed individually, in their original discovery batch,
and in that same batch with reversed group order. Unassessable series are not controls.
If a seed no longer provides those three selections, diagnosis is incomplete, not a
successful negative. The mode makes at most 100 diagnostic ES|QL requests plus the two
existing preflight queries and version/license reads, with the existing 10-second deadlines.

The private JSONL report stores configuration (including adapter thresholds), ES
version/license, every original count, query, exact response body (including rejected
responses), and comparison results linked by request ID. Request headers and credentials
are never recorded. Raw response capture adds local I/O, so these timings must not be
used as performance benchmarks.

`diagnostic-comparison` distinguishes exact point/type/p-value equality from location/type
equality, and retains the local interval interpretation separately. `diagnostic-finding`
identifies non-repeatable original responses, execution-shape differences, or a signal
present on stationary noise in every shape. That last outcome is not proof of calibrated
p-values or an Elasticsearch statistical bug. An expanded interval remains a local estimate:
Change Point does not return a duration. The selected known-problematic seeds cannot establish
an accuracy guarantee. Failures remain in the report and make the command exit unsuccessfully.

Stop after reviewing this diagnosis. Seasonal reference changes and statistical corrections
are separate decisions; neither is enabled by this mode.

### 1b. Seasonal reference comparison — local synthetic data only

Not adopted for the POC. Retained for historical analysis, outside the feature PR.

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode seasonal --run --seed 42 --seeds 20
```

This mode needs explicit approval to execute but never creates a transport, reads
credentials or contacts Kibana, Elasticsearch or an LLM. It writes a new private JSONL
report, leaving previous reports unchanged. Only `--seed`, `--seeds` and `--out` configure
this experiment; it does not run the other quality scenarios.

Each daily or weekly case pairs an unchanged series with the identical series containing
an extra 30% in a known window of the fourth cycle. Three preceding corresponding windows
form the reference, using their mean count; the evaluated cycle never enters the estimate.
This is a first reference experiment, not a replacement detector or a claim that the mean
is robust to contamination. Weekly cases span four weeks and include weekday/weekend
differences. Independent noise and a phase shift confined to the evaluated cycle expose
reference errors. Phase-shift cases intentionally challenge the stable-phase assumption.

Each record saves the synthetic counts, known window, reference windows and totals,
expected-count error, percentage-point error and whether the unchanged >20% floor was
crossed. Insufficient history, incompatible bucket widths and a DST transition are
explicitly **unassessable**, with null threshold outcomes, not successful negatives.

No CHANGE_POINT is called and no candidate boundaries are estimated. This can measure
the reference on known windows, but cannot demonstrate automatic seasonal detection or
the accuracy of the current Discover feature. No production file imports this experiment.

The first local run (seeds 42–61, 2026-09-22) assessed 240 cases and abstained on 160.
Stable-phase cases crossed the floor for all 80 injected increases and none of their
80 controls; the 40 phase-shift injections did not cross it. Daily noisy +30% estimates
ranged from +22.5% to +39.5%, weekly noisy estimates from +26.4% to +33.3%. Non-noisy
cases repeat across seeds, so these are not 400 independent trials or a reliability bound.
Report: `/tmp/discover-activity-benchmark-00750b60-2cbc-49ac-a3b8-25850b334aca.jsonl`.
After this run, the misaligned case's window conversion was corrected to avoid a floating
point rounding error that had made it empty. That case remains explicitly unsupported;
its earlier result must not be treated as a valid injected-increase comparison.

### 1c. Seasonal references on Change Point candidates — synthetic cluster requests

Not adopted for the POC. The saved September 22 candidate and residual reports used the
adapter **without** the veto; running this mode now uses the restored veto and is not
a reproduction of those measurements. Original reports must not be overwritten.

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode seasonal-points --run --seed 42 --seeds 1
```

This separate mode **requires explicit network approval**. It reuses the same paired
scenarios and Discover detector, running each of the 20 series individually per seed.
There are 20 index-free CHANGE_POINT queries per seed, plus the existing two preflight
queries and version/license reads. It creates no indices, reads no user documents and
calls no LLM. Only `--seed`, `--seeds` and `--out` configure the experiment.

The report preserves original counts, queries, raw responses and the unchanged detector
result. Each comparison distinguishes the native point/type/p-value from the interval
estimated by the existing adapter. The seasonal reference uses that estimated interval,
not the injected window. Known windows enter only the existing quality scoring, retaining
its overlap, boundary and percentage errors per scenario and change type.

Three corresponding earlier windows must fit inside the selected series and must not
overlap the candidate or each other. Missing history, incompatible buckets, DST and
intervals longer than the cycle are unassessable, never silent rejections. All native
candidates are retained, including those not accepted as increases by Discover. A missing
ES candidate is reported separately, not as a successful seasonal assessment.

The cycle length is **known scenario metadata**, not inferred from the counts. The mode
compares references; it neither automatically recognizes seasonality nor changes, rescues
or suppresses a Discover signal. `detectedBelowSeasonalFloor` identifies diagnostic
disagreements; pair it with the existing match score to distinguish true signals that a
filter might lose from false signals it might remove. Failure records are separate and
cause an unsuccessful command exit. Raw response capture is not a performance benchmark.
No code from this mode belongs in the POC PR; previous reports remain unchanged.

#### Residual interval comparison — runner only

The retained experiment preserves a side-by-side `residualInterval` diagnostic. For each
bucket with three corresponding earlier cycles it subtracts the expected count from
the observed count, then passes the available residual tail and the **same ES points**
to the existing Discover interpretation function. This reuses both the AIOps spike
extension and the existing structural interval fit without copying or changing either.
Residuals are never sent to Elasticsearch, and native p-values retain only their original
meaning on raw counts. This adds no requests to `seasonal-points`.

Unavailable history is removed as a leading prefix, never padded with artificial zeros;
indices and times are translated back to the original series. Missing, zero or incompatible
references remain explicit abstentions. The adapter's minimum of 24 complete residual
buckets and six preceding reference buckets is retained. Its residual reference mean is
recorded, including zero: all percentage decisions produced by that residual interpretation
are discarded. Only interval estimates are reused, and percentages are recomputed from
the original counts and seasonal expected totals over exactly those estimated intervals.

`residualSeries` records the expected counts, residuals and original starting bucket.
`residualWindowErrors` reuses the existing scoring for overlap, boundaries and percentage;
it does not assert a new detector decision. The original result and score remain unchanged.
Both estimation and threshold outcomes must be inspected, separately for spike, step and
trend candidates, including any true signals lost or normal cycles still reported.
The exported pure comparison can also replay saved synthetic inputs and candidates locally,
without a new cluster query; such an execution still needs approval. Neither the cycle
choice nor phase changes are solved, and no production filter is enabled.

The interval improvements in the saved replay are not evidence of seasonal detection:
noisy control and injected series had the same accepted raw change points. Injections
also coincided with the normal 08:00 rise. A future evaluation would need paired UI-level
outcomes, off-transition injections, and explicit coverage losses from abstention; this
does not authorize another run. The residual approach is not being promoted into Discover.

### 2. Dedicated performance data — explicitly opt-in writes

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode fixture --run --create-fixture --documents 100000 --fields 10 --groups 100
```

This creates a **new UUID-named index**, uses bulk `create`, and refreshes that index.
It never modifies an existing index or deletes data. Failures leave the named index
available for inspection. The output includes a `.scope.json` manifest for later runs.
Fixture generation is excluded from query timings. The +30% subgroup target is rounded
to whole documents; at very low density it may disappear. Use quality mode for exact
effect-size checks.

Measure one axis at a time: 100k / 1m / 10m documents, 1 / 5 / 10 fields, and
10 / 100 / 1,000 non-null groups. These are experiment sizes, not product defaults.
The last fixture field includes missing and multivalued data when there are multiple fields.

### 3. Data measurements — reads only

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode data --run --repeatable-input --scope /absolute/path/run.scope.json \
  --fields 5 --groups 100 --runs 5 --warmups 3 --concurrency 1
```

`--scope` accepts the fixture manifest, a full frozen investigation, or its `scope`
object: `query`, `indexPattern`, `timeFieldName`, absolute `timeRange`, optional frozen
`filter`, resolved `params`, `timeZone` and `projectRouting`. A supplied `asOf` is retained.
Do not leave relative date
math in filters or the query. `--repeatable-input` acknowledges immutable data and
deterministic ordering for explicit LIMITs; it is not a mechanism that freezes an index.

The runner discovers keyword/boolean/IP columns from query output and records all
eligible fields and the alphabetically selected subset. Numeric dimensions and transformed
queries are outside this first experiment. It enumerates every group of the selected
fields, with an additional missing-value group. A field beyond the group ceiling is
marked incomplete, not silently replaced by its most frequent values.

Explicit WHERE, SORT, LIMIT, DROP, parameters, filters and routing are retained. Group
restrictions follow the original pipeline. An implicit ES|QL output limit still applies
at the end of the newly aggregated query, as with a histogram; counts are not limited
to the first page displayed by Discover. Only complete buckets are scored; empty ones
are filled with zero. Warnings, approximation, partial results, changed group totals,
duplicate buckets and truncated responses invalidate the trial.
The query-alone baseline retains warnings (for example its default display limit),
matching the original query; those warnings are recorded, not allowed in analysis results.

Large series sets use batches below the ES|QL row ceiling. Filtering after aggregation
preserves multivalue membership but can repeat scans. A response LIMIT does **not** bound
server work: those scans are included in timings.

Runs rotate query-alone, analysis-alone, and query-plus-analysis conditions. The first
request and warmups are separate; promote promising cases to `--runs 50` and repeat at
`--concurrency 5`. All transport calls, response sizes and failures are recorded, as are
CHANGE_POINT times. Older reports may include an additional detector comparison; their
overall timings are not directly comparable. Byte counts are JSON body sizes, not compressed wire sizes;
body-read timing is not pure network latency. Failed trials invalidate the budget verdict
even though successful-latency percentiles are reported separately.

The target is p95 <= 5 seconds, with a 10-second deadline. The cancellation probe verifies
client abort only; it does not prove that Elasticsearch has released all server work.
Timing uses Kibana's synchronous ES|QL search route: browser rendering, Discover's async
polling, server CPU/heap and real multi-node production load remain separate measurements.

### 4. Check population semantics separately — reads only

On a fixture scope, prepare variants such as `FROM <index> | SORT sequence | LIMIT 2000`,
with WHERE before/after LIMIT, a named parameter, or a DSL filter. Retain time and the
selected categorical fields. `sequence` is unique in the generated fixture.

```sh
node src/platform/plugins/shared/discover/scripts/activity_benchmark/index.js \
  --mode verify --run --repeatable-input --scope /absolute/path/bounded-scope.json \
  --fields 5 --groups 100
```

This compares every aggregated bucket against JavaScript counts of the **complete** raw
query output, including missing and multivalued groups. It refuses more than 9,000 raw
rows rather than treating a sample as an oracle. Keep this verification out of timing runs.

## Decision

Read quality and timing reports together. Report the tested envelope, signals lost by
field/top-K selection, false alarms and non-evaluable cases. A fast incomplete analysis
does not pass. Sample logs alone, one seed, or a local p95 do not establish production
capacity. Do not lower thresholds to obtain a button or integrate more UI before reviewing
the measurements and the remaining limitations above.
