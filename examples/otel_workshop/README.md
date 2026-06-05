Team owner: Platform

# ☕ Coffee Shop — OpenTelemetry Workshop

A hands-on exercise plugin for learning how to instrument Kibana with **OpenTelemetry
metrics and traces the Kibana way**. It ships a small, fully-working — but completely
**un-instrumented** — fake coffee-shop order pipeline. Your job during the workshop is to
add the instrumentation and watch it show up in a telemetry backend.

> This README is the exercise guide. The full solution lives on the branch
> **`eah-otel-workshop-solution`** — peek if you get stuck, or diff against it at the end.

## What the app does

`processOrder()` runs a coffee order through three stages — **grind → brew → garnish** —
each with a little artificial latency and a small chance of failing (the grinder jams, we
run out of beans, someone spills the milk). There are two routes and a UI to drive them:

| Route | What it does |
| --- | --- |
| `POST /api/otel_workshop/order` | Brews one order. |
| `POST /internal/otel_workshop/brew_batch` | Fires N orders **concurrently** — the "generate load" button. |

The app is registered under **Developer examples → "Coffee Shop (OTel Workshop)"**.

Almost everything you touch is in **one file**:
[`server/pipeline/process_order.ts`](server/pipeline/process_order.ts). It is dotted with
`// @otel:` and `// TODO(Tier N):` markers showing exactly where each step goes.

## Setup

Get the collector running and Kibana pointed at it **before** you start Kibana, so it
exports from the moment it boots.

### 1. Start a local OTLP collector

Run an OpenTelemetry Collector on your laptop to receive Kibana's metrics and traces. The
quickest "did it work?" check is the `debug` exporter, which prints every metric and span to
the collector's own logs.

**a. Save this as `otel-collector-config.yaml`** (anywhere — e.g. your home dir or a scratch
folder; you'll mount it into the container next):

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }
exporters:
  debug: { verbosity: detailed }
service:
  pipelines:
    metrics: { receivers: [otlp], exporters: [debug] }
    traces: { receivers: [otlp], exporters: [debug] }
```

**b. Run the collector** from the directory where you saved that file (so `$(pwd)` resolves
to it), and leave it running in its own terminal:

```bash
docker run --rm -p 4317:4317 -p 4318:4318 \
  -v "$(pwd)/otel-collector-config.yaml:/etc/otelcol/config.yaml" \
  otel/opentelemetry-collector:latest
```

This terminal now streams your metrics + spans (the `debug` exporter). Want a real trace UI?
Add a Jaeger service on `:16686` and an `otlp/jaeger` exporter to the collector config.

### 2. Point Kibana at the collector

All telemetry config goes in **`config/kibana.dev.yml`** — your personal, git-ignored dev
config that Kibana automatically merges on top of `config/kibana.yml` when started with
`--dev` (which `yarn start` does). Create the file if it doesn't exist yet, and add:

```yaml
# Elastic APM and OpenTelemetry tracing can't both be enabled. APM defaults to on in dev,
# so turn it off — otherwise Kibana refuses to boot with telemetry.tracing enabled.
elastic.apm.active: false

telemetry.metrics:
  enabled: true
  interval: 10s
  exporters:
    - grpc:
        url: 'http://localhost:4317'

telemetry.tracing:
  enabled: true
  sample_rate: 1 # trace 100% of orders for the workshop
  exporters:
    - grpc:
        url: 'http://localhost:4317'
```

> ⚠️ **`elastic.apm.active: false` is required.** With `telemetry.tracing.enabled: true` but
> APM still active, Kibana errors out at start-up:
> *"Elastic APM and OpenTelemetry tracing cannot be enabled simultaneously."*

### 3. Start Elasticsearch

Kibana needs an Elasticsearch to boot. The workshop plugin itself never touches ES, but
Kibana won't start without one — so in a **separate terminal**, start a local snapshot and
leave it running:

```bash
yarn es snapshot --license trial
```

### 4. Start Kibana with the example plugins

```bash
yarn kbn bootstrap          # first time only (or after switching branches)
yarn start --run-examples
```

Open Kibana → **Developer examples → "Coffee Shop (OTel Workshop)"**. Place an order and brew
a batch to confirm the app works. It emits **no** telemetry yet — that's the exercise.

---

## Tier 1 — Metrics

> 📖 The rules for this section live in the
> [`@kbn/metrics` README](../../src/platform/packages/private/opentelemetry/kbn-metrics/README.md).
> Re-read its "Instrument your code with metrics", "Which metric type should I use?", and
> "Attributes" sections — they are the source of truth.

You'll add **two** instruments to the order pipeline:

| Instrument | Name | What it measures |
| --- | --- | --- |
| `UpDownCounter` | `kibana.otel_workshop.order.active` | Orders **currently** in the pipeline (goes up, then down). |
| `Histogram` | `kibana.otel_workshop.order.duration` | How long each order took, split by `coffee.drink` + `outcome`. |

### Step 1 — Create the meter and instruments

Create a new file `server/metrics.ts`. Get the meter **once** at module scope, and pass the
**fully-qualified** metric name to each `create*` call (the meter name is *not* auto-prefixed):

```ts
import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('kibana.otel_workshop');

export const activeOrders = meter.createUpDownCounter('kibana.otel_workshop.order.active', {
  description: 'Orders currently being processed in the pipeline.',
  unit: '1',
  valueType: ValueType.INT,
});

