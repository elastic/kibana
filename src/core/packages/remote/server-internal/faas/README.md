# Local workflows / Lambda RIE draft

Uncommitted feasibility tooling. Focused local correctness checks exercised the
original worker control and repeated fresh-FaaS **256 MiB diagnostics**. The
primary **128 MiB** runner OOMed during initialization, before RPC. This is not a
successful 128 MiB result or a performance benchmark. RIE is an invocation emulator,
not the Lambda scheduler or cold-start
lifecycle. These local timings must not be described as AWS/serverless performance.

## Placement and lifetime

`core.remote.backend: lambda_rie` selects a Core-owned local Docker orchestrator.
The existing workflow registration, declaration selection, DI construction,
`WorkflowExecutor`, `assemble_engine_loop`, and real `workflowExecutionLoop` are
used unchanged in placement. Elasticsearch parsing, Cases business operations,
authenticated scopes, storage, logs, and Task Manager stay in Kibana.

One `WorkflowExecutor.run` call = one RIE HTTP invocation = one active segment.
The function connects back to an invocation-only TCP listener using a random
single-use token; one bidirectional Cap'n Web string session carries all nested
callbacks. It is closed at segment end/failure. No callbacks spawn functions.
The fresh container is removed after park; resume gets a different container.
The separately labelled warm control reuses a container but constructs a new DI
graph, socket, and capabilities each invocation. Concurrent warm invocations are
explicitly refused (no new queue/retry policy).

Primary limits are Docker `--cpus=1 --memory=128m --memory-swap=128m`: CPU quota,
whole-container hard memory, no swap. RIE, runtime, native allocations and V8 all
count. 256/512 MiB are **diagnostics**, never a passing 128 MiB result. No V8 heap
cap substitutes for container memory enforcement. Worker measurements have the
existing worker heap limit, not the FaaS container limits.

Only the established anchor is measured:
`security.buildAlertEntityGraph` -> `wait` **6s** -> `cases.createCase`, title
`Graph nodes {{ steps.graph.output.stats.nodes }}`. No new fixtures/workflows are
invented. The harness freezes the existing saved workflow and its concrete alert
index before comparisons and refuses drift. Use the original keyword-mapped
`kibana.alert.uuid` fixture index; the historical run used `alerts-remote-heap`.

## Build (pinned host Node)

From the leased checkout, after the documented bootstrap:

```sh
eval "$(fnm env --shell bash)"
fnm use "$(cat .nvmrc)"
node scripts/kbn bootstrap
node scripts/workflows_faas.js                         # target/workflows_faas
cat target/workflows_faas/manifest.json
# Prefer a digest-pinned runtime image for repeated comparisons.
docker build --progress=plain -t kbn-workflows-faas:local target/workflows_faas
```

The stock `public.ecr.aws/lambda/nodejs:24` image contains AWS's off-the-shelf RIE
and Node runtime. Override with `--build-arg RUNTIME_IMAGE=<digest-pinned-image>`.
The Dockerfile copies **only handler.cjs + manifest.json**, with no mounts,
repository, full dist, or development node_modules. Its build-time `RUN node -e
"require('./handler.cjs')"` is a standalone runtime-load prerequisite, not an
anchor invocation. Do not remove that layer to conceal missing dependencies.

The build discovers existing remote declarations (without producer lifecycles),
uses the same extracted `buildRemoteSpec` and workflow registration as Kibana,
and emits a static module map replacing absolute `require.resolve` identities.
SWC preserves legacy decorators/DI metadata; esbuild includes the actual engine's
transitive closure, including the existing full node factory. Peggy grammar is
generated from its existing config. There is no replacement step walker.

`inventory.json` lists parsed versus emitted inputs, output contribution bytes,
external imports, artifact size, build Node and elapsed time. Public barrels may
be parsed but tree-shaken away. The build rejects **emitted** producer plugin or
selected coordinator implementations. Engine dependencies currently include
tracing SDK libraries through existing imports; this does not install/configure
a tracing exporter or establish trace continuity. Review inventory/runtime load,
not just filenames. Optional dependency requires in upstream libraries remain
visible in the inventory; runtime loading and the real anchor are still required
before claiming dependency closure works end to end.

The manifest hashes the emitted handler and relocatable graph into an artifact
identity (not merely Git HEAD). Kibana verifies the configured expected hash,
manifest hash, handler bytes, and registered graph before admitting invocations;
the function verifies the same hash and local bytes before running the engine.
Rebuild the image and regenerate config after changing code/dependencies. Dirty
code changes must not reuse an old expected artifact identity. This draft's
portable graph identity targets the source checkout layout; parity with renamed
modules in a full distributable is not demonstrated.

