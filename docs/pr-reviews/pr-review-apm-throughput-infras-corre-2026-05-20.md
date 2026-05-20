# PR Review — `apm-throughput-infras-corre` (2026-05-20)

## Metadata
- **Branch**: `apm-throughput-infras-corre`
- **Author**: qn895
- **Base**: `main`
- **Reviewed**: 2026-05-20

## Changed Files Summary

| File | Change type |
|------|-------------|
| `apm/server/routes/correlations/queries/fetch_duration_field_candidates.ts` | Refactor: extract `FieldCandidatesResponse` to shared `types.ts` |
| `apm/server/routes/correlations/queries/fetch_infra_field_candidates.ts` | Fix: use full `getCommonCorrelationsQuery` (env + kuery) for `index_filter`, instead of bare range query |
| `apm/server/routes/correlations/queries/fetch_throughput_correlations.ts` | Fix: chunk per-value ES requests in groups of 10 to cap concurrent load |
| `observability_agent_builder/server/tools/get_apm_correlations/handler.ts` | Feature: add `throughput` and `infra_metrics` metrics to the agent tool |
| `apm/server/routes/correlations/queries/types.ts` (new) | Shared `FieldCandidatesResponse` interface |
| `*.test.ts` (3 new) | Unit tests for `fetchThroughputCorrelations`, `fetchInfraFieldCandidates`, `fetchCorrelations` |

## Functional Areas
- APM correlations query layer (throughput chunking, infra field filtering)
- Observability Agent Builder tool handler (new `throughput` / `infra_metrics` modes)

## Validation Notes
- TypeScript compilation and unit tests were not run in this session (out-of-scope for review tooling).
- No `node scripts/check_changes.ts` was run.

---

## Issue 1/5: `handler.ts` throughput fires 10 concurrent ES queries per field (no chunking)

- **Urgency**: High
- **Why it matters**:
  - The just-merged change to `fetch_throughput_correlations.ts` explicitly adds chunking with `CHUNK_SIZE = 10` to "cap simultaneous ES requests." The same rationale applies to the handler.
  - `handler.ts` fires all `THROUGHPUT_TOP_VALUES_PER_FIELD` (10) per-value timeseries queries in a single `Promise.allSettled` per field. With 25 fields (sequential) × 10 values (parallel), a peak of 10 concurrent search requests hits ES simultaneously for each field iteration — up to 250 total searches across the full loop.
  - In a large deployment or CCS setup this can trigger ES queue saturation or circuit breakers.

