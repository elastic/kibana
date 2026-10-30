# Hunt Watch cyber-domain model attribution Implementation Plan

## Overview

After kibana#300025 merges, Hunt Watch can run extraction, dataset match and recommendations on
the "Cyber domain models" row (`ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID`, value
`alertzero_template_models`). kibana#297563 made every tier model carry
`chatModelOptions.telemetryMetadata = { pluginId, aggregateBy: 'alertzero_parent' }` so its token
usage rolls up under AlertZero. The cyber model does not get that, and neither does the bound
inference client that the template path calls. This plan closes both gaps in one PR on top of
300025, copying the attribution the tiers already have.

## Current State Analysis

At the 300025 head (`b05188b`):

- `routes/hunt/lib/hunt_models.ts`: `resolveHuntModels` builds `chatModelOptions` inline inside
  the per-tier `resolveScopedModel` call (lines ~103 to 111). The cyber call to
  `resolveConfiguredScopedModel` (lines ~132 to 138) passes `inference`,
  `searchInferenceEndpoints`, `featureId`, `request`, `logger` and nothing else, so
  `chatModelOptions` defaults to `{}`.
- `routes/hunt/lib/scoped_model.ts`: `buildScopedModel` calls
  `inference.getChatModel({ request, connectorId, chatModelOptions })` and
  `inference.getClient({ request, bindTo: { connectorId } })`. The chat model is attributed when
  options are passed; the client never is.
- `services/watches/hunt/common/invoke_hunt_structured.ts`: the template branch calls
  `model.inferenceClient.chatComplete({ stream: false, messages: [...], template })` with no
  `metadata`. Every template call is unattributed regardless of which model it runs on.
- Inference plugin: `BoundOptions` (`inference-common/src/bind/bind_api.ts`) has
  `metadata?: ChatCompleteMetadata`. `bindApi` uses bound metadata as the default and
  deep-merges `connectorTelemetry` with any per-call metadata, so binding is the right seam.
  `ChatCompleteMetadata.connectorTelemetry` and `InferenceChatModel.telemetryMetadata` are
  both `ConnectorTelemetryMetadata`, so the same object can feed both.
- Downstream, the actions plugin reads `telemetry_metadata.pluginId` / `aggregateBy` from the
  connector request into the gen-AI token-tracking event (`action_executor.ts` ~808), which is
  where `feature_id` / `parent_feature_id` come from.
- Tests: `hunt_models.test.ts` has "attributes every resolved tier model to the caller-provided
  telemetry plugin id" iterating `resolveScopedModelMock.mock.calls`, and two cyber cases that
  only check `featureId`. `scoped_model.test.ts` has "passes the chat model options to the
  model it builds" for both resolvers, asserting `getChatModel` only, with
  `mockInferenceClient = {}` and `getClient` a bare mock. `invoke_hunt_structured.test.ts`
  asserts the exact `chatComplete` argument, which this plan does not change.
- Other callers of `buildScopedModel`: `plugin.ts` `resolveSummaryChatModel` already passes
  `telemetryMetadata`, so it picks up the bound-client attribution for free.

### Key Discoveries:

- `resolveConfiguredScopedModel` already accepts `chatModelOptions` (added in fb18985 for
  finding A), so the cyber fix is a one-argument change plus a test.
- `getClient`'s `bindTo.metadata` is the documented place for default call metadata; no
  inference plugin change is needed.
- `invokeHuntStructured` needs no change. Its test asserts the exact `chatComplete` payload,
  and that assertion stays valid because attribution lives on the bound client.

## Desired End State

A sweep or Tier 2 run that lands on a saved cyber model writes token-usage events with
`feature_id` = the caller's telemetry plugin id (`alertzero_hunt_sweep` or
`alertzero_hunt_tier2`) and `parent_feature_id` = `alertzero_parent`, on both the LangChain
structured-output path and the template path. Verified by unit tests that assert the cyber
resolver receives the same `chatModelOptions` as the tiers, and that `getClient` is bound with
`metadata.connectorTelemetry` equal to the chat model's `telemetryMetadata`.

## What We're NOT Doing

- No reply on Libra's thread r4407536958 on 300025. The PR body links it; Yuliia resolves it.
- No per-call `metadata` in `invokeHuntStructured`. Binding on the client covers it.
- No live end-to-end check against a real token-usage index (needs an EIS template connector,
  which is also open finding C on 300025).
