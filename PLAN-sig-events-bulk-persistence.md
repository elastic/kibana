# Bulk persistence for SigEvents discovery & judge agents (issue #674)

## Context

The Significant Events **discovery** agent (`platform.streams.sig-events.discovery`) and **judge** agent
(`platform.streams.sig-events.discovery-judge`) persist one item at a time through the `discovery_write`
and `events_write` tools. Because repeated calls to the same tool are sequenced across model turns, a batch
of 10 decisions costs roughly 10 tool calls and 10 model turns. Every turn re-sends the accumulated prompt,
input batch, and prior tool results, so persistence dominates input-token cost even though the decisions are
already complete.

Goal: let each agent persist its complete batch in one normal tool call while preserving per-item semantics:
discovery deduplication, continuation snapshots, event version linkage, workflow queue advancement, and
downstream investigation triggering. A completed ES bulk response must expose aligned per-item outcomes so
only items explicitly reported as failed are eligible for retry.

The persistence layer is already bulk-capable: `EventClient.bulkCreate(events[])`,
`DiscoveryClient.bulkCreate(discoveries[])`, and `EventClient.findLatestByEventIds([...])` accept arrays.
The one-item-per-call constraint is primarily in the handler, tool schema, prompt, and eval layers.

## Decisions

- Convert the two existing tools in place to `{ items: [...] }` array input, retaining their tool ids.
- Use a bounded batch size (`MAX_BULK_WRITE_ITEMS = 100`) to cover expected managed-workflow batches without
  accepting an unbounded model-generated payload. Explicitly configured larger batches fail validation rather
  than being silently truncated.
- Reject duplicate dependency keys before any read or write:
  - `events_write`: duplicate explicit `event_id` values;
  - `discovery_write`: duplicate explicit `event_id` values, and duplicate fingerprints among dedup-eligible
    new `kind: 'discovery'` items.
  Synthetic event ids are generated per item and therefore cannot collide during preflight.
- Duplicate-key rejection is a whole-call validation error with the conflicting item indices. Because it
  happens before side effects, the agent may correct and retry the complete call safely.
- Preserve the existing single-item handler contracts for `event_create` and any direct callers: item-level
  persistence failure still throws rather than returning an apparent success.
- Keep the existing per-item EBT event types, but make telemetry best-effort and unable to change a completed
  persistence result.
- Update both managed workflow YAMLs so partial failures cannot advance queues or trigger investigations.
- Run focused Jest, type, lint, workflow-definition, and representative LLM eval verification. A full LLM
  eval-suite run remains optional, but at least one multi-item discovery case and one multi-item judge case
  are required to demonstrate the acceptance criteria.

## Result contracts and failure model

Use discriminated per-item result unions rather than optional success identifiers.

Event results:

- success: `{ index, event_uuid, event_id, status, written: true }`
- known ES item failure:
  `{ index, event_id, status, written: false, reason: 'bulk_error', error: { type, reason, status? } }`

Discovery results:

- success: `{ index, discovery_id, event_id, kind, written: true }`
- existing duplicate:
  `{ index, discovery_id, event_id, kind, written: false, skipped: true,
  reason: 'duplicate_within_window', existing_discovery_id }`
- known ES item failure:
  `{ index, discovery_id, event_id, kind, written: false, reason: 'bulk_error',
  error: { type, reason, status? } }`

Only `reason: 'bulk_error'` from a completed, cardinality-valid ES bulk response is automatically retryable.
Do not claim general idempotency:

- a pre-write lookup/validation failure is safe to retry because no write was attempted;
- a rejected `bulkCreate` promise is `outcome_unknown`, because ES may have accepted writes before the
  transport failed; the tool must not instruct the agent to retry the full batch automatically;
- a malformed response or `response.items.length !== submittedDocs.length` is also `outcome_unknown`;
- continuations, clearances, handled markers, and events have no dedup protection against accidental retry;
- even new discovery dedup is not a general idempotency mechanism because writes are not refreshed before an
  immediate retry.

