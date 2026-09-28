# Activity interval detection

The complete-history path uses B unchanged: six equal-length reference windows,
three profile references, and 999 block-bootstrap replicates. The integration
limits the requested lookback before the view to six weeks. This does not extend
the statistical validation of B to other grids, sums, or multiple series.

When the complete history plan is unavailable, Discover uses an exploratory
daily comparison instead. It requests at most one additional day before the view,
clipped to complete buckets after the earliest source timestamp, and also reuses
earlier buckets already in the view. A candidate must exceed its existing internal
reference by more than 20% and exceed the measured total in an earlier daily
interval of equal duration. There is no additional 20% historical threshold.

The historical interval must end before the candidate starts. For candidates
longer than a day, a larger whole-day shift is necessary. References with missing
coverage or changed elapsed duration at a clock change are skipped; another
candidate can still be assessed. Missing history is not filled with zeroes.
Zero measured events in an available reference remain valid.

The fallback assigns no p-value and performs no simulation. It orders candidates
by `1 - historicalTotal / observedTotal`, a dimensionless descriptive effect, not
significance or user importance. This can prioritize small increases over a zero
historical count. It does not inherit B's false-alarm calibration, measure
seasonality from one day, or guarantee exact increase boundaries. It is not used
to override a negative decision from B when the complete-history plan is ready.

The button retains its internal "as before" comparison. The chat snapshot records
the actual daily reference separately as `historicalComparison`, with kind
`exploratory_interval`, and instructs the agent not to call it statistically
anomalous. The total remains a separate result alongside at most ten fields.

Discover prioritizes eligible final-output fields in three tiers: explicit query
intent (`KEEP`, `WHERE`, `EVAL` outputs and `RENAME` targets), profile recommendations,
then other fields. `KEEP *` alone does not express a field preference. A field is
analyzed in only one tier, and later tiers are skipped once ten distinct fields
have admitted results. All series in a tier are evaluated before ranking its
results; this is not a ten-series computation limit. These priorities do not
establish semantic importance or calibrate the false-alarm rate across fields.

Categorical series empty in the view or identical to its total are already skipped.
Numeric SUM eligibility is currently still based on the supported numeric types:
this does not distinguish quantities from numeric codes. Query priority alone is
not a justification for summing a field, and no name-based rule is introduced.
