# hunt-dataset-match-failed-vs-empty

status: implementing
updated: 2026-10-30

## Summary

Hunt Watch retires a threat report when the dataset-match model call fails.
`matchDatasetsWithModel` returns `undefined` for both a caught error and a successful
empty match. The coordinator empty-target guard keys on whether a model was selected,
not whether the call succeeded, so a transient failure becomes `no_tier2_targets` /
`complete` and the scheduled workflow stamps evidence.

Origin: Libra P3 on kibana#300025 and Steph's disposition that the failed-vs-empty
outcome fix is a follow-up covering both the pre-existing Efficient case and the Cyber
case (discussion_r4405994851).

## Tracker

- Epic: kibana-8mp
- Children: kibana-8mp.1 (outcome + match unit tests), kibana-8mp.2 (resolve +
  coordinator + narrative), kibana-8mp.3 (regression tests, live repro, gates, PR)
- security-team#20615 (private; do not link from public Kibana PR surfaces)
- Related: kibana#300025 (merged; introduced Cyber selection path), sibling
  attribution follow-up kibana-0vt / kibana#302109 (out of scope), review ledger
  `.tmp-pr-reviews/pr-300025-review.md`

## Decisions (2026-10-30)

- Discriminated outcome `{ status: 'matched' | 'empty' | 'failed' }` from
  `matchDatasetsWithModel`.
- `failed` → reuse `no_inference` (retryable); `empty` → `no_tier2_targets` (retire).
- Filtered-empty (hallucination / below threshold) and `datasets.length === 0` → `empty`.
- Dataset match path only; do not audit recommendations or other undefined collapses.
- Unit tests + one live local repro that failure does not retire.
- Track in security-team now; public Kibana surfaces must not mention that issue.
- Ship on main with 9.6 backport labels (`v9.7.0`, `v9.6.0`, `backport:version`).
