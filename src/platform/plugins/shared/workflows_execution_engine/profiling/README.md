# Workflows IO Cache — Profiling Harness

This directory contains the profiling scripts for the SQLite IO cache spike.

## Goal

Compare peak heap, RSS, and per-step rehydrate latency between two configurations:

| Run | `kibana.dev.yml` key | What it measures |
|-----|----------------------|-----------------|
| 1 — Baseline | `workflowsExecutionEngine.sqliteCache.enabled: false` | Heap grows per evicted step; ES mget on each rehydration |
| 2 — SQLite tier | `workflowsExecutionEngine.sqliteCache.enabled: true` | Heap-between-steps collapses; SQLite reads replace ES mget |

## Prerequisites

- Kibana running locally (see startup command below)
- A workflow created from `memory_pressure_workflow.yml` (import via the Workflows UI)

## 1. Start Kibana with a constrained heap

```bash
NODE_OPTIONS='--max-old-space-size=2048' yarn start
```

For GC pause data, add `--inspect` so Chrome DevTools can attach:

```bash
NODE_OPTIONS='--max-old-space-size=2048 --inspect' yarn start
```

## 2. Start the mock payload server

```bash
node profiling/memory_pressure_server.js
# Listens on http://127.0.0.1:19876 — returns 512 kb JSON per request
```

## 3. Record a baseline snapshot (before running the workflow)

With `--inspect` running, open `chrome://inspect` → *Open dedicated DevTools for Node* → Console tab, then run:

```js
const m = process.memoryUsage();
console.log('heap:', Math.round(m.heapUsed/1048576), 'MB  rss:', Math.round(m.rss/1048576), 'MB');
```

Save these numbers as your **before** values.

Alternatively, if you prefer a shell command, `/api/stats` requires basic-auth credentials (e.g. `elastic:changeme`) and the field names are transformed by Kibana (`_in_bytes` → `_bytes`):

```bash
curl -s -u elastic:changeme http://localhost:5601/api/stats | jq '{
  heap_used_mb: (.process.memory.heap.used_bytes / 1048576 | floor),
  rss_mb:       (.process.memory.resident_set_size_bytes / 1048576 | floor)
}'
```

## 4. Run the workflow

Trigger `memory-pressure-fan-in` manually from the Workflows UI. Wait for it to complete.

## 5. Record the peak snapshot (immediately after completion)

Re-run the DevTools console snippet above. The heap will not have been fully GC'd yet, so this gives a good approximation of peak.

**For rehydrate latency**: search the Kibana server logs for `rehydrat` — the debug logger emits per-call timing when `level: debug` is set for `plugins.workflowsExecutionEngine`.

**For GC pauses**: the simplest option is the `--trace-gc` flag — each GC event (kind, duration) is printed to the server log with no browser tooling needed:

```bash
NODE_OPTIONS='--max-old-space-size=2048 --trace-gc' yarn start
```

If you want a visual CPU timeline: start with `--inspect`, open `chrome://inspect` → *Open dedicated DevTools for Node* (the Node-specific window — not a regular browser DevTools tab). Go to the *Performance* tab and record while running the workflow. If the *Performance* tab appears empty, use `console.profile('run')` / `console.profileEnd('run')` around the execution instead — the result appears in the *Profiler* tab, not *Performance*. Note that `console.profile()` captures CPU time; for GC pause duration, `--trace-gc` is authoritative.

## 6. Repeat for the other configuration

Change `workflowsExecutionEngine.sqliteCache.enabled` in `kibana.dev.yml`, restart Kibana, and repeat steps 3–5.

## 7. Fill in the results table

| Metric | Run 1 — baseline | Run 2 — SQLite | Delta |
|--------|-----------------|----------------|-------|
| heap_used_mb (before) | | | |
| heap_used_mb (after) | | | |
| rss_mb (after) | | | |
| GC pause count | | | |
| GC pause total (ms) | | | |
| Avg rehydrate latency (ms) | | | |
| Total wall time (ms) | | | |

## Deferred profiling runs

- **Run 3 — json_extract pushdown**: requires surfacing per-field paths from
  `computeRehydrationTargets`. Blocked on `extractReferencedStepIds` extension.
- **Run 4 — binary BLOB**: requires schema extension (`payload BLOB` column)
  and `put(id, value: JsonValue | ArrayBuffer)` interface change.
