# Hunt Watch dataset-match failed-vs-empty Implementation Plan

## Overview

Stop Hunt Watch from retiring reports when the dataset-match model call fails.
`matchDatasetsWithModel` currently returns `undefined` for both failure and successful
empty; the coordinator treats a selected model plus empty targets as `no_tier2_targets`
and completes the run. Return a discriminated `matched | empty | failed` outcome, map
`failed` to retryable `no_inference`, and retire only on successful `empty`.

## Current State Analysis

On merged kibana#300025 (`4c58b2c`):

- `matchDatasetsWithModel` documents that it returns `undefined` and never throws for
  empty input, catch, or nothing clearing the confidence threshold
  (`match_hunt_datasets.ts`).
- `resolveTier2Targets` does `matched?.matches … ?? []`, so failure and empty both
  contribute zero model targets.
- The empty-target guard in `hunt_coordinator.ts` returns `no_inference` only when
  `!datasetMatchModel && needsModelDatasetMatch(...)`. A selected Cyber or Efficient
  model that then fails falls through to `no_tier2_targets`.
- `no_inference` is in `TIER2_REQUESTED_BUT_UNAVAILABLE` → `incomplete_retryable` →
  `completed_successfully: false` → `hunt.yaml` `write_evidence` does not run.
- `no_tier2_targets` is not in that set → `complete` → evidence stamped → report retired.
- Libra P3 and the review ledger already named this follow-up; attribution is a sibling
  (`kibana-0vt` / kibana#302109) and stays out of scope.

Workspace note: some local branches may not yet contain Cyber/`selectHuntCallModel`.
Implement from `main` after 300025 (or an equivalent tip that includes it). Re-read the
cited files at the branch tip before editing.

## Desired End State

- `matchDatasetsWithModel` returns `{ status: 'matched', … } | { status: 'empty' } |
  { status: 'failed', message?: string }`.
- Catch / rejected-template-with-no-fallback → `failed`.
- Zero input datasets, empty model answer, all hallucinated, all below threshold →
  `empty`.
- `resolveTier2Targets` surfaces the match status when the model path ran.
- Coordinator: `failed` → `no_inference` / `incomplete_retryable` (no evidence write);
  `empty` with a selected model → `no_tier2_targets` / `complete` (retire as today).
- Narrative for `no_inference` can describe a dataset-match call failure, not only a
  missing Efficient / GenAI connector.
- Unit tests cover both branches; one live local repro confirms a forced match failure
  does not stamp `last_hunted_at`.
- Draft Kibana PR on main with `v9.7.0`, `v9.6.0`, `backport:version`.

### Key Discoveries:

- Single production caller: `resolve_tier2_targets.ts` → coordinator. Return-type change
  stays local to that chain.
- Nearby discriminated patterns: `ResolveScopedModelOutcome` (`scoped_model.ts`),
  `EsqlGroundedResult` (`report_grounding.ts`). Prefer a `status`-tagged union matching
  the agreed contract.
- Coordinator cyber-empty tests already expect `no_tier2_targets` for successful empty;
  those stay. Missing today: a throwing / `failed` match expecting `no_inference`.
- Live failure repro must force a throw that reaches the catch (broken connector or
  template rejection with no usable `messagesFallback`). Model returning `[]` is still
  `empty` and must still retire.

## What We're NOT Doing

- Cyber-domain model token-usage attribution (`kibana-0vt` / kibana#302109).
- Auditing recommendations or other Hunt `undefined`-means-empty collapses.
- Adding a new skip reason (`dataset_match_failed`); reuse `no_inference`.
- Treating filtered-empty or zero-input datasets as `failed`.
- Filing or linking a public Kibana tracking issue that names security-team#20615.
- Changing `hunt.yaml` retirement gating beyond what completeness already provides.
- Bumping managed workflow `version` fields (none expected for this change).
- Failed match with non-empty other targets (for example `actionable_indices`): Tier 2 runs
  on those targets and the report retires, same as today's missing-model case.
- Retry cap or backoff for a persistently failing connector: `incomplete_retryable` retries
  every sweep, same as existing `no_inference`.
- The `MAX_MODEL_DATASET_OPTIONS` (200) truncation: a correct `empty` can still retire a
  report whose matching dataset was cut from the option list.

## Resolved Decisions

Settled before execution so nothing needs asking mid-run.

1. **Base**: new worktree off `upstream/main` on branch `hunt-dataset-match-failed-vs-empty`.
   Confirm `4c58b2c` (kibana#300025) is in the base first. The current checkout has no
   Cyber / `selectHuntCallModel`; re-read cited files at the real tip. Cyber vs
   Efficient-only differ only in how tests mock models, since the coordinator passes
   `models.efficient` to the matcher.
2. **Failure signal to the narrative**: add one optional result field,
   `tier2_skip_detail`, set only on the failed-match `no_inference` path. The narrative
   branches on it. `skipDetail` alone does not reach the narrative (it only lands in
   `incomplete[].detail`). Before Phase 2, check whether the coordinator result type is
   validated at the route or packaging layer and extend that schema if so.
3. **`resolveTier2Targets` shape**: `dataset_match` is optional on `Tier2Targets`. Absent
   when the model path did not run; set on every return site (there are five) when it did.
   Never copied onto the wire result. Existing `toEqual` tests rely on absence.
4. **What is `failed`**: one site, the catch around `structured.invoke`, plus
   `!output || !Array.isArray(output.datasets)` (that read sits outside the `try` today and
   would otherwise throw). A rejected template with no fallback surfaces through the same
   catch; it is not a separate case.
5. **`failed.message`**: truncated to about 200 characters. Full text stays in the existing
   `logger.warn`.
6. **Phases 1 and 2** are implemented in one pass (Phase 1 alone breaks type check). The
   pause after Phase 1 is a review checkpoint only; no temporary adapter.
7. **Release note label**: `release_note:fix`.
8. **Live repro recipe**: point the Efficient tier at a nonexistent connector id, using a
   report with body text, no vendor/product dataset match, and no Tier 1 hits. A
   model-returned empty or a Cyber fallback to Efficient is not the repro. Restore a
   healthy model for the retire-on-empty check.
9. **PR**: opened by a Sonnet subagent (latest, medium effort), signed as Sonnet. Not by a
   Fable agent.

## Implementation Approach

Introduce the outcome at the match helper, propagate status through
`resolveTier2Targets`, and branch the coordinator empty-target guard on
`dataset_match.status === 'failed'` before the existing missing-model and
`no_tier2_targets` paths. Keep retirement semantics for true empty matches unchanged.
Update narrative copy for the failure case. Prove with unit tests and one live stack run.

## Critical Implementation Details

**Ordering in the empty-target guard:** check match `failed` first, then
`!datasetMatchModel && needsModelDatasetMatch` → `no_inference`, else
`no_tier2_targets`. Reversing that order reintroduces the bug when a model was selected.

**Live repro pitfall:** a Cyber template-required connector that successfully falls back
to Efficient messages is not a failure. Disable or remove the fallback (or break the
connector so the catch runs) before claiming the repro.

---

## Phase 1: Discriminated match outcome

### Overview

Change `matchDatasetsWithModel` to return `matched | empty | failed` and update its unit
tests so catch vs empty are no longer both `undefined`.

### Changes Required:

#### 1. Outcome type and match helper

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common/match_hunt_datasets.ts`

**Intent**: Replace `Promise<ModelDatasetMatch | undefined>` with a discriminated
outcome. Map catch → `failed`, zero datasets / nothing usable after filters → `empty`,
accepted matches → `matched` (carry today's `matches`, `confidence`, `scored`). A
structured-output response that is missing or lacks an `output.datasets` array is also
`failed` (Resolved Decisions #4). Truncate `failed.message` to about 200 characters. Update
the docstring so it no longer claims those paths are indistinguishable.

**Contract**: Export something equivalent to:

```ts
type MatchDatasetsWithModelResult =
  | { status: 'matched'; matches: DiscoveredDataset[]; confidence: number; scored: Array<{ dataset: string; confidence: number }> }
  | { status: 'empty' }
  | { status: 'failed'; message?: string };
```

Keep `ModelDatasetMatch` only if still useful as the matched payload shape; otherwise
inline fields on `matched`. Optional `message` on `failed` should carry a short error
string for narrative / `skipDetail`.

#### 2. Match unit tests

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common/match_hunt_datasets.test.ts`

**Intent**: Flip expectations that today assert `undefined` for empty/hallucinated/
below-threshold/empty-input to `{ status: 'empty' }`, and throw / parse-fail cases to
`{ status: 'failed' }`. Keep success assertions on the `matched` payload.

**Contract**: One assertion per existing behavioral case; add an explicit assert that
`failed` includes a message when the catch path runs (if the contract carries one).

### Success Criteria:

#### Automated Verification:

- Match unit tests pass: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common/match_hunt_datasets.test.ts`
- No remaining production `undefined` return from `matchDatasetsWithModel` for the three
  mapped paths (grep / typecheck on the helper)

#### Manual Verification:

- Diff review: catch is the only `failed` site; empty-input and post-filter empty are
  only `empty`

**Implementation Note**: After this phase and automated verification pass, pause for
human confirmation before Phase 2. Callers (`resolve_tier2_targets`) will not compile
until Phase 2, so Phases 1 and 2 are implemented in one pass with no temporary adapter
(Resolved Decisions #6). Treat this pause as a review checkpoint only.

---

## Phase 2: Propagate failure to coordinator and narrative

### Overview

Surface match status from `resolveTier2Targets`, map `failed` to `no_inference` in the
coordinator empty-target guard, and fix operator-facing narrative copy for that path.

### Changes Required:

#### 1. Resolve Tier 2 targets

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common/resolve_tier2_targets.ts`

**Intent**: When `needsModelDatasetMatch` runs the helper, record the outcome status on
the returned targets object. On `matched`, fill `modelMatches` from the payload. On
`empty` or `failed`, leave model contributions empty but do not collapse the distinction.

**Contract**: Extend the resolve result with a field such as
`dataset_match?: { status: 'matched' } | { status: 'empty' } | { status: 'failed'; message?: string }`
(omit or mark skipped when the model path did not run). Do not invent targets on
`failed`.

#### 2. Coordinator empty-target guard

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/hunt_coordinator.ts`

**Intent**: When targets are empty and `targets.dataset_match?.status === 'failed'`,
return `tier1Only` with `reason: 'no_inference'` (reuse existing retryable path and
`TIER2_REQUESTED_BUT_UNAVAILABLE`). Preserve `!datasetMatchModel && needsModel…` →
`no_inference` and true empty → `no_tier2_targets`. Pass failure detail into
`skipDetail` / message when available.

**Contract**: Failed match must yield `completeness: incomplete_retryable` and
`completed_successfully: false`. Successful empty with a selected model must still yield
`no_tier2_targets` / `complete`.

#### 3. Hunt narrative

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common/build_hunt_narrative.ts`

**Intent**: When skip reason is `no_inference` because the dataset-match call failed,
describe that failure instead of falling through to “Efficient tier had no model” or
“no GenAI connector was available.”

**Contract**: The coordinator sets the optional `tier2_skip_detail` result field (see
Resolved Decisions #2) on the failed-match path; the narrative branches on its presence
for `no_inference`. No string-matching. Update narrative unit tests for the new copy.

#### 4. Resolve / narrative unit tests touched by the contract

**Files**: `common/resolve_tier2_targets.test.ts`, `common/build_hunt_narrative.test.ts`

**Intent**: Assert `empty` vs `failed` on the resolve result; assert narrative text for
match-call failure.

**Contract**: Existing “model matched nothing → contributes nothing” becomes `empty`,
not silent undefined.

### Success Criteria:

#### Automated Verification:

- Resolve + narrative + coordinator package tests that compile after the contract change
  pass when run for those files
- Type check for alertzero project: `node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json`

#### Manual Verification:

- Read the empty-target guard: failed branch precedes missing-model and
  `no_tier2_targets`
- Narrative for a failed match does not blame a missing Efficient tier when Cyber or
  Efficient was selected

**Implementation Note**: Pause for human confirmation after automated checks before
Phase 3.

---

## Phase 3: Regression tests, live repro, gates, PR

### Overview

Lock the retirement contract with coordinator tests, prove once on a local stack that a
forced match failure does not stamp evidence, run scoped gates, and open a draft PR for
main with 9.6 backport labels.

### Changes Required:

#### 1. Coordinator regression tests

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/hunt_coordinator.test.ts`

**Intent**: Keep existing “cyber/efficient found nothing → `no_tier2_targets` /
`complete`” cases (mock `{ status: 'empty' }`). Add (Cyber present and Efficient-only)
cases where the match outcome is `failed` (or the underlying invoke rejects) and expect
`tier2_skipped_reason === 'no_inference'`, `completeness === 'incomplete_retryable'`,
`completed_successfully === false`.

**Contract**: Default mocks that used `undefined` for “no match” must become
`{ status: 'empty' }` so they do not accidentally assert the failure path. Update all
three mock sites in `hunt_coordinator.test.ts` (the default at line 43 and the
`requireMock` uses near lines 234 and 1472) and the `mockResolvedValue(undefined)` default
in `resolve_tier2_targets.test.ts`.

#### 2. Live local repro

**Intent**: On a local Kibana + ES stack with Hunt Watch configured, force a dataset-match
call failure (Efficient tier pointed at a nonexistent connector id, per Resolved Decisions
#8) on a report that needs model matching. Confirm the run is
`no_inference` / not complete and that `write_evidence` does not stamp `last_hunted_at`
for that failure. Separately (or via unit proof already landed), confirm a true empty
match still retires.

**Contract**: Document the repro steps and outcome in the Phase 3 Beads notes
(`kibana-8mp.3`). Do not treat model-returned-empty as the failure repro.

#### 3. Gates and draft PR

**Intent**: Run scoped check/eslint/type_check for the touched alertzero surfaces. Open a
draft Kibana PR from a descriptive kebab branch (no owner prefix). Labels:
`Team:Security Investigations`, `release_note:fix`, `v9.7.0`, `v9.6.0`, `backport:version`. The PR is opened by a Sonnet
subagent (Resolved Decisions #9). Link kibana#300025 as prior
art; do **not** mention security-team#20615 in the PR title, body, or commits.

**Contract**: After the public PR exists, comment the PR URL on security-team#20615 and
update Beads epic/child notes with branch, PR URL, draft status, and SHA.

### Success Criteria:

#### Automated Verification:

- Coordinator + match + resolve jest suites for the changed files pass
- `node scripts/check.js --scope=branch` (or scoped eslint + type_check on alertzero) green
  for the change set

#### Manual Verification:

- Live failure repro: no evidence stamp / report still eligible
- Draft PR open; security-team#20615 commented with PR URL only (from the private issue
  side)
- Beads `kibana-8mp` notes updated; do not close until Steph confirms

**Implementation Note**: Pause after live repro before marking the epic done.

---

## Testing Strategy

### Unit Tests:

- `match_hunt_datasets.test.ts`: `matched` / `empty` / `failed` per return site
- `resolve_tier2_targets.test.ts`: status surfaced; empty vs failed
- `hunt_coordinator.test.ts`: empty → retire; failed → `no_inference` (Cyber and
  Efficient)
- `build_hunt_narrative.test.ts`: failure copy for `no_inference`

### Integration Tests:

- Not required beyond existing jest coverage of the coordinator. No new Scout/FTR unless
  a later follow-up asks for it.

### Manual Testing Steps:

1. Configure a report that needs model dataset matching.
2. Force match failure (broken connector or template rejection without fallback).
3. Run scheduled hunt; confirm `no_inference`, incomplete_retryable, no `last_hunted_at`
   from this run.
4. Restore a healthy model that returns no usable datasets; confirm `no_tier2_targets`
   and retirement still occur.

## Performance Considerations

None material. Same single model call; only the return shape and a guard branch change.

## Migration Notes

No persisted schema or saved-object migration. In-flight runs that already retired
incorrectly are not automatically revived; recovery (if needed) is operational and out of
scope unless product asks for a one-off.

## References

- Thread: https://github.com/elastic/kibana/pull/300025#discussion_r4405994851
- Libra parent: https://github.com/elastic/kibana/pull/300025#discussion_r4405464691
- Review ledger: `.tmp-pr-reviews/pr-300025-review.md`
- Private tracker: security-team#20615 (do not link from public Kibana surfaces)
- Beads: kibana-8mp (.1 / .2 / .3)
- Sibling (out of scope): `context/changes/hunt-cyber-model-attribution/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.
>
> In a repo with `.beads/`, these checkboxes are a convenience view, not the record. The
> Beads issues are the record: update the child task's notes with branch, PR URL, draft
> status, pushed SHA, and gate results as each phase lands, and do not close an issue
> until the user confirms.

### Phase 1: Discriminated match outcome

#### Automated

- [x] 1.1 Match unit tests pass for matched / empty / failed
- [x] 1.2 No collapsed `undefined` returns for the three mapped paths

#### Manual

- [x] 1.3 Diff review: only catch → failed; empty-input and filtered-empty → empty

### Phase 2: Propagate failure to coordinator and narrative

#### Automated

- [ ] 2.1 Resolve / narrative / related jest pass
- [ ] 2.2 alertzero type_check passes

#### Manual

- [ ] 2.3 Guard order: failed before missing-model and no_tier2_targets
- [ ] 2.4 Narrative does not blame missing Efficient when a match model was selected and failed

### Phase 3: Regression tests, live repro, gates, PR

#### Automated

- [ ] 3.1 Coordinator + match + resolve jest suites pass
- [ ] 3.2 Scoped branch check / eslint / type_check green

#### Manual

- [ ] 3.3 Live failure repro: no evidence stamp; report still eligible
- [ ] 3.4 Draft PR open; security-team#20615 commented with PR URL; Beads notes updated