Return only compact ES error fields needed for correction. Do not place the complete nested bulk error in the
agent context.

## Approach

### 1. Shared preflight invariants

Before lookups, UUID generation, telemetry, or persistence:

1. Require `1..MAX_BULK_WRITE_ITEMS` inputs.
2. For `events_write`, collect explicit `event_id` values and reject duplicates with all conflicting indices.
3. For `discovery_write`:
   - reject duplicate explicit `event_id` values regardless of `kind`;
   - for `kind: 'discovery'` inputs without an explicit `event_id` and with a parseable dedup window, compute
     `makeFingerprint(stream_names, ruleUuids)` and reject duplicate fingerprints.
4. Format validation failures as actionable tool errors, for example:
   `duplicate event_id "x" at items[1] and items[4]`.
5. Test that rejected calls perform no client reads or writes.

The prompts must instruct each agent to consolidate duplicate groups/decisions before calling the tool.
This removes unsafe same-key dependencies from the ES bulk request while keeping the normal path to one model
tool call and one ES write request.

### 2. Event write handler

Add `eventsWriteBulkHandler({ eventClient, inputs }): Promise<EventsWriteBulkResult[]>`:

1. Run duplicate-key preflight.
2. Collect unique non-synthetic `event_id` values and call
   `eventClient.findLatestByEventIds(ids)` once.
3. Capture one base time. For each input in order:
   - resolve its explicit or synthetic `event_id`;
   - mint `event_uuid`;
   - set `previous_event_uuid` from the persisted latest-event map;
   - set `@timestamp` from the captured base time;
   - build the document and retain its original input index.
4. Call `eventClient.bulkCreate(documents, { throwOnFail: false })` once.
5. Verify response cardinality before interpreting it.
6. Map `response.items[i].create` back to the original input index. Return a success result only when the
   corresponding create item has no error; otherwise return `reason: 'bulk_error'` with a compact error.

Because duplicate explicit `event_id`s are rejected, no event can point at another not-yet-confirmed event in
the same bulk request. Strictly increasing future timestamps and an in-memory `lastUuidByEventId` chain are
therefore unnecessary.

Keep `eventsWriteHandler` as a compatibility wrapper:

1. call `eventsWriteBulkHandler` with one input;
2. return only the success variant;
3. throw a typed persistence error for `bulk_error` or `outcome_unknown`.

This preserves `event_create`, whose current contract assumes a returned result always contains a valid
`event_uuid`.

### 3. Discovery write handler and client reads

Add `discoveryWriteBulkHandler({ discoveryClient, inputs }): Promise<DiscoveryWriteBulkResult[]>`:

1. Capture one deduplication `now` value, then run duplicate-key/fingerprint preflight and parse every dedup
   window relative to that same value.
2. For dedup-eligible inputs, call `discoveryClient.findLatest({ from: earliestCutoff })` once. Reuse the hits,
   but filter each input by `hit['@timestamp'] >= itemCutoff` before fingerprint matching so narrower windows
   are not widened.
3. Resolve an existing duplicate before minting a new id. Existing duplicates receive aligned skipped results
   and are not submitted to ES.
4. Fetch continuation histories once per unique explicit `event_id`, in parallel. Keep the existing
   `findByEventId` semantics and exclude `kind: 'handled'` before signal merging. Do not combine histories into
   a single unbounded ES|QL result: the default result cap could truncate history across events and change the
   continuation snapshot. A safely paginated/grouped `findByEventIdsForSnapshot` is a follow-up only if traces
   show these reads are material.
5. For every non-skipped input, mint `discovery_id`, prepare its snapshot signals, build the document, and
   retain the original input index.
6. Call `discoveryClient.bulkCreate(createdDocs, { throwOnFail: false })` once when there are documents to
   create. If all inputs were existing duplicates, skip the ES write and return the aligned results.
7. Validate response cardinality and map created-document response positions back through the recorded input
   indices.

There is no in-memory `claimedFingerprints` map: duplicate eligible fingerprints were rejected before writes,
so no item can be reported as a duplicate of a failed item in the same request.