- No change to the dataset-match failed-vs-empty behaviour (separate follow-up issue, drafted
  in the review ledger, unfiled).
- No branch off Yuliia's fork and no push to it.
- No changes to the inference plugin or `@kbn/inference-common`.

## Implementation Approach

Hoist the tier `chatModelOptions` object to one `const` in `resolveHuntModels` and pass it to
both the tier loop and the cyber call. In `buildScopedModel`, derive the bound client's
`metadata.connectorTelemetry` from `chatModelOptions.telemetryMetadata` so the chat model and
the client are attributed identically from a single source. Extend the two tests that already
cover the options plumbing.

## Critical Implementation Details

### Timing & lifecycle

Branch only after `gh pr view 300025 --json mergedAt` returns a timestamp. The fix edits the
exact lines 300025 adds, so a branch cut earlier has nothing to merge into and would conflict
on any rebase of the fork. Cut the worktree from `upstream/main` per the
`kibana-worktree-lifecycle` skill.

### State sequencing

Only set `bindTo.metadata` when `chatModelOptions.telemetryMetadata` is defined. `bindApi`
treats any truthy bound `metadata` as a default to merge, so binding
`{ connectorTelemetry: undefined }` would still produce a `metadata` key on every call; keep
the no-options path byte-identical to today so the existing "builds the saved connector"
assertion and the summary-model behaviour do not change shape.

## Phase 1: Attribute both paths

### Overview

Make the cyber model and the bound inference client carry the same telemetry metadata the tier
chat models already carry, with tests that fail if either is dropped again.

### Changes Required:

#### 1. Cyber resolver gets the tier telemetry

**File**: `x-pack/solutions/security/plugins/alertzero/server/routes/hunt/lib/hunt_models.ts`

**Intent**: Pass the same `telemetryMetadata` the tier loop builds to the cyber
`resolveConfiguredScopedModel` call, so the cyber model's token usage is attributed to the
caller's plugin id under `alertzero_parent`.

**Contract**: One `chatModelOptions` value, built once from `telemetryPluginId` and
`ALERTZERO_INFERENCE_PARENT_FEATURE_ID`, passed to every `resolveScopedModel` call and to the
`resolveConfiguredScopedModel` call. Keep the existing comment about the missing
`feature_id` next to the single definition. No signature change to `resolveHuntModels`.

#### 2. Bound inference client carries the same telemetry

**File**: `x-pack/solutions/security/plugins/alertzero/server/routes/hunt/lib/scoped_model.ts`

**Intent**: Bind `metadata.connectorTelemetry` on the inference client in `buildScopedModel`
from `chatModelOptions.telemetryMetadata`, so `inferenceClient.chatComplete` on the template
path is attributed without each call site threading metadata.

**Contract**: `inference.getClient({ request, bindTo: { connectorId, metadata: {
connectorTelemetry: telemetryMetadata } } })` when `telemetryMetadata` is defined;
`bindTo: { connectorId }` unchanged when it is not. `telemetryMetadata` is
`ConnectorTelemetryMetadata` on both sides, so no cast. Update the `chatModelOptions` doc
comment on both resolvers to say the metadata also attributes the bound client.

#### 3. Tests

**File**: `x-pack/solutions/security/plugins/alertzero/server/routes/hunt/lib/hunt_models.test.ts`

**Intent**: Prove the cyber call gets the same attribution as the tiers.

**Contract**: Extend the existing "attributes every resolved tier model" case (or add a sibling)
to assert `resolveConfiguredScopedModelMock` was called with `chatModelOptions` equal to
`{ telemetryMetadata: { pluginId: 'alertzero_hunt_sweep', aggregateBy:
ALERTZERO_INFERENCE_PARENT_FEATURE_ID } }`. Reuse the existing `resolve()` helper.

**File**: `x-pack/solutions/security/plugins/alertzero/server/routes/hunt/lib/scoped_model.test.ts`

**Intent**: Prove the bound client is attributed when options carry telemetry, and untouched
when they do not.

**Contract**: In both "passes the chat model options" cases assert `mockInference.getClient`
was called with `bindTo: { connectorId, metadata: { connectorTelemetry: { pluginId:
'test_plugin' } } }`. In "builds the saved connector and does not fall through" assert
`getClient` was called with `bindTo: { connectorId: ... }` and no `metadata` key.

### Success Criteria:

#### Automated Verification:

