# Deferred Plugin Initialization — Telemetry

This document catalogs every OTel span and metric emitted by the deferred (lazy) plugin
initialization subsystem. Each entry states the signal name, type, attributes, and the
operational question it answers.

---

## Background

Plugins that set `enableLazyInitialize: true` in their `kibana.jsonc` skip their
Elasticsearch-backed work at boot. That work runs the first time the plugin is actually
needed — driven by an incoming HTTP request, a cross-plugin contract call, or an explicit
programmatic trigger. Core manages this lifecycle invisibly from the plugin author's
perspective, but the timing, failure rate, and trigger paths are operationally significant
and need to be observable.

All signals live under the `kibana.plugins` OTel meter and carry a common set of
attributes so they can be joined, sliced, and dashboarded together.

---

## Common attributes

These attributes appear on every metric instrument and span described below.

| Attribute | Values | Description |
|---|---|---|
| `plugin.id` | e.g. `securitySolution` | Plugin manifest id |
| `plugin.source` | `oss` \| `x-pack` \| `external` | Where the plugin lives in the repo |
| `outcome` | `available` \| `failed` | Result of a single run attempt |
| `trigger.type` | `http_route` \| `contract` \| `explicit` | What caused lazy init to start |
| `trigger.detail` | e.g. `/api/security/me`, `alerting`, `—` | Route path (http_route), caller plugin id (contract), or `—` (explicit) |

`trigger.type` and `trigger.detail` are set at the moment the engine first kicks the
deferred work and are **not** updated if a later retry is triggered from a different path.
They answer "who first woke this plugin up", not "who last touched it".

---

## Spans

### `kibana.plugin.setup`

| | |
|---|---|
| **Type** | OTel span |
| **Parent** | `server-setup` APM transaction |
| **Emitted by** | `PluginsSystem.setupPlugins()` |

One span per plugin per server boot, nested inside the existing `server-setup` APM
transaction. Records the wall-clock time a plugin's `setup()` call occupies, including any
async work it awaits before returning.

**Attributes:** `plugin.id`, `plugin.source`

**Questions answered:**
- Which plugin's `setup()` is slowest at boot?
- How does a plugin's setup time trend across releases?
- What fraction of total boot time does `setup` account for across all plugins?

---

### `kibana.plugin.start`

| | |
|---|---|
| **Type** | OTel span |
| **Parent** | `server-start` APM transaction |
| **Emitted by** | `PluginsSystem.startPlugins()` |

One span per plugin `start()` call. For ordinary plugins this is nested inside
`server-start` at boot. For lazy-init plugins `start()` is deferred until the first
trigger, so the span is emitted then (alongside `kibana.plugin.deferred_init`) rather
than at boot.

**Attributes:** `plugin.id`, `plugin.source`

**Questions answered:**
- How much boot time does each plugin's `start()` consume?
- For lazy-init plugins: is `start()` lightweight as expected, or is work leaking in?
- Which plugins would benefit most from opting into lazy init (high `start` duration, non-critical path)?

---

### `kibana.plugin.deferred_init`

| | |
|---|---|
| **Type** | OTel span |
| **Parent** | Triggering HTTP request span (if http_route), otherwise root span |
| **Emitted by** | `DeferredInitEngine.runPhases()` |

One span per actual deferred-init attempt. Covers `lazyInitialize()` (unless it already
succeeded on this instance) and then `start()`. Per-instance and in-memory: there is no
distributed lock or saved-object round-trip. The span is ended with `OK` on success or
`ERROR` + exception recording on failure.

**Attributes:** `plugin.id`, `plugin.source`, `outcome`, `trigger.type`, `trigger.detail`

**Questions answered:**
- What was the wall-clock cost of a specific lazy init run?
- Which request (route path) first triggered initialization, and was that request slowed by it?
- When init fails, which exception was thrown and from which trigger path?
- Are retries converging or diverging (rising `outcome=failed` spans for the same plugin)?

---

## Metrics

### `kibana.plugin.lifecycle.duration_ms`

| | |
|---|---|
| **Type** | Histogram |
| **Unit** | milliseconds |
| **Emitted by** | `PluginsSystem.setupPlugins()`, `PluginsSystem.startPlugins()` |

Records the duration of each plugin's `setup()` or `start()` call. One observation per
plugin per lifecycle phase. For lazy-init plugins the `start` observation is recorded when
deferred `start()` actually runs, not at boot.

**Additional attribute:** `lifecycle` — `setup` or `start`

**Questions answered:**
- What is the p50/p95/p99 setup and start duration per plugin across the fleet?
- Which plugins account for the most cumulative boot time?
- For lazy-init plugins: is `start()` duration low (as expected) or suspiciously high?
- How does boot time distribution shift as plugins are migrated to lazy init?

---

### `kibana.plugin.deferred_init.duration_ms`

| | |
|---|---|
| **Type** | Histogram |
| **Unit** | milliseconds |
| **Emitted by** | `DeferredInitEngine.runPhases()` |