- **Evidence**:
  - [`handler.ts:306-351`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/handler.ts#L306-L351): `await Promise.allSettled(termBuckets.map(async (bucket) => { ... esClient.search(...) }))` — no chunking.
  - [`fetch_throughput_correlations.ts:169-197`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_throughput_correlations.ts#L169-L197): `for (const pairChunk of chunk(fieldValuePairs, CHUNK_SIZE))` — chunked.
  - Comment in `fetch_throughput_correlations.ts:168`: "cap simultaneous ES requests."

- **Proposed fix**:
  1. Replace the `await Promise.allSettled(termBuckets.map(...))` block with the same chunk pattern used in `fetch_throughput_correlations.ts`:
     ```ts
     const CHUNK_SIZE = 10;
     for (const valueBucket of chunk(termBuckets, CHUNK_SIZE)) {
       const settled = await Promise.allSettled(valueBucket.map(async (bucket) => { ... }));
       for (const r of settled) {
         if (r.status === 'fulfilled' && r.value) fieldValues.push(r.value);
       }
     }
     ```
  2. Import `chunk` from `lodash` (already used elsewhere in the handler's package).

- **How to verify**: Add a test that passes `THROUGHPUT_TOP_VALUES_PER_FIELD + 1` buckets and asserts that `esClient.asCurrentUser.search` is never called more than `CHUNK_SIZE` times concurrently (or verify the chunked invocation count in `mockSearch` call logs).

---

## Issue 2/5: `infra_metrics` in `handler.ts` uses `significant_terms` (KL divergence) while `fetch_correlations.ts` uses K-S test

- **Urgency**: High
- **Why it matters**:
  - The agent tool and the Kibana UI will produce **different correlation scores and rankings** for the same `infra_metrics` query because they use different statistical methods.
  - `handler.ts` uses `significant_terms` aggregation (KL divergence-based scoring) at [`handler.ts:140-181`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/handler.ts#L136-L181).
  - `fetch_correlations.ts` routes `infra_metrics` to the `else` (latency/significant) branch which calls `fetchFieldValuePairs` + `fetchSignificantCorrelations` — a K-S test-based approach.
  - An LLM interpreting divergent scores between the tool and the UI creates a confusing debugging experience.

- **Evidence**:
  - [`handler.ts:381-415`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/handler.ts#L381-L415): `if (metric === 'latency' || metric === 'infra_metrics')` shares the `significant_terms` path.
  - [`fetch_correlations.ts:77`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_correlations.ts#L77) + lines 267–368: `infra_metrics` enters the else branch calling `fetchSignificantCorrelations`.

- **Proposed fix**:
  1. Decide on a canonical algorithm for `infra_metrics`. The `significant_terms` approach in `handler.ts` is simpler but semantically correct (over-representation among slow transactions). Either document the intentional divergence or align.
  2. If alignment is desired, refactor `handler.ts` to use the same `fetchSignificantCorrelations` path (but that requires importing from the APM plugin, which the comment says is a constraint). In that case, add a note in both files explaining the divergence is by design.
  3. At minimum, update the tool description in `tool.ts` to accurately describe the algorithm used (`significant_terms` + KL divergence scoring, not K-S test).

- **How to verify**: Run both paths against the same data and compare output format and scores. Check the `infra_metrics` section in the tool description matches implementation.

---

## Issue 3/5: `fetch_correlations.test.ts` `infra_metrics` test never exercises `fetchSignificantCorrelations`

- **Urgency**: Medium
- **Why it matters**:
  - The `infra_metrics` branch in `fetch_correlations.ts` routes through `fetchFieldValuePairs` → `fetchSignificantCorrelations`. The test mocks `fetchFieldValuePairs` to return `{ fieldValuePairs: [] }`, causing the inner loop to never execute — `fetchSignificantCorrelations` is never called.
  - The test passes (it verifies routing to `fetchInfraFieldCandidates`) but gives false confidence about the end-to-end `infra_metrics` flow.
  - The "skips fetchInfraFieldCandidates when fieldCandidates are provided" test (`fetch_correlations.test.ts:142`) has the same problem.

- **Evidence**:
  - [`fetch_correlations.test.ts:129-158`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_correlations.test.ts#L129-L158): `mockFetchFieldValuePairs.mockResolvedValue({ fieldValuePairs: [] })`.
  - [`fetch_correlations.ts:290-308`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_correlations.ts#L290-L308): `fetchSignificantCorrelations` is only called if `fieldValuePairChunks` is non-empty.
  - `mockFetchSignificantCorrelations` is set up at line 131 but will never be called.

- **Proposed fix**:
  1. Change the mock to return a non-empty `fieldValuePairs`:
     ```ts
     mockFetchFieldValuePairs.mockResolvedValue({
       fieldValuePairs: [{ fieldName: 'host.name', fieldValue: 'host-a' }],
     });
     ```
  2. Assert that `fetchSignificantCorrelations` was called once with `host.name`/`host-a` in its args.
  3. Assert on `result.correlations` to verify the output is populated correctly.

- **How to verify**: After fix, run `node scripts/jest.js --testPathPattern="fetch_correlations.test.ts"` and confirm the `infra_metrics` tests fail if `fetchSignificantCorrelations` mock is removed.

---

## Issue 4/5: `handler.ts` silently duplicates constants from `apm/common/correlations/constants.ts`

- **Urgency**: Medium
- **Why it matters**:
  - `THROUGHPUT_BUCKET_COUNT = 20` and `THROUGHPUT_CORRELATION_THRESHOLD = 0.3` are defined in [`apm/common/correlations/constants.ts:99-100`](x-pack/solutions/observability/plugins/apm/common/correlations/constants.ts#L99-L100) and duplicated in `handler.ts`.
  - `THROUGHPUT_TOP_VALUES_PER_FIELD = 10` is only defined in `handler.ts` with no counterpart in the constants file.
  - If `THROUGHPUT_CORRELATION_THRESHOLD` changes in the APM constants (e.g., for a tuning fix), the handler will silently diverge. The comment explains the constraint but there's no enforcement mechanism.

- **Evidence**:
  - [`handler.ts:67-69`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/handler.ts#L67-L69): three locally defined constants.
  - [`constants.ts:99-100`](x-pack/solutions/observability/plugins/apm/common/correlations/constants.ts#L99-L100): `THROUGHPUT_CORRELATION_THRESHOLD = 0.3`, `THROUGHPUT_BUCKET_COUNT = 20`.

- **Proposed fix**:
  1. Add `THROUGHPUT_TOP_VALUES_PER_FIELD` to `apm/common/correlations/constants.ts` so the value is at least canonically documented.
  2. Add a CI/lint check or a code comment with a `TODO` that links to the constants file (e.g., `// sync with apm/common/correlations/constants.ts:THROUGHPUT_BUCKET_COUNT`), so reviewers know to update both.
  3. Consider whether `@kbn/apm-types` or a shared package could expose these numeric constants (instead of just field-name strings) to avoid the plugin dependency constraint.

- **How to verify**: Search for any other places in `observability_agent_builder` that duplicate APM constants, and document a convention for keeping them in sync.

---

## Issue 5/5: `computePearsonCorrelation` returns 0 for n < 3 with no observable warning

- **Urgency**: Medium
- **Why it matters**:
  - Both `handler.ts:78` and `fetch_throughput_correlations.ts:46` return `0` when the time series has fewer than 3 buckets. The minimum bucket size is 60 seconds, so any query with `end - start < 180_000` ms (3 minutes) will silently produce zero correlations.
  - The tool accepts any valid datemath range (e.g., `"now-2m"`) and will return `correlations: []` with no explanation. This is a silent degradation for short time windows.
  - More subtly: `computeIntervalMs(0, 120_000)` = `max(60_000, ceil(120_000/20/60_000) * 60_000)` = `max(60_000, 60_000)` = `60_000`. A 2-minute range produces 2 buckets → `n=2` → all correlations are `0`.

- **Evidence**:
  - [`handler.ts:76-87`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/handler.ts#L76-L87): `if (n < 3) return 0`.
  - [`fetch_throughput_correlations.ts:44-57`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_throughput_correlations.ts#L44-L57): same guard.
  - [`tool.ts`](x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_apm_correlations/tool.ts): no minimum time range validation in schema.

- **Proposed fix**:
  1. Add a schema-level warning or a minimum time range check. Either add to the Zod schema a `refine` check for a reasonable minimum (e.g., 5 minutes), or emit a `logger.warn` / include in the tool response when `overallBuckets.length < 3`.
  2. Update the tool description to note "Requires at least 3 time buckets (minimum ~3 minutes) for throughput correlation to be meaningful."
  3. Alternatively, return an explicit `reason: "time_range_too_short"` field in the throughput response object rather than silently returning `correlations: []`.

- **How to verify**: Call the tool with `start: "now-2m"`, `metric: "throughput"` against a live APM index and confirm the response includes a useful message rather than empty correlations.

---

## Top recommended next actions

- **Fix throughput chunking in `handler.ts`** — copy the exact `chunk(termBuckets, CHUNK_SIZE)` pattern from `fetch_throughput_correlations.ts` before shipping (Issue 1).
- **Clarify `infra_metrics` algorithm intentionality** — add a comment or update the tool description to document that `handler.ts` uses `significant_terms` (not K-S test) for infra metrics (Issue 2).
- **Strengthen `infra_metrics` test** — mock non-empty `fieldValuePairs` so that `fetchSignificantCorrelations` is actually exercised in `fetch_correlations.test.ts` (Issue 3).
- **Add `THROUGHPUT_TOP_VALUES_PER_FIELD` to `constants.ts`** — keeps the value canonical and surfaces it at review time (Issue 4).
- **Minimum time range guard** — a one-line `logger.warn` or response field for `n < 3` prevents confusing "no results" for short windows (Issue 5).

## Residual risks

- The interaction between `getCommonCorrelationsQuery` as `index_filter` and ES `fieldCaps` behavior was not empirically tested. The change is semantically correct but field caps with complex `index_filter` bool queries can behave differently across ES versions.
- The test for throughput chunking ([`fetch_throughput_correlations.test.ts:128`](x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_throughput_correlations.test.ts#L128)) validates resilience to individual failures, but doesn't assert the chunk boundary (that 3 pairs produces at most `CHUNK_SIZE=10` concurrent requests). This leaves the chunking behavior untested in a unit sense.