- Hunt lib jest passes: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/routes/hunt/lib`
- Hunt common jest unchanged and passing: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/common`
- New assertions fail when the cyber `chatModelOptions` argument or the `bindTo.metadata` is removed (revert each change locally once, run the two test files, confirm red, restore)

#### Manual Verification:

- Diff touches only `hunt_models.ts`, `scoped_model.ts` and their two test files

**Implementation Note**: After this phase and all automated verification passes, pause for
confirmation before opening the PR.

---

## Phase 2: Gates and PR

### Overview

Run the repo gates on the branch and open the draft PR through a Sonnet subagent, per the
global PR rule.

### Changes Required:

#### 1. Gates

**Intent**: Validate the branch with the named external gates, not self-review.

**Contract**:
- `node scripts/check.js --scope=branch`
- `node scripts/eslint --fix $(git diff --name-only upstream/main)`
- `node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json`
  (if the worktree reports stale package caches, regenerate per the
  `kibana-stale-package-caches` memory before rerunning)

#### 2. Pull request

**Intent**: Open a draft PR against `main` with a body in Steph's voice that names the gap, the
one-line fix per path, and links the Libra thread on 300025 for lineage.

**Contract**: Spawn a subagent with `model: "sonnet"`, `effort: "medium"`; it runs
`gh pr create --draft` and signs with the Sonnet attribution. Title: "[AlertZero] Attribute
Hunt Watch cyber-domain model token usage". Body links
`https://github.com/elastic/kibana/pull/300025#discussion_r4407536958` and kibana#297563 as
the pattern copied. Labels and team conventions from the `create-pr` / `team-config` skills.
Commit via the parent agent, message ending with the Claude Fable co-author line. Record
branch, PR URL, draft status and pushed SHA in kibana-0vt.2 notes. Do not close the beads
issues until Steph confirms.

### Success Criteria:

#### Automated Verification:

- `node scripts/check.js --scope=branch` exits 0
- ESLint reports no changes on the touched files
- `type_check` for the alertzero project exits 0
- PR CI (kibana-pull-request) green, or failures shown to be unrelated

#### Manual Verification:

- PR body reads in Steph's voice, no em dashes, links the Libra thread and 297563
- beads kibana-0vt.1 and kibana-0vt.2 notes carry branch, PR URL, SHA and gate results

---

## Testing Strategy

### Unit Tests:

- `hunt_models.test.ts`: cyber call receives the tier `chatModelOptions`.
- `scoped_model.test.ts`: `getClient` bound with `metadata.connectorTelemetry` when telemetry
  is given; no `metadata` key when it is not; both resolvers.
- `invoke_hunt_structured.test.ts`: no change expected; its exact-payload assertion must stay
  green, which proves the template call site did not change.

### Manual Testing Steps:

1. None required. A live token-usage check was explicitly left out.

## References

- Review ledger: `.tmp-pr-reviews/pr-300025-review.md` (finding F, Libra P2 4407536958)
- Base PR: https://github.com/elastic/kibana/pull/300025
- Pattern: https://github.com/elastic/kibana/pull/297563 (tier attribution)
- Bind semantics: `x-pack/platform/packages/shared/ai-infra/inference-common/src/bind/bind_api.ts`
- Token tracking: `x-pack/platform/plugins/shared/actions/server/lib/action_executor.ts` ~808

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` (<commit sha>)` when a step lands. Do not rename step titles.
>
> Beads is the record: kibana-0vt (epic), kibana-0vt.1, kibana-0vt.2. Update their notes with
> branch, PR URL, draft status, pushed SHA and gate results as each phase lands. Do not close an
> issue until Steph confirms.

### Phase 1: Attribute both paths

#### Automated

- [x] 1.1 Hunt lib jest passes
- [x] 1.2 Hunt common jest unchanged and passing
- [x] 1.3 New assertions fail when either change is reverted

#### Manual

- [x] 1.4 Diff touches only the four named files

### Phase 2: Gates and PR

#### Automated

- [ ] 2.1 scripts/check --scope=branch exits 0
- [ ] 2.2 ESLint clean on touched files
- [ ] 2.3 type_check alertzero exits 0
- [ ] 2.4 PR CI green or failures unrelated

#### Manual

- [ ] 2.5 PR body in Steph's voice with Libra thread and 297563 linked
- [ ] 2.6 beads notes carry branch, PR URL, SHA, gate results
