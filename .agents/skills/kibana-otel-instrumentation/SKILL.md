---
name: kibana-otel-instrumentation
description: Implement and quality-check OpenTelemetry metric instrumentation in Kibana code that uses `@kbn/metrics`. Use whenever the user wants to add, change, or review OTel metrics — including any call to `metrics.getMeter`, `meter.createCounter`/`createGauge`/`createHistogram`/`createObservable*`/`addBatchObservableCallback`, edits to `kibana.yml` `telemetry.metrics` config, or questions like "is this metric well-designed?", "what should I name this counter?", or "which instrument type is right here?". Trigger this skill even when the user does not say "OTel" or "OpenTelemetry" but is clearly adding observability to Kibana server code and already knows what they want to measure.
---

# Kibana OTel instrumentation (implement and review)

You wire up OpenTelemetry metrics in Kibana code — correctly. That means meter setup, metric creation, SemConv naming, type selection, attribute orthogonality, push vs observable, and implementation. Nothing else.

## On invocation — orient the user first

When this skill is triggered, **check before doing anything else** whether the user already understands the workflow. Skip orientation if they clearly do — e.g., they say "I already know how this works", or they've visibly done the prep (markers in place, metric list stated, asking to go straight to implementation or review).

Otherwise, give a concise orientation brief — not a wall of text, just the key points they need to come in prepared:

> **This skill handles the OTel wiring only.** It does not help decide what to measure, design surrounding logic, or source attribute values.
>
> Before we start, you'll need:
> 1. **Your metric list** — names (rough is fine), intended attribute keys, and a sense of the type (counter, gauge, histogram, …).
> 2. **Surrounding code already written** — conditions, control flow, what triggers each emission.
> 3. **`@otel:` markers** placed at each emit location in your code (see format below). These are how you tell me exactly where to insert emit calls.
> 4. **Attribute values** at each marker — the variable or expression that holds each attribute value. If you don't have them yet, I'll use placeholders and flag them for you.
>
> **Marker format:**
> ```typescript
> // @otel: kibana.elasticsearch.cps.request.count { outcome: result.outcome, target: host }
> ```
> The `{ }` block is optional — omit it and I'll insert `/* TODO */` placeholders for each attribute.
>
> Once those are in place, let me know which mode you need:
> - **Instrument** — add metrics to your code
> - **Review / QC** — check existing instrumentation
> - **Debug** — figure out why a metric isn't showing up

After giving the brief, use `AskUserQuestion` to ask which mode they want and confirm they're ready to proceed.

## Responsibilities — read this first

**What the developer owns before this skill starts:**

1. **The metric list.** What to measure is already decided — names (possibly rough), types (possibly rough), and the attribute keys they want. If this isn't settled, the developer should do that work first; this skill does not help design observability strategy.
2. **The surrounding code.** The business logic around each metric callsite — conditions, control flow, what triggers an emission — is already written by the developer. This skill does not design or modify surrounding code.
3. **Emit locations marked in code.** See the `@otel:` convention below.
4. **Attribute values.** The developer knows what variables at each callsite carry the attribute values (e.g. `result.outcome`, `host`). If values are not provided, this skill inserts `/* TODO: <attr-name> */` placeholders and informs the developer — see the placeholder protocol below.

**What this skill owns:**

- Reading the README, applying its rules.
- Deciding the fully-qualified metric name (SemConv check, naming convention).
- Deciding the correct instrument type (Counter / UpDownCounter / Gauge / Histogram).
- Deciding push vs observable; batching shared observable fetchers.
- Setting `description`, `unit`, and `valueType` correctly.
- Designing attributes to be orthogonal (not encoding lifecycle states as values on the same metric).
- Generating the meter setup and metric creation code.
- Inserting emit calls at the `@otel:` markers.
- Running the review checklist on its own output.

**What this skill explicitly does not own:**

