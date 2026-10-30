# Hunt Watch cyber-domain model attribution: Plan Brief

> Full plan: `context/changes/hunt-cyber-model-attribution/plan.md`
> Origin: review ledger `.tmp-pr-reviews/pr-300025-review.md` (finding F, Libra P2 r4407536958)

## What & Why

kibana#300025 lets Hunt Watch run extraction, dataset match and recommendations on a saved
"Cyber domain models" connector. That model is resolved without the `telemetryMetadata` the
tier models got in kibana#297563, and the bound inference client the template path calls is
never attributed either. Any sweep that lands on the cyber model writes token-usage docs with
no `feature_id` / `parent_feature_id`, so it is invisible to per-feature cost reporting.

## Starting Point

`resolveConfiguredScopedModel` already takes `chatModelOptions` (added during the 300025
review) but `hunt_models.ts` does not pass it for the cyber row. `buildScopedModel` creates the
inference client with `bindTo: { connectorId }` only, and the inference plugin's `BoundOptions`
already accepts default `metadata` that deep-merges with per-call metadata.

## Desired End State

Cyber-model calls on both the LangChain path and the template path carry
`pluginId` = caller's telemetry id and `aggregateBy` = `alertzero_parent`, identical to the
tiers. Two existing test files assert it.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| When to branch | After 300025 merges, from main | The fix edits lines 300025 adds; nothing to land on before then. |
| Template-path seam | Bind `metadata.connectorTelemetry` on the client in `buildScopedModel` | One place covers every bound-client call and keeps chat model and client in sync. |
| Libra thread | Link in PR body only, no reply | Keeps the earlier "leave it" call; Yuliia owns the thread. |
| Verification | Unit tests only | Matches how 297563 proved tier attribution; a live check needs an EIS template connector. |

## Scope

**In scope:** `hunt_models.ts` cyber call, `scoped_model.ts` `buildScopedModel`, their two test
files, gates, draft PR.

**Out of scope:** replying on 300025, per-call metadata in `invokeHuntStructured`, live
token-usage check, dataset-match failed-vs-empty follow-up, any inference plugin change.

## Architecture / Approach

One `chatModelOptions` object built once in `resolveHuntModels` feeds the tier loop and the
cyber resolver. Inside `buildScopedModel` the same `telemetryMetadata` goes to the chat model
(as today) and to `getClient`'s `bindTo.metadata.connectorTelemetry` (new), only when defined.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Attribute both paths | Two one-argument code changes plus assertions in two tests | Binding `metadata` with an undefined telemetry object would change the no-options path's shape |
| 2. Gates and PR | Green scoped gates, draft PR by Sonnet with lineage links | Stale package caches in a fresh worktree block type_check until regenerated |

**Prerequisites:** 300025 merged to main; a worktree cut from `upstream/main` after that.
**Estimated effort:** one short session.

## Open Risks & Assumptions

- Assumes 300025 merges without further changes to `hunt_models.ts` or `scoped_model.ts`.
  Re-read both at the merge commit before editing.
- Assumes the actions plugin keeps reading `telemetry_metadata.pluginId` / `aggregateBy` into
  the token-tracking event; this plan does not touch that path.

## Success Criteria (Summary)

- Cyber resolver receives the same `chatModelOptions` as the tiers (asserted).
- Bound client carries `connectorTelemetry` when telemetry is given, nothing extra when not
  (asserted).
- Scoped gates green; draft PR open with the Libra thread and 297563 linked.