```sh
node scripts/workflows_faas_measure.js build-times --out target/faas-build-evidence
```

This records clean-output and existing-output/no-change rebuild wall times and
raw inventories. They are separate Node processes with OS/dependency caches;
not a pristine machine, production CI, or an in-memory incremental compiler.
Retain each run; compare hashes before/after real source edits to inspect rebuild
behaviour. No build cache or deployment system is added.

## Configure one measurement condition

Start ES/Kibana normally with the original anchor installed/enabled. Merge the
emitted YAML into the stack configuration (do not replace auth/ES configuration).
Restart Kibana once for each backend/RTT condition; never change workflow or data.

```sh
node scripts/workflows_faas_measure.js config \
  --backend fresh-faas --memory 128 --rtt 0 \
  --segments target/fresh-128-rtt0.jsonl > target/faas_condition.yml
# node scripts/kibana --dev --config <your-config> --config target/faas_condition.yml
```

Backend choices: `existing-worker`, `fresh-faas`, `warm-faas-control`.
RTT choices: `0`, `1`, `5`, `10` ms added. Memory choices: `128`, `256`, `512` MiB.
Image defaults to `kbn-workflows-faas:local`; pass `--image <immutable-image-id>`
to pin the executor image. Exact image/config, inspect output and runtime version
are retained with invocation records. Callback address defaults to
`host.docker.internal` (host-gateway alias supplied only on native Linux;
Docker Desktop/Colima builtin host DNS is preserved on macOS).

Worker measurements opt into a real encoded JSON-string MessagePort transport;
normal worker/in-process execution stays on the pre-existing transport. Set both
environment variables when starting the **worker** condition:

```sh
export KBN_REMOTE_MEASUREMENT_PATH="$PWD/target/worker-rtt0.jsonl"
export KBN_REMOTE_RTT_MS=0
# Start Kibana with generated --backend existing-worker condition config.
```

Unset these variables for FaaS conditions. For RTT 1/5/10 set the worker variable
as well as the generated condition. Latency is inserted on the **coordinator's
outbound transport**, once per round trip, not in business logic; applying 0.5ms
timers at both ends would round to ~2ms. Raw ping RTT verifies effective latency:
OS timer granularity, scheduling, Docker networking and load also contribute.
This is not a serverless VPC model. Inspect RTT values; do not assume requested
and effective added delay match exactly. No forced GC: unset
`KBN_REMOTE_HEAP_LOG` and `KBN_REMOTE_SEAM_LOG` and do not pass `--expose-gc` for
measurement runs (the historical heap/seam probes would contaminate timings).

## Freeze and repeat the original anchor (future real-stack verification)

Credentials are environment-only and not written into evidence:

```sh
export KIBANA_URL=http://localhost:5601 ES_URL=http://localhost:9200
export KIBANA_AUTHORIZATION='Basic <base64(user:password)>'
export ES_AUTHORIZATION='Basic <base64(user:password)>'
node scripts/workflows_faas_measure.js freeze \
  --workflow remote-engine-loop --out target/faas-evidence
node scripts/workflows_faas_measure.js run --workflow remote-engine-loop \
  --condition fresh-128-rtt0 --samples 1 --out target/faas-evidence \
  --verify-backend fresh-faas --memory 128 --segments target/fresh-128-rtt0.jsonl
node scripts/workflows_faas_measure.js summarize \
  --segments target/fresh-128-rtt0.jsonl --out target/faas-evidence/fresh-128-rtt0
```

Repeat `config` + stack restart + `run` + `summarize` for the three backends and
four RTT values. Keep the same frozen directory across conditions; choose distinct
segment log paths. Run 128 MiB first; retain OOMs/failures. If needed, separately
label 256/512 diagnostic conditions. Do not quietly raise memory. Each sample is
an independent new normal workflow run, **not** a retry of a failed execution.
The harness polls existing APIs; it does not alter Task Manager scheduling.

Freeze refuses overwrite, partial snapshots (>1000 fixture docs), wildcard alert
indices and changed workflow/data. It does not seed or overwrite an existing
index, mutate alert timestamps, or invent historical fixtures. If the original
local stack/data are absent, restore that anchor/data before measurement. Preserve
mapping, document IDs, source and definition from `frozen.json` for later reuse.