- Deciding *what* to measure or *why*.
- Deciding *when* a metric emits (conditions, thresholds, lifecycle hooks) — that logic is written by the developer.
- Sourcing attribute values from the codebase — the developer provides them at the callsite marker.
- Modifying any code other than OTel setup and emit calls.

If the developer asks the skill to cross any of these lines, redirect them: "That's outside this skill's scope — please implement the surrounding logic and mark the emit location, then I'll wire up the metric."

## Canonical source of truth

The README at [`src/platform/packages/private/opentelemetry/kbn-metrics/README.md`](../../../src/platform/packages/private/opentelemetry/kbn-metrics/README.md) owns all substantive rules for this domain — config shape, instrument types, naming convention, attribute design, document structure. **Re-read it at the start of every task that uses this skill.** Do not paraphrase it here; the file evolves and this skill stays useful only by deferring to it. If anything below conflicts with the README, the README wins.

This skill captures only workflow and interpretation hints — not rules already in the README.

## The `@otel:` emit marker convention

The developer marks each emit location with a comment using this pattern:

```typescript
// @otel: <fully-qualified-metric-name> { <attr-key>: <variable-or-expression>, ... }
```

Examples:

```typescript
// Single-line with attribute values provided
// @otel: kibana.elasticsearch.cps.request.count { outcome: result.outcome, target: host }

// Attribute values not yet known — placeholders will be inserted
// @otel: kibana.saved_objects.migrations.duration

// Multi-line form for long attribute lists
// @otel: kibana.http.server.request.duration
// @otel-attr: http.method=req.method
// @otel-attr: http.status_code=res.statusCode
// @otel-attr: http.route=route.path
```

**Finding markers:** `grep -n "@otel:"` in the target files. Read each marker and the code immediately around it (3–5 lines) before writing any emit code.

**Marker → emit code rules:**
- Replace the `@otel:` comment with the emit call (e.g. `counter.add(1, attrs)` or `gauge.record(value, attrs)`). Do not leave the marker comment in the final code.
- Derive attribute keys from the marker. Map values from what the developer provided after `{ }` or on `@otel-attr:` lines.

### Placeholder protocol

If the developer has not provided attribute values (no `{ }` block and no `@otel-attr:` lines), emit the call with `/* TODO: <attr-key> */` in each attribute value position:

```typescript
counter.add(1, {
  outcome: /* TODO: outcome */,
  target: /* TODO: target */,
});
```

After generating placeholders, list them clearly — one line per attribute — so the developer knows exactly what to fill in:

```
Attribute values needed at src/…/foo.ts:42:
  outcome — what variable holds the request outcome at this callsite?
  target   — what variable holds the ES node target?
```

The developer should reply with the values, then you regenerate the emit call with them filled in.

## Pick a mode

Tell the user which mode you're in before starting:

- **Instrumenting** a pre-decided metric set → run the two-phase workflow below. First check that emit markers are in place; if not, ask the developer to add them before proceeding.
- **Reviewing / QC'ing** existing instrumentation → run the review checklist.
- **Debugging** ("why isn't `kibana.foo.bar.requests` showing up?") → check Interpretation hint #1 first, then re-read the README's "Structure of the document" section.

## Authoring: two-phase instrumentation workflow

### Phase 1 — Technical design (per metric)

Ask the developer to share:
1. The metric list with rough names and intended attributes.
2. The file(s) containing the `@otel:` markers (or point to them if already visible in context).

Do **not** ask about surrounding logic, conditions, or where attribute values come from — that is the developer's domain and should already be encoded in the markers. If markers are missing, ask the developer to add them first.

For each metric, lock in the implementation contract. Render as a per-metric block or small table:

| Field | What to decide | Where the README owns it |
|---|---|---|
| Meter scope | String passed to `metrics.getMeter`, e.g. `kibana.<area>[.<sub-area>]`. | "Instrument your code with metrics" |
| Metric name | **Fully-qualified** (see Interpretation hint #1). Check OTel SemConv first (Interpretation hint #2). | "Naming convention" |
| Type | Counter / UpDownCounter / Gauge / Histogram. | "Which metric type should I use?" |
| Unit | SemConv-prescribed unit when one applies. | OTel SemConv (linked from the README) |
| `valueType` | `INT` or `DOUBLE`. | OTel API (mentioned in README examples) |
| Attributes | Orthogonal dimensions only — never mutually-exclusive lifecycle states. | "Attributes" |
| Push vs observable | Push for events; observable for sampled state; batch shared fetchers via `addBatchObservableCallback`. | "Instrument your code with metrics" (2.a / 2.b) |

Mirror an existing canonical example rather than inventing shape when in doubt: [`src/core/packages/elasticsearch/client-server-internal/src/configure_client.ts`](../../../src/core/packages/elasticsearch/client-server-internal/src/configure_client.ts) uses meter `kibana.elasticsearch.cps` and metric `kibana.elasticsearch.cps.request.count` — the fully-qualified name is in the `create*` call, not the meter.

Get explicit user approval on the design table before writing code.

### Phase 2 — Implementation

Write the meter setup, metric creation, and emit calls. Keep the diff strictly scoped to OTel code. If clean instrumentation requires a refactor (threading a context, extracting a seam), surface it for the developer to decide — do not do it silently.

After implementing, run the **review checklist** on your own diff before handing back.

If the change adds or alters `telemetry.metrics` config, verify the YAML shape against the README's config example.

## Review / QC checklist

Walk each item against the diff or file under review. Re-read the cited README section if a case is borderline.

- [ ] Meter name (`metrics.getMeter(...)`) reads as `kibana.<area>[.<sub-area>]`. *(README: "Instrument your code with metrics".)*
- [ ] Each metric name passed to `create*` is **fully qualified** — includes the meter scope prefix. Trace to `metrics.*` in the shipped document. *(Interpretation hint #1; README: "Structure of the document".)*
- [ ] Metric name follows OTel SemConv; reuses official name+unit when one exists. *(Interpretation hint #2; README: "Naming convention".)*
- [ ] Instrument type matches analytical use case (sums must be meaningful for counters; gauge when summation isn't; histogram is push-only). *(README: "Which metric type should I use?".)*
- [ ] `description`, `unit`, and `valueType` are set; `unit` matches SemConv. *(README examples.)*
- [ ] Push vs observable is appropriate; shared observable fetchers use `addBatchObservableCallback`. *(README: "Instrument your code with metrics", section 2.b.+.)*
- [ ] Attributes are orthogonal dimensions only; mutually-exclusive lifecycle states are separate metrics. *(README: "Attributes".)*
- [ ] Any `telemetry.metrics` config wiring matches the README's example shape.
- [ ] No `@otel:` marker comments remain in the final code.
- [ ] No `/* TODO: <attr-name> */` placeholders remain unreported to the developer.

If a check fails, re-read the relevant README section with the developer rather than negotiating in the abstract.

## Interpretation hints (pitfalls the README leaves implicit)

1. **The meter name is not auto-prefixed onto metric names.** Given `metrics.getMeter('kibana.elasticsearch.cps')` and `meter.createCounter('request.count', …)`, the document has `scope.name: "kibana.elasticsearch.cps"` and **`metrics.request.count`** — not `metrics.kibana.elasticsearch.cps.request.count`. To land at `kibana.elasticsearch.cps.request.count`, pass the fully-qualified name to `create*`: `meter.createCounter('kibana.elasticsearch.cps.request.count', …)`. The README's "Structure of the document" section shows the layout explicitly.

2. **Check OTel SemConv before inventing a name or unit.** The README's "Naming convention" section links the SemConv naming guide and instrument-naming list. Common metrics already have official names and units — reuse them. Only invent a Kibana-specific name when nothing fits, and even then mirror the SemConv style: dot-notation, lowercase, scoped namespace.

## When the README has the answer

If a question isn't covered here but plausibly lives in the README, re-read that section before guessing. Do not copy answers back into this skill — link to the README section instead.
