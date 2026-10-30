# Hunt Watch dataset-match failed-vs-empty — Plan Brief

> Full plan: `context/changes/hunt-dataset-match-failed-vs-empty/plan.md`
> Origin: kibana#300025 [discussion_r4405994851](https://github.com/elastic/kibana/pull/300025#discussion_r4405994851); review ledger `.tmp-pr-reviews/pr-300025-review.md`
> Tracker: beads `kibana-8mp`; private security-team#20615 (do not link from public Kibana PRs)

## What & Why

Hunt Watch retires a report when the dataset-match model call fails. Failure and
successful empty both return `undefined` today, and the coordinator treats “model was
selected, targets empty” as `no_tier2_targets` / complete, so evidence gets stamped.
That covers the old Efficient path and the Cyber path from kibana#300025.

## Starting Point

On merged #300025, `matchDatasetsWithModel` collapses catch and empty; `resolveTier2Targets`
turns that into empty `modelMatches`; the empty-target guard only emits retryable
`no_inference` when no match model was selected. Attribution of the Cyber model is a
sibling change (`kibana-0vt`) and stays separate.

## Desired End State

Discriminated `matched | empty | failed` from the match helper. Failed stays retryable
(`no_inference`, no evidence write). Successful empty still retires. Narrative names a
match-call failure when that is what happened. Proven with unit tests and one live local
repro; draft PR on main with 9.6 backport.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Outcome shape | `matched` / `empty` / `failed` | Distinguishes retire vs retry without a new skip reason vocabulary. | Thread / Plan |
| Failed skip reason | Reuse `no_inference` | Already in the retryable set and completeness path. | Thread / Plan |
| Filtered-empty & zero datasets | `empty` (retire) | Completed call / nothing to match is terminal, not a transient failure. | Plan |
| Scope | Dataset match chain only | Matches the filed follow-up; attribution and other collapses stay out. | Plan |
| Verification | Unit + one live failure repro | Retirement is gated in `hunt.yaml` on `completed_successfully`. | Plan |
| Tracking | security-team#20615 now | Team issue repo; public PR must not mention it. | Plan |
| Release | main + 9.6 backport | Same lines as #300025. | Plan |

## Scope

**In scope:** `matchDatasetsWithModel` outcome, `resolveTier2Targets` status surface,
coordinator empty-target guard, `no_inference` narrative, tests, live repro, draft PR.

**Out of scope:** Cyber attribution (`kibana-0vt`), recommendations / other undefined
collapses, new skip reason, auto-reviving already-retired reports, linking
security-team#20615 from public Kibana surfaces.

## Architecture / Approach

```
matchDatasetsWithModel → MatchDatasetsWithModelResult
        ↓
resolveTier2Targets (dataset_match status + modelMatches)
        ↓
coordinator empty-target guard
  failed → no_inference → incomplete_retryable → no write_evidence
  empty  → no_tier2_targets → complete → write_evidence
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Discriminated match outcome | Type + helper + match unit tests | Callers break until Phase 2; land 1+2 together if package typecheck is required mid-stream |
| 2. Propagate + narrative | Resolve status, coordinator guard, narrative copy | Wrong guard order reintroduces retire-on-failure |
| 3. Tests, live repro, PR | Regression tests, stack proof, draft PR + backport labels | Live “failure” that actually falls back to Efficient looks like empty |

**Prerequisites:** #300025 on the branch tip (Cyber/`selectHuntCallModel` present); local
stack for Phase 3 repro.
**Estimated effort:** ~1–2 sessions across 3 phases.

## Open Risks & Assumptions

- Branch tip must include #300025; re-read file paths/line anchors before editing.
- Live repro must force a throw that hits the catch (no successful messages fallback).
- Reports already wrongly retired are not automatically revived.

## Success Criteria (Summary)

- Failed match → `no_inference` / not retired (unit + live).
- Successful empty → `no_tier2_targets` / retired (unit; live optional).
- Draft PR on main with 9.6 backport labels; private issue updated with PR URL only.