Keep `discoveryWriteHandler` as a compatibility wrapper. It may return an existing-duplicate result, but must
throw for bulk or unknown-outcome failures, preserving the current single-item behavior.

### 4. Tool schemas, descriptions, telemetry, and errors

- Define per-item schemas once and wrap them with
  `z.object({ items: z.array(itemSchema).min(1).max(MAX_BULK_WRITE_ITEMS) })`.
- Keep discovery's per-item `dedup_window` default of `now-1h`.
- Return `{ results: [{ type: ToolResultType.other, data: { results } }] }` for cardinality-valid completed
  bulk operations, including partial item failures.
- Return `ToolResultType.error` for preflight, lookup, transport, or response-protocol failures. Include a
  machine-readable retry classification and make `outcome_unknown` explicitly non-automatic-retryable.
- Correct the `events_write` description: the current handler always appends an event version; it does not
  skip writes when status is unchanged.
- Track one EBT event per input/result:
  - successful write: `success: true, written: true`;
  - existing discovery duplicate: `success: true, written: false`;
  - ES item failure: `success: false, written: false, error_message`.
- Move telemetry outside the persistence `try/catch`, or wrap it in a best-effort helper. A telemetry exception
  must be logged but must never replace successful per-item tool results with a top-level error.
- If preflight or a pre-write lookup fails, emit failure telemetry for the affected inputs where practical.

Add direct tests for both tool wrappers; handler and registration tests alone do not cover schema parsing,
result wrapping, error classification, or telemetry isolation.

### 5. Prompts

Update `agents/discovery/instructions/discovery.md.text`:

- consolidate all output groups first;
- ensure at most one item per explicit `event_id` and one new discovery per fingerprint;
- make one `discovery_write` call with `items: [...]`;
- retry only indices with `reason: 'bulk_error'`, never a top-level `outcome_unknown` call;
- derive `written_rule_uuids` only from final successful results and confirmed existing-duplicate results;
- exclude failed/not-attempted items from `written_rule_uuids`;
- update tool examples to the batch shape.

Update `agents/discovery/instructions/judge.md.text`:

- produce at most one decision per `event_id`;
- make one `events_write` call with all decisions in input order;
- retry only indices with `reason: 'bulk_error'`;
- copy final `event_uuid`, `event_id`, `status`, and `written` values from tool results into structured output;
- include unresolved failures as `written: false` without inventing an `event_uuid`;
- update tool examples to the batch shape.

### 6. Managed workflows

Update `significant_events/discovery.yaml`:

- redefine `written_rule_uuids` as rules confirmed by final `written: true` or
  `duplicate_within_window` outcomes, not every attempted tool input;
- stamp processed detections only from that confirmed set;
- recompute final `processedCount`, `remainingCount`, `hasRemaining`, and `queueEmpty` from confirmed outcomes
  so a partially failed batch does not report all selected candidates as processed.

Update `significant_events/triage.yaml`:

- make `event_uuid` optional in the structured-output item schema when `written: false`;
- optionally carry `reason` for observability/debugging;
- stamp handled discoveries and trigger investigations only for `written: true` items;
- ensure investigation triggering additionally has a non-empty `event_uuid`;
- recompute final queue statistics from confirmed written events rather than selected input count.

Bump both managed workflow registry versions so the changed static YAML is reinstalled on upgrade.

The workflows still consume agent structured output because `ai.agent` does not expose tool results directly
as a workflow step output. The prompts and schemas must therefore require that this summary is copied from the
final tool results. Moving persistence completely into deterministic workflow/server code remains the preferred
longer-term architecture if a direct batch workflow action becomes available.

### 7. Eval code

Update `parse_agent_output.ts`:

- flat-map `step.params.items[]` against `step.results[0].data.results[]`;
- validate alignment rather than silently zipping mismatched arrays;
- include successful writes and existing discovery duplicates in semantic evaluator inputs;
- exclude `bulk_error` attempts, so a failed first attempt plus a successful retry is evaluated once;
- retain failure attempts in tool-usage/trajectory data.