Records the wall-clock duration of each deferred-init attempt (`lazyInitialize` + `start`,
or `start` alone if init already succeeded on this instance). One observation per run
attempt.

**Questions answered:**
- How long does each plugin's deferred init take in practice?
- Is init time stable or is it growing over time (data growth, schema drift)?
- How does init duration compare across plugins — who has the most expensive lazy work?
- Does a plugin that fails (outcome=failed) consistently take longer before failing?

---

### `kibana.plugin.deferred_init.time_to_available_ms`

| | |
|---|---|
| **Type** | Histogram |
| **Unit** | milliseconds |
| **Emitted by** | `DeferredInitEngine` — on first transition to `available` |

Records the elapsed time from **process start** (i.e. when the `DeferredInitEngine` is
constructed during `setup`) until a plugin first reaches the `available` state. Emitted
exactly once per plugin per process lifetime.

This is the headline metric for understanding how "lazy" a plugin actually is in
production: a plugin initialized 2 seconds after boot is effectively eager; a plugin
initialized 3 days after boot is genuinely deferring a large chunk of startup work.

**Additional attribute:** `outcome` is always `available` — this instrument is only
emitted on the successful transition.

**Questions answered:**
- How long after deployment does each plugin actually get used for the first time?
- Which plugins are candidates for lazy init (rarely used, long time-to-available)?
- For plugins already using lazy init: how much startup time is actually saved vs when they'd have been needed anyway?
- Are any lazy-init plugins consistently initialized within seconds of boot (negating the lazy-init benefit)?
- What is the p95 time between deployment and first use for each plugin across the fleet?

---

### `kibana.plugin.deferred_init.attempts_total`

| | |
|---|---|
| **Type** | Counter |
| **Unit** | count |
| **Emitted by** | `DeferredInitEngine` — incremented on every run attempt |

Counts the total number of `lazyInitialize()` run attempts per plugin per outcome. Resets
to zero at process restart.

**Questions answered:**
- Is a plugin stuck in a retry loop (rising `outcome=failed` count)?
- What fraction of all init attempts succeed on the first try vs require retries?
- Are consecutive failures accumulating toward the background-retry cap?

---

## Trigger attribution

Every metric and span includes `trigger.type` and `trigger.detail`. These are set on the
first kick and carried through the full lifecycle of that run. The three trigger paths are:

| `trigger.type` | When | `trigger.detail` |
|---|---|---|
| `http_route` | A gated HTTP route handler received a request while the plugin was `idle` | The route path, e.g. `/api/security/role` |
| `contract` | Another plugin called `core.plugins.loadPluginContract()` for this plugin | The caller plugin's id |
| `explicit` | `DeferredInitEngine.trigger()` was called directly (e.g. background job, test) | `—` |

**Questions answered:**
- Which route first woke up each plugin in production?
- Are there plugins that are only ever triggered by a specific integration or background job?
- Is a plugin's init being triggered by unexpected callers (cross-plugin contract races)?
- Which routes see the most `503 Retry-After` responses because they triggered init?

---

## Before-and-after comparison

With these signals in place, the operational story for migrating a plugin to lazy init looks
like this:

| Question | Before lazy init | After lazy init | Signal |
|---|---|---|---|
| How long does boot take? | Includes plugin's ES work | Reduced by plugin's `lazyInitialize` duration | `kibana.plugin.lifecycle.duration_ms` (start, p95) |
| When is the plugin first used? | Always at boot | Measured in production | `kibana.plugin.deferred_init.time_to_available_ms` |
| What triggered first use? | N/A (always boot) | Route / contract / explicit | `trigger.type` + `trigger.detail` on `deferred_init` span |
| How long does the deferred work take? | Baked into `start()` span | Separate, standalone measurement | `kibana.plugin.deferred_init.duration_ms` |
| How often does init fail? | Plugin prevented boot | Visible per-plugin, retryable | `kibana.plugin.deferred_init.attempts_total` (outcome=failed) |

---

## Dashboarding suggestions

The signals above are designed to answer questions at multiple layers:

**Fleet-wide, for platform owners:**
- Total boot time saved across all lazy-init plugins: sum of `lifecycle.duration_ms{lifecycle=start}` for `enableLazyInitialize` plugins, compared against the same metric on branches where those plugins were eager
- Distribution of `time_to_available_ms` across all lazy-init plugins: reveals which are truly lazy vs effectively eager

**Per-plugin, for plugin owners:**
- `deferred_init.duration_ms` histogram for their plugin: is init fast and stable?
- `deferred_init.attempts_total{outcome=failed}` rate: are failures happening and resolving?
- `deferred_init` span in APM: trace the exact init run end-to-end, see which request triggered it

**Deployment health:**
- `attempts_total{outcome=failed}` per instance: persistent failures after the background-retry cap mean gated traffic is the only remaining recovery path
- `time_to_available_ms` outliers: a plugin that takes unexpectedly long to reach `available` may have a slow `lazyInitialize`/`start` or be hitting a transient ES connectivity issue
