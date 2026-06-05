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

| Route                                     | What it does                                                  |
| ----------------------------------------- | ------------------------------------------------------------- |
| `POST /api/otel_workshop/order`           | Brews one order.                                              |
| `POST /internal/otel_workshop/brew_batch` | Fires N orders **concurrently** — the "generate load" button. |

The app is registered under **Developer examples → "Coffee Shop (OTel Workshop)"**.

Almost everything you touch is in **one file**:
[`server/pipeline/process_order.ts`](server/pipeline/process_order.ts). It is dotted with
`// @otel:` and `// TODO(Tier N):` markers showing exactly where each step goes.

## Setup

Get the collector running and Kibana pointed at it **before** you start Kibana, so it
exports from the moment it boots.

### 1. Start the EDOT Collector and Elasticsearch

<details>
<summary><strong>1. Using `docker compose`</strong></summary>

The file [`compose.yaml`](./compose.yaml) allows running the EDOT Collector and the ES server in one single command:

```bash
docker-compose -f examples/otel_workshop/compose.yaml up
```

NOTE: For some installations the command may look like:

```bash
docker compose -f examples/otel_workshop/compose.yaml up
```

</details>

<details>
<summary><strong>2. Prefer to run each service separately? Manual steps</strong></summary>

#### 1. Start a local EDOT collector

Run an EDOT Collector on your laptop to receive Kibana's metrics and traces. The
`debug` exporter prints every metric and span to the collector's own logs. The config in
[`otel-collector-config.yaml`](./otel-collector-config.yaml) adds a `filter/workshop`
processor so only workshop signals reach the exporter — no noise from Kibana's existing telemetry.

**b. Run the EDOT collector** from the root directory of the Kibana repo (so `$(pwd)` resolves
to it), and leave it running in its own terminal:

```bash
docker run --rm -p 4317:4317 -p 4318:4318 -e ELASTIC_AGENT_OTEL=true \
  -v "$(pwd)/examples/otel_workshop/otel-collector-config.yaml:/etc/otelcol-config.yml" \
  elastic/elastic-agent:9.4.2 --config /etc/otelcol-config.yml
```

This terminal now streams only your workshop metrics and spans, and push them to the local Elasticsearch instance that will be started in the following steps (so that we can use the local Kibana to inspect our metrics in the datastream `metrics-generic.otel-default` and our traces in `traces-generic.otel-default` and the APM UI).

#### 2. Start Elasticsearch

In a **separate terminal**, start a local ES cluster and leave it running:

```bash
yarn es snapshot
```

</details>

### 2. Point Kibana at the collector

All telemetry config goes in **`config/kibana.dev.yml`** — your personal, git-ignored dev
config that Kibana automatically merges on top of `config/kibana.yml` when started with
`--dev` (which `yarn start` does). Create the file if it doesn't exist yet, and add:

```yaml
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

### 4. Start dev Kibana with the example plugins

```bash
yarn kbn bootstrap          # first time only (or after switching branches)
yarn start --run-examples
```

The `no-base-path` warning at start-up is **expected and safe to ignore**: `--run-examples`
intentionally disables dev mode's base-path proxy so example apps get stable URLs. It
disables nothing the workshop needs.

Open Kibana → **Developer examples → "Coffee Shop (OTel Workshop)"** (http://localhost:5601/app/otelWorkshop). Place an order and brew
a batch to confirm the app works. It emits **no** telemetry yet — that's the exercise.

---

## Tier 1 — Metrics

> 📖 The rules for this section live in the
> [`@kbn/metrics` README](../../src/platform/packages/private/opentelemetry/kbn-metrics/README.md).
> Re-read its "Instrument your code with metrics", "Which metric type should I use?", and
> "Attributes" sections — they are the source of truth.

You'll add **three** instruments to the order pipeline:

| Instrument      | Name                                  | What it measures                                                       |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `UpDownCounter` | `kibana.otel_workshop.order.active`   | Orders **currently** in the pipeline, by drink (goes up, then down).   |
| `Counter`       | `kibana.otel_workshop.order.served`   | Total orders completed, by drink and outcome.                          |
| `Histogram`     | `kibana.otel_workshop.order.duration` | How long each order took, split by `coffee.drink` + `outcome`.         |

### Recommended: let the `kibana-otel-instrumentation` skill wire it up

The pipeline already carries the `// @otel:` markers this skill reads. In Claude Code, trigger
the **`kibana-otel-instrumentation`** skill and ask it to **instrument the markers in
`server/pipeline/process_order.ts`** — it re-reads the `@kbn/metrics` rules, creates the
meter, picks the right instrument types/units, and writes the emit calls for you. Then ask it
to **review** its own output against the skill's checklist.

Two things to confirm in what it produces:

- the UpDownCounter is emitted **twice** — `+1` where the order enters, `-1` in `finally`
  — and **both** carry `{ 'coffee.drink': drink }` with identical attributes so the series
  nets back to zero per drink (the callout below explains _why_ they must match);
- the served Counter and the duration Histogram both carry `coffee.drink` + `outcome` —
  the Counter has no matching constraint, so attributes are unconstrained.

