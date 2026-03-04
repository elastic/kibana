# SigEvents Synthetic Log Generator

Generates deterministic logs from a **service graph declaration** for LLM feature extraction evaluation. The declared topology is the ground truth — expected features are derivable from the same config, no hand-authored expectations needed.

Used in two contexts:
- **Synthtrace scenarios** (`src/scenarios/sigevents/`) — CLI ingestion into Elasticsearch for manual testing and demos.
- **Eval fixtures** — in-process document generation for LLM eval specs with no Elasticsearch dependency.

---

## How it works

### Service graph

The input is a `ServiceGraph`: a list of `ServiceNode`s (name, runtime, infra dependencies) and `ServiceEdge`s (source, target, protocol). `sigEvents.DEFAULT_SERVICE_GRAPH` is the built-in claims-pipeline topology.

### Three log channels

Each channel is independent and optional:

| Channel | What it emits |
|---|---|
| Service (DFS trace) | Per-request traces through the service graph (outbound calls, errors, success) |
| Infra | Infrastructure component logs (DB queries, cache ops, host/k8s system events) |
| Noise | Background service chatter (GC, connection pool, health checks) |

### Failures

Declare what is broken via the `failures` key on `LogsGeneratorConfig`. It accepts a static `FailureMap` or a `(timestamp) => FailureMap | undefined` function for time-gated incidents.

`FailureMap` has two sections:
- **`infra`** — keyed by infra dep name; cascades failures upstream through the call graph.
- **`services`** — keyed by service name; injects errors at the service level.

### Volume shaping

Control how many docs each channel emits per tick via the `volume` key (`ChannelVolume`). Each service can have a `ChannelEntry` with `rate`, `every` (emit every N-th tick), and `spikes` (burst/silence windows with a `scale`, optional `start`/`end` timestamps, and optional service scope).

Noise volume is configured separately via `noise.volume` (`NoiseVolumeConfig`) and supports the same spike pattern plus a `jitter` factor.

### Determinism

All randomness flows through `mulberry32(seed)`. Same seed + config always produces the identical document sequence.

---

## Customization

Log generation is fully data-driven — no generator code changes are needed for most customizations:

- **Message content** — add strings to the pools in `log_catalog/`
- **Volume and shape** — tune `volume` (`ChannelEntry`) per service on `LogsGeneratorConfig`
- **Failure scenarios** — add entries to a `MockAppDefinition.scenarios` record
- **New mock apps** — create a new `MockAppDefinition` and register it in the scenario entry point
- **New infra technologies** — add to `constants.ts`, `log_catalog/`, and the service graph

---

## How to maintain and evolve

### Adding log message templates

Templates live in `log_catalog/`. Each file owns one domain:

| File | Domain |
|---|---|
| `log_catalog/request.ts` | Per-request success and error messages, outbound call pairs, stack traces |
| `log_catalog/outbound.ts` | Outbound call log pairs |
| `log_catalog/database.ts`, `cache.ts`, `host.ts`, `kubernetes.ts`, `message_queue.ts` | Per-technology infra messages (one file per dependency type) |
| `log_catalog/noise.ts` | Background noise messages keyed by health state and runtime |

Templates are plain string arrays with `{placeholder}` tokens. Add entries to any pool — the generator picks from them deterministically.

### Adding a failure scenario

Add an entry to the `scenarios` record in the relevant `MockAppDefinition` (e.g. `mock_apps/claims.ts`). A scenario is a `build({ at })` function that returns `failures`, `volume`, and `noise` keys. `at(offset)` converts a relative time offset (e.g. `'30s'`, `'5m'`, `'1h'`) from the incident start into an absolute timestamp.

### Adding a new mock app

1. Create a file in `src/scenarios/sigevents/mock_apps/` exporting a `MockAppDefinition` (service graph, entry service, scenarios).
2. Register it in the scenario entry point with `createSigEventsScenario({ default: CLAIMS_APP, myApp: MY_APP })`.
3. Select at runtime with `--scenarioOpts="mockApp=myApp"`.

### Adding a new infra dependency type

1. Add the new tech to `INFRA_DEP_MAP` in `constants.ts`.
2. Create `log_catalog/<tech>.ts` with message pools keyed by condition.
3. Add the new category/condition entries to `INFRA_LOG_TYPES`, `INFRA_WARN_CONDITIONS`, and `INFRA_ERROR_CONDITIONS` in `constants.ts`.
4. Add the tech to the relevant `ServiceNode.infraDeps` arrays in the service graph.
