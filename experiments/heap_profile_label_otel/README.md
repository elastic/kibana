# Experiment: Task Manager heap-profile labels → OTel

**Status:** experimental, opt-in, stock-Node no-op.

## Objective

Attribute **live** process memory to Kibana Task Manager **task types** using a
custom Node.js heap-profile labels API, then export stock gauges:

| Signal | Source | Confidence |
| --- | --- | --- |
| Live `Buffer` / `ArrayBuffer` bytes | `getAllocationProfile().externalBytes` | **exact** (`memory.source=exact`) |
| Live V8 heap bytes | `samples[].size * samples[].count` | **sampled** (`memory.source=sampled_heap`) — no Poisson scale |

This is **stock-only** attribution (what is retained *now*). It is not flow
(allocated/freed in an interval). See
[`/Users/rudolf/dev/node/tasks/docs/otel-route-memory-metrics-design.md`](/Users/rudolf/dev/node/tasks/docs/otel-route-memory-metrics-design.md)
and
[`/Users/rudolf/dev/node/tasks/docs/otel-trace-memory-plugin-design.md`](/Users/rudolf/dev/node/tasks/docs/otel-trace-memory-plugin-design.md).

Label cardinality is bounded to **registered task types** (`task.type`). Never
`task.id`, `runAt`, saved-object id, or alert-instance id.

## Why a custom Node binary

Stock Node has no `v8.withHeapProfileLabels`. The instrumentation
feature-detects and is a **no-op** unless both are true:

- `KBN_HEAP_PROFILE_LABELS=1`
- `typeof require('v8').withHeapProfileLabels === 'function'`

Built binary with the API:

```bash
/Users/rudolf/dev/node/out/Release/node -e "console.log(typeof require('v8').withHeapProfileLabels)"
# function
```

API docs: `/Users/rudolf/dev/node/doc/api/v8.md`
(`startHeapProfile`, `withHeapProfileLabels`, `setHeapProfileLabels`,
`getAllocationProfile`, `externalBytes`, Limitations).

## Run the standalone harness (primary deliverable)

Does **not** boot Kibana. Simulates a Task Manager loop with three fake types
(`alerting:monitoring`, `reports:execute`, `saved_objects:snapshot`), wraps
each `run()` like Task Manager, scrapes, and prints OTel export rows.

### Custom Node — expect per-type `externalBytes`

```bash
cd /Users/rudolf/dev/kibana
KBN_HEAP_PROFILE_LABELS=1 \
KBN_HEAP_PROFILE_LABELS_DEBUG=1 \
OTEL_METRIC_EXPORT_INTERVAL=2000 \
  /Users/rudolf/dev/node/out/Release/node \
  experiments/heap_profile_label_otel/harness.js
```

Look for `event: "scrape"` with `externalByType` populated for all three types,
then `event: "otel_export"` with `nodejs.heap_profile.live` rows.

### Stock Node — expect graceful no-op

```bash
cd /Users/rudolf/dev/kibana
KBN_HEAP_PROFILE_LABELS=1 node experiments/heap_profile_label_otel/harness.js
# {"event":"noop","reason":"heap profile labels API not available (stock Node)"}
```

### Point at a real collector

```bash
KBN_HEAP_PROFILE_LABELS=1 \
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://127.0.0.1:4318/v1/metrics \
  /Users/rudolf/dev/node/out/Release/node \
  experiments/heap_profile_label_otel/harness.js
```

Without `KBN_HEAP_PROFILE_LABELS_DEBUG=1` and with an OTLP URL set, the
module uses `@opentelemetry/exporter-metrics-otlp-http`. Debug mode (or no
URL) uses an in-process console exporter so you can see metrics without a
collector.

## Kibana Task Manager wrap

The only production-adjacent change is wrapping the awaited `task.run()` in
`TaskRunner`:

`x-pack/platform/plugins/shared/task_manager/server/task_running/task_runner.ts`

```ts
withTaskTypeHeapProfileLabels(this.taskType, () => this.task!.run())
```