<details>
<summary><strong>Prefer to wire it by hand? Manual steps</strong></summary>

#### Step 1 — Create the meter and instruments

Create a new file `server/metrics.ts`. Get the meter **once** at module scope, and pass the
**fully-qualified** metric name to each `create*` call (the meter name is _not_ auto-prefixed):

```ts
import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('kibana.otel_workshop');

export const activeOrders = meter.createUpDownCounter('kibana.otel_workshop.order.active', {
  description: 'Orders currently being processed in the pipeline.',
  unit: '1',
  valueType: ValueType.INT,
});

export const orderServed = meter.createCounter('kibana.otel_workshop.order.served', {
  description: 'Total orders completed, by drink and outcome.',
  unit: '1',
  valueType: ValueType.INT,
});

export const orderDuration = meter.createHistogram('kibana.otel_workshop.order.duration', {
  description: 'Time taken to prepare an order, by drink and outcome.',
  unit: 'ms',
  valueType: ValueType.DOUBLE,
});
```

#### Step 2 — Emit at the markers in `process_order.ts`

Import them: `import { activeOrders, orderServed, orderDuration } from '../metrics';` then
replace the four `// @otel:` markers:

```ts
// at the "+1" marker, before the try block:
activeOrders.add(1, { 'coffee.drink': drink });

// in the finally block:
orderDuration.record(durationMs, { 'coffee.drink': drink, outcome });
orderServed.add(1, { 'coffee.drink': drink, outcome });
activeOrders.add(-1, { 'coffee.drink': drink });
```

(You can delete the `void durationMs;` line once you're using `durationMs`.)

</details>

> **Why an UpDownCounter has two emit sites.** An order _enters_ the pipeline (`+1`) and
> later _leaves_ it (`-1`). The `-1` lives in `finally` so it runs whether the order
> succeeds or fails — otherwise the in-flight count would leak upward forever. An instrument
> is a stable handle: you create it once and emit on it many times.
>
> **Why both UpDownCounter emit sites must carry identical attributes.** For the series to
> net back to zero _per drink_, the `+1` and `-1` must carry exactly the same attributes.
> If you added `{ 'coffee.drink': drink }` to the `+1` but forgot it on the `-1`, the
> active count for that drink would leak upward forever — the SDK would see them as two
> separate series that never cancel.
>
> **Why the Counter has no such constraint.** A Counter only ever increments — each `add()`
> is independent, nothing needs to "cancel out". That makes attributes unconstrained: you
> can add any dimension you want. `coffee.drink` + `outcome` on `orderServed` lets you ask
> "how many cappuccinos succeeded?" and sum the answer meaningfully, because the Counter is
> monotonically increasing. (That's the key difference from a Gauge/Observable, where each
> reading is a point-in-time snapshot you can't meaningfully sum.)

### Verify

Restart `yarn start`, open the app, and click **Brew a batch of 25**. Within ~10s
(`interval`) your **collector terminal** prints metric records — look for:

- `kibana.otel_workshop.order.active` rising above 1 per drink during the batch, then settling to 0.
- `kibana.otel_workshop.order.served` as a Counter per drink and outcome, totalling 25.
- `kibana.otel_workshop.order.duration` as a histogram carrying the `coffee.drink` and
  `outcome` (`success` / `failure`) attributes.

---

## Tier 2 — Observable metrics _(skipped — see Appendix)_

Tier 2 in the curriculum is **observable / pull-based** metrics: values sampled on a timer
(`createObservableGauge` / `Observable*Counter`) instead of pushed on each event, plus
batching them with `addBatchObservableCallback`. It's intentionally left out of the
60-minute flow to keep things tight — the write-up is in the **[Appendix](#appendix--going-further-not-part-of-the-60-minute-flow)** below.
The tier numbers stay aligned with the workshop slides: Tier 1 was the _push_ side of
metrics, Tier 2 is the _pull_ side, and Tier 3 moves on to traces.

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

Brew another batch and watch your **collector terminal**. Then, head to the APM UI in Kibana.
You should see `process_order` spans with nested `grind_beans` / `brew` / `garnish`
children, your `coffee.*` attributes, and — for the orders that fail — a span automatically
marked **error** with the exception recorded. You did not write any error-handling code for
that: `withActiveSpan` does it for you.

---

## Appendix — going further (not part of the 60-minute flow)

- **Tier 2 — observable (pull-based) metrics.** Track live queue depth or per-drink bean
  inventory with `meter.createObservableGauge(...).addCallback(...)`, and batch several
  pull-based metrics that share one fetcher with `meter.addBatchObservableCallback(...)`.
- **Attribute cardinality trap.** Never put the order `id` (or any unbounded value) on a
  metric attribute — it creates one time series per order and blows up storage. `coffee.drink`
  is bounded and safe; `id` is not. (It's fine as a _span_ attribute, though.)
- **Elasticsearch auto-instrumentation.** The ES client is auto-traced. Add a stage that does
  a real `esClient.search(...)` and you'll see an ES child span appear under `process_order`
  for free.