With `--verify-backend`, `run` waits for both returned segment records before
reporting success (not merely a persisted terminal status). It asserts callback
placement/saved-output reload, completed graph/pause/Case records, a pause of at
least six seconds, a meaningful graph, the exact persisted Case title, and, for
fresh FaaS, distinct container identities, first removal before resume, no mounts,
the requested `--memory` cap, one CPU quota and no swap. It exits nonzero on failed
samples while retaining raw failures. Reproduce the successful diagnostic with
`config --memory 256`, then `run --memory 256`; do not relabel it primary128.

Raw evidence: attempts (including failures), persisted execution/steps, polling
history, real Case lookup, host/Docker info, build inventories and per-invocation
records. Inspect graph output and Case title, not just `completed`. Verify two
segments for each execution, first `waiting`, then `completed`, stored graph
output reloaded on resume and two different fresh container IDs. Existing Task
Manager may retry; preserve those extra attempts rather than counting them as two
successful segments. Cleanup of real workflow/Case/fixture resources is manual,
using recorded IDs; do not delete shared or historical resources blindly.

## Timing, traffic, resources and limitations

- Correlate workflow run ID + invocation UUID + artifact hash. Segment ordinal is
  inferred from ordered invocation records/status (`waiting` then `completed`),
  not a new persisted workflow field. Failed invocations stay in the JSONL.
- Host launch/readiness is separate from RIE HTTP time, handler setup and engine
  execution. Function metrics record invocation-to-handler/execution-start wall
  time (assumes host/container clocks agree). Code initialization is included in
  the invocation-to-handler residual with HTTP/RIE overhead, **not isolated as
  pure Node initialization**. Host orchestration includes Docker CLI and cleanup.
- Segment execution excludes the durable six-second pause and TM scheduling gap.
  End-to-end attempts include both. Retain poll history and segment start/end
  timestamps to distinguish the intentional pause from excess resume delay;
  500ms API polling cannot establish an exact scheduler boundary. Summary timelines
  include park-to-next-invocation gap and gap-minus-6s estimates, not exact TM
  dispatch latency (scheduling happens before park cleanup ends).
- Traffic totals are counted **only at the coordinator endpoint**: actual encoded
  Cap'n Web UTF-8 strings, TCP newline framing, and separately identified auth
  bytes. TCP/IP/Ethernet framing/ACKs are **not measured**. Do not call these total
  network-wire bytes. Worker string bytes exclude native MessagePort framing and
  cannot be equated with its default structured-clone encoding.
- RIE HTTP request/response **body** bytes are separate control traffic; HTTP
  headers/framing are not measured. Setup lookup/ping counts are separate from
  callback counts. Function-side setup snapshots are diagnostic only; never add
  them to coordinator totals. Capability setup may pipeline into first callbacks.
- One callback record per initiated RPC (name, duration, failure and start/end timestamps),
  including nested ES capability calls. Missing end/duration means in flight at disconnect. The legacy seam request and response
  records are payload estimates, not two RPCs or wire traffic. Identify sequential
  critical-path calls from timestamps; do not blindly sum overlapping durations.
- `docker stats` samples and final `inspect` (including OOMKilled, actual cgroup
  configuration and image ID), stdout/stderr and function CPU/memory are retained.
  Stats are sampled, not guaranteed peak memory; startup OOM can precede a sample.
  Stats polling and logging impose overhead. Docker VM/host orchestration are
  outside the 128 MiB limit and recorded separately, not attributed to the engine.
  Worker RSS is whole-Kibana-process RSS, not worker-only memory.
- Fresh containers are explicitly removed before the orchestrator returns to TM.
  Warm control permits only one active invocation. A failed warm invocation is
  discarded, never replayed. No automatic retries/recovery are added.
- Disconnect after Case creation can lose its acknowledgement: a Case may exist
  even when invocation fails. Existing TM retries may duplicate side effects.
  Failed invocation does **not** prove absence of side effects; no exactly-once,
  hostile-code isolation or production authentication/HA claims are made.
- Observability is **not distributed tracing**. Existing `WorkflowLog` forwards
  business events with workflow/step IDs, but `assemble_engine_loop` supplies a
  noop general logger. Existing engine span calls do not explicitly carry context
  across RemoteSession/run/Cap'n Web. TM persists `task.traceparent` and starts
  child transactions, but remote trace continuity is not implemented/proved.
  No new SDK/exporter is configured; measurement correlation IDs are not trace
  propagation. General function diagnostics may therefore be missing from the
  coordinator's log/trace view.

Focused manifest/registration tests and the real-stack correctness check were run
on 2026-11-02; detailed IDs, image/runtime identity, failures and cleanup are in the
claim E2E handback. CI, AgentReview, lint/typecheck gates and the benchmark matrix
remain unrun. Artifact build output alone is not runtime proof; the 128 MiB
envelope remains infeasible in the observed condition.