`run()` is awaited by `TaskRunner` (`file:line` around the `runner.run` /
`withSpan` call), so `withHeapProfileLabels` covers the async body. Use
`setHeapProfileLabels` only if a future runner returns before the handler
runs.

The wrap lives in
`x-pack/platform/plugins/shared/task_manager/server/lib/experimental_heap_profile_labels.ts`
and is a no-op without the env flag / API.

To export metrics from a full Kibana process, start the scrape module from a
debug entry (or require
`experiments/heap_profile_label_otel/scrape_export.js` and call
`startHeapProfileLabelExport()`). Booting Kibana under the custom Node binary
is intentionally out of scope for this experiment.

## Metrics

Meter: `nodejs.heap_profile` (isolated `MeterProvider`, does not replace
Kibana's `@kbn/metrics` global).

| Name | Type | Unit | Attributes |
| --- | --- | --- | --- |
| `nodejs.heap_profile.live` | ObservableGauge | `By` | `task.type`, `memory.source` (`exact` \| `sampled_heap`), `confidence` |
| `nodejs.heap_profile.sample.count` | ObservableGauge | `{sample}` | `task.type` |
| `nodejs.heap_profile.scrape.duration` | ObservableGauge | `ms` | — |

Aggregation: per-`task.type` totals, empty labels → `_unlabeled`, collapse to
top-256 + `_other`.

## Expected Kibana Lens panels

Once OTLP lands in Elasticsearch / a local collector:

1. **Per-task-type live external bytes over time** — filter
   `nodejs.heap_profile.live` where `memory.source=exact`, break down by
   `task.type`.
2. **Top-N task types** — same metric, last-value rank, N ≤ 256
   (`_other` is overflow).
3. **Sampled-heap vs external split** — two series on
   `nodejs.heap_profile.live` split by `memory.source`.
4. **Scrape duration** — `nodejs.heap_profile.scrape.duration` (ms). Read-cost
   band from
   [`/Users/rudolf/dev/node/tasks/docs/benchmark-2026-08-06.md`](/Users/rudolf/dev/node/tasks/docs/benchmark-2026-08-06.md):
   ~1–3.5 ms main-thread stall per `getAllocationProfile()` at a 15–60 s
   cadence (labels-low ~2.6 ms / 4 routes; labels-trace ~2.8–3.5 ms).

## Dependencies

No new root `package.json` entries. The scrape module requires packages
already present in this Kibana checkout:

- `@opentelemetry/api` (direct Kibana dep)
- `@opentelemetry/exporter-metrics-otlp-http` (direct Kibana dep)
- `@opentelemetry/sdk-metrics` (transitive, `node_modules/@opentelemetry/sdk-metrics`)

If `sdk-metrics` is ever dropped from the tree, add it **only** under this
experiment directory — do not add it to Kibana's root `package.json` for this
experiment.

## Caveats

- **Stock Node is not flow.** This scrape is live stock at scrape time. Dead
  allocations that freed before the scrape do not appear. Route flow counters
  (`getHeapRouteStats`) are a different API; see the Node design docs.
- **Sampled vs exact.** Heap `samples` are a statistical estimate
  (`size * count`). Do not Poisson-scale. `externalBytes` are exact live
  backing-store bytes. Keep them on separate `memory.source` series.
- **async-context-frame required.** Labels propagate via
  `AsyncLocalStorage` + ContinuationPreservedEmbedderData. Default ON;
  `--no-async-context-frame` empties every `labels` object (Node emits
  `NODE_HEAP_PROFILE_LABELS_NO_ASYNC_CONTEXT`).
- **Cardinality bounds.** Only `task.type` (tens–hundreds of registered
  types). Top-N 256 + `_other`. Unbounded ids would pin interned label sets
  for the profiler lifetime.
- **Pooled Buffer origin ≠ owner.** A `Buffer` allocated under task A and
  later reused/held by task B still attributes to A's label context
  (allocation-time labels). Treat external bytes as *origin*, not current
  logical owner.
- **Feature is experimental.** Env-gated, clearly marked, does not change
  Task Manager timeouts, cancellation, or error handling.