export const orderDuration = meter.createHistogram('kibana.otel_workshop.order.duration', {
  description: 'Time taken to prepare an order, by drink and outcome.',
  unit: 'ms',
  valueType: ValueType.DOUBLE,
});
```

### Step 2 — Emit at the markers in `process_order.ts`

Import them: `import { activeOrders, orderDuration } from '../metrics';` then replace the
three `// @otel:` markers:

```ts
// at the "+1" marker, before the try block:
activeOrders.add(1);

// in the finally block:
orderDuration.record(durationMs, { 'coffee.drink': drink, outcome });
activeOrders.add(-1);
```

(You can delete the `void durationMs;` line once you're using `durationMs`.)

> **Why an UpDownCounter has two emit sites.** An order *enters* the pipeline (`+1`) and
> later *leaves* it (`-1`). The `-1` lives in `finally` so it runs whether the order
> succeeds or fails — otherwise the in-flight count would leak upward forever. An instrument
> is a stable handle: you create it once and emit on it many times.
>
> **Why no attributes on the UpDownCounter.** For the series to net back to zero, the `+1`
> and `-1` must carry *identical* attributes. We keep it attribute-free here to stay simple;
> all the interesting dimensions go on the histogram, where there's no matching constraint.
> (See the Appendix for the attributed variant.)

### Verify

Restart `yarn start`, open the app, and click **Brew a batch of 25**. Within ~10s
(`interval`) your **collector terminal** prints metric records — look for:
- `kibana.otel_workshop.order.active` rising above 1 during the batch, then settling to 0.
- `kibana.otel_workshop.order.duration` as a histogram carrying the `coffee.drink` and
  `outcome` (`success` / `failure`) attributes.

---

## Tier 3 — Traces

> 📖 The rules for this section live in the
> [`@kbn/tracing` README](../../src/platform/packages/shared/kbn-tracing/README.md). Use the
> [`withActiveSpan`](../../src/platform/packages/shared/kbn-tracing-utils/src/with_active_span.ts)
> helper from `@kbn/tracing-utils` — it ends spans and records exceptions for you.

You'll turn each order into a trace: a parent **`process_order`** span with a child span per
stage. Because every HTTP route handler is already auto-wrapped in a request span, your
`process_order` span automatically nests **underneath** the request — no manual parenting.

### Step 1 — Wrap the pipeline

In `process_order.ts`, `import { withActiveSpan } from '@kbn/tracing-utils';` and wrap the
body of the `try` block. (The import resolves and the app runs as-is; only if you run the
repo's `node scripts/lint_ts_projects.js` check do you also need to add `@kbn/tracing-utils`
to `kbn_references` in `tsconfig.json`.)

```ts
return await withActiveSpan(
  'process_order',
  { attributes: { 'coffee.drink': drink, 'coffee.size': size } },
  async (span) => {
    await grindBeans(drink, size);
    const shots = await brew(drink, size);
    span?.setAttribute('coffee.shots', shots); // set an attribute mid-span
    await garnish(drink, size);
    return { id, drink, size, outcome, shots, durationMs: Math.round(performance.now() - start) };
  }
);
```

### Step 2 — Add a span per stage

Wrap each stage's body the same way, e.g.:

```ts
const grindBeans = (drink: DrinkType, size: DrinkSize): Promise<void> =>
  withActiveSpan('grind_beans', async () => {
    await delay(MENU[drink].grindMs * SIZE_MULTIPLIER[size]);
    maybeFail(drink, 'the grinder jammed', GRIND_FAILURE_RATE);
  });
```

### Verify

Brew another batch and watch your **collector terminal** (or your Jaeger UI, if you added
one). You should see `process_order` spans with nested `grind_beans` / `brew` / `garnish`
children, your `coffee.*` attributes, and — for the orders that fail — a span automatically
marked **error** with the exception recorded. You did not write any error-handling code for
that: `withActiveSpan` does it for you.

---

## Use the `kibana-otel-instrumentation` skill (optional)

If you're working in Claude Code, the `@otel:` markers in `process_order.ts` follow the
exact convention the **`kibana-otel-instrumentation`** skill expects. Trigger the skill and
ask it to **review** your instrumentation against its checklist, or to wire the markers for
you.

## Appendix — going further (not part of the 60-minute flow)

- **Tier 2 — observable (pull-based) metrics.** Track live queue depth or per-drink bean
  inventory with `meter.createObservableGauge(...).addCallback(...)`, and batch several
  pull-based metrics that share one fetcher with `meter.addBatchObservableCallback(...)`.
- **A "total orders served" Counter.** The monotonic sibling of the in-flight UpDownCounter:
  `meter.createCounter('kibana.otel_workshop.order.served', …)`, `add(1, { outcome })` once
  per order. Sums are meaningful, so attributes here are fine.
- **Attribute cardinality trap.** Never put the order `id` (or any unbounded value) on a
  metric attribute — it creates one time series per order and blows up storage. `coffee.drink`
  is bounded and safe; `id` is not. (It's fine as a *span* attribute, though.)
- **Elasticsearch auto-instrumentation.** The ES client is auto-traced. Add a stage that does
  a real `esClient.search(...)` and you'll see an ES child span appear under `process_order`
  for free.