Update discovery and judge tool-usage scorers:

- require exactly one persistence-tool call for a normal successful multi-item case;
- emit a distinct soft regression label for multiple persistence calls;
- allow a documented second call only when the preceding result contains retryable `bulk_error` items and
  the retry batch size matches the number of failed items, preventing a full-batch replay;
- retain the existing required/unnecessary tool checks.

Add parser and scorer tests for:

- multiple items in one call;
- aligned partial success/failure;
- failed attempt followed by successful retry;
- result cardinality mismatch;
- unjustified multiple persistence calls;
- one justified partial-failure retry.

## Files to modify

- `x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/event_write/{handler.ts,tool.ts}`
- `x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/discovery_write/{handler.ts,tool.ts}`
- `x-pack/platform/plugins/shared/significant_events/server/agent_builder/agents/discovery/instructions/{discovery.md.text,judge.md.text}`
- `src/platform/packages/shared/kbn-workflows/managed/definitions/significant_events/significant_events/{discovery.yaml,triage.yaml}`
- `src/platform/packages/shared/kbn-workflows/managed/definitions/significant_events/index.ts`
- `x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/evaluators/discovery/utils/parse_agent_output.ts`
- `x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/evaluators/discovery/{discovery,judge}/tool_usage/tool_usage.ts`
- corresponding handler, parser, scorer, workflow-definition, and registration tests

Create direct tool tests if no suitable files exist:

- `.../tools/event_write/tool.test.ts`
- `.../tools/discovery_write/tool.test.ts`

## Required test cases

Event handler/tool:

- multiple unique event ids use one latest lookup and one bulk create;
- response items align with inputs and expose partial failures;
- duplicate explicit event ids reject before reads/writes;
- response cardinality mismatch and transport rejection are `outcome_unknown`;
- the single-item wrapper throws on an item failure;
- `event_create` never acknowledges a failed/undefined UUID;
- telemetry receives one accurate event per item and telemetry failure does not alter tool results;
- min/max batch schema validation.

Discovery handler/tool:

- one earliest-cutoff scan preserves different per-item dedup windows;
- existing duplicates are aligned and omitted from the ES bulk request;
- duplicate explicit event ids and duplicate eligible fingerprints reject before reads/writes;
- continuation histories are fetched once per unique event id, in parallel, and merged independently;
- handled documents remain excluded from continuation snapshots;
- created-document response positions map correctly across skipped inputs;
- a failed created item is not reported as a successful duplicate target;
- all-skipped batches perform no bulk create;
- response cardinality, transport, telemetry, and min/max schema cases mirror event tests.

Workflow/eval:

- discovery bulk failures do not produce processed markers or inflate final processed counts;
- judge bulk failures do not produce handled markers or investigations;
- written high/critical events still trigger investigations with the exact returned `event_uuid`;
- semantic evaluators see one logical output after a failed attempt and successful retry;
- normal multi-item traces contain exactly one persistence tool call.

## Verification

```sh
# Unit tests
node scripts/jest x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/event_write
node scripts/jest x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/discovery_write
node scripts/jest x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/event_create
node scripts/jest x-pack/platform/plugins/shared/significant_events/server/agent_builder/tools/register_tools.test.ts
node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/evaluators/discovery

# Types
node scripts/type_check --project x-pack/platform/plugins/shared/significant_events/tsconfig.json
node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-significant-events/tsconfig.json

# Lint changed TS files, including newly created tool tests
node scripts/eslint --fix <changed .ts/.tsx files>
```

Also run the repository's managed-workflow definition validation/test covering `discovery.yaml` and
`triage.yaml`.

Run at least one representative multi-item discovery eval and one representative multi-item judge eval.
Record before/after:

- persistence tool-call count;
- agent/model turn count;
- input, cached, and output token counts;
- grouping, continuation, status, severity, evidence, and tool-use scores.

The normal success case passes acceptance criterion 8 only when each agent uses one persistence tool call and
the trace demonstrates fewer persistence-related model turns without a quality regression.
