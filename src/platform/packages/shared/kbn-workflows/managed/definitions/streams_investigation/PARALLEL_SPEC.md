# Parallel Gather+Review — Design Spec

## Problem
Current workflow runs gather→review for each hypothesis sequentially.
5 hypotheses × ~3 min each = ~15 min wall time for the middle phase.

## Solution
Use `workflow.executeAsync` to fan-out all hypothesis sub-workflows simultaneously,
then poll each sequentially (they'll already be done or nearly done by then).

Expected wall time: max(hypothesis times) + ~15 s polling overhead per extra hypothesis.
With 5 × 3 min hypotheses: ~3.5 min vs ~15 min (4× speedup).

## New files needed

### 1. `investigation_hyp_workflow.yaml`
Sub-workflow for one hypothesis: gather (Haiku) + review (Haiku) + workflow.output

Inputs:
- `hypothesis` — object (id, statement, prior_confidence, suggested_queries)
- `context_summary` — string
- `stream_names` — array

Outputs:
- `gather` — object (hypothesis_id, evidence, gaps_found, gather_summary)
- `review` — object (hypothesis_id, decision, verdict, posterior_confidence, reasoning)

### 2. `streams_investigation/index.ts` — add export
```ts
export const STREAMS_INVESTIGATION_HYP_WORKFLOW_ID = 'system-streams-sigevents-investigation-hyp';
export const STREAMS_INVESTIGATION_HYP_WORKFLOW = { id, pluginId: 'streams', version: 1, yaml, ... }
```

### 3. `managed/definitions/index.ts` — add to registry

## Updated parent workflow structure

```
build_context (Sonnet)
  ↓
[launch_0..4] — workflow.executeAsync each hypothesis sub-workflow (all start immediately)
  ↓
init_hyp_results — data.set to null-initialize variables.hyp_N_gather / hyp_N_review
  ↓
poll_hyp_0 — while(true) { wait 15s; kibana.request GET /api/workflows/executions/{id}?includeOutput=true; if done: data.set + loop.break }
poll_hyp_1 — same (by the time hyp_0 poll exits, hyp_1 is likely already done)
poll_hyp_2 — same
poll_hyp_3 — same
poll_hyp_4 — same
  ↓
collect_results — data.set using variables.hyp_N_gather / hyp_N_review
  ↓
synthesize (Sonnet) — unchanged
  ↓
prepare_write_back + write_back — unchanged
```

Each launch_N and poll_hyp_N is guarded by `if: "${{ steps.build_context.output.hypotheses.size >= N+1 }}"`.

## Key implementation patterns

### kibana.request for polling
```yaml
- name: fetch_hyp_0
  type: kibana.request
  with:
    method: GET
    path: "/api/workflows/executions/{{ steps.launch_0.output.executionId }}?includeOutput=true"
  on-failure:
    retry:
      max-attempts: 3
      delay: "5s"
      strategy: exponential
```
Response body IS the execution object: `{ status, output: { gather, review }, stepExecutions }`.

### loop.break inside if inside while
```yaml
- name: check_done_0
  type: if
  condition: "${{ steps.fetch_hyp_0.output.status == 'completed' or steps.fetch_hyp_0.output.status == 'failed' }}"
  steps:
    - name: save_0
      type: data.set
      with:
        hyp_0_gather: "${{ steps.fetch_hyp_0.output.output.gather }}"
        hyp_0_review: "${{ steps.fetch_hyp_0.output.output.review }}"
    - name: break_0
      type: loop.break
```

### variables.* for cross-loop state
After the while loop, `variables.hyp_0_gather` has the last value set by any `data.set` with that key.
Used in `collect_results`:
```yaml
- name: collect_results
  type: data.set
  with:
    hypothesis_0:
      gather: "${{ variables.hyp_0_gather }}"
      review: "${{ variables.hyp_0_review }}"
```

## Verified facts
- `kibana.request` is a real step type (used in continuous_onboarding.yaml, features_identification.yaml)
- `loop.break` inside `if` inside `while` works (features_identification.yaml line 127)
- `variables.*` persists across loop iterations (features_identification.yaml uses it)
- `workflow.executeAsync` type literal: `workflow.executeAsync` (schema.ts line 601)
- `workflow.output` type, status top-level field, with: record (schema.ts lines 613-617)
- GET /api/workflows/executions/{id}?includeOutput=true response root IS the execution object
- `kibana.request` path uses Liquid `{{ }}` syntax; body/condition use `${{ }}`
- Sub-workflow managed definition needs TypeScript registration (not just YAML)
- Sub-workflow needs `triggers: [type: manual]` to pass managed_workflow_definitions.test.ts
