# Retained native CPU profiler — POC only

This spike replaces only the triggered CPU capture backend. The existing heartbeat,
block detector, managed worker, admission limits, profile summary, and diagnostics
writing remain in place. The original Inspector backend remains available for comparison.

## Build and opt in

Use Kibana's Node 24.21.0 and the **headers/config.gypi from the actual runtime**:

```sh
node src/core/packages/metrics/server-internal/src/event_loop_watchdog/native/build.ts \
  /absolute/path/to/include/node /absolute/path/to/output
KBN_EVENT_LOOP_NATIVE_ADDON=/absolute/path/to/output/profiler.node \
  node scripts/kibana --dev
```

The code map is prepared during core setup, before plugin setup/imports and before
traffic. The POC selects a random per-process `off` / `metadata` / `sample` control
when an addon is available. Override with `KBN_EVENT_LOOP_NATIVE_MODE` locally.
`off` constructs no profiler; `metadata` retains eager logging but never samples;
`sample` enables the existing watchdog (feature flag defaults true, can disable it).
The flag cannot activate capture in control processes. Disabling capture retains
metadata; shutdown disposes it.

One compiler invocation, no node-gyp/prebuild dependency or install hooks. Build
default and pointer-compressed binaries separately when comparing those runtimes.
The loader validates the adjacent build manifest before loading. Do not point a
pointer-compressed runtime at a same-version standard binary: its V8 ABI differs.
Serverless Docker images compile both default and pointer-compressed bindings in
the builder stage, separately for amd64 and arm64. Headers come from the exact
Node archives already downloaded by Kibana's build. Each bundled Node runs the
compiler script and an initialize/dispose smoke test. Binaries and manifests live
under `node/<variant>/lib/event_loop_watchdog`, automatically resolved from the
executing runtime. The compiler/headers are not copied into the final image.
This intentionally affects only Serverless Docker builds in this POC.

Native capture starts after 400ms without a heartbeat; the original Inspector mode
retains its 2000ms threshold. The comparative benchmark gives both modes 400ms.

## Why an addon can differ from Node APIs

- Inspector `Profiler.start` creates a lazy-logging profiler. Stopping the final
  profile clears metadata/disposes that profiler. `Profiler.enable` alone does not
  pre-enumerate code.
- Node `v8.startCpuProfile()` has no eager-logging option. Its retained profiler
  still uses lazy logging: fully stopped captures need code logging/enumeration
  again. Overlapping handles avoid that transition by **continuing to sample**.
- This addon selects public V8 `kEagerLogging` and keeps that profiler alive.
  Construction enumerates existing code; listeners maintain the map as code
  compiles, moves and disappears. With no capture active, the sampling processor
  is stopped, but metadata logging remains enabled.
- The watchdog observer queues a native `Isolate::RequestInterrupt`. Start/stop
  execute on the target isolate without calling JavaScript. A normal main-thread
  message handler cannot run while JavaScript is blocking.
- Sampling itself is still V8's sampler. This is lifecycle control, not a different
  CPU profiler or a way to recover stacks from before activation.

## Lifecycle and bounds

Main thread owns initialization, cancellation, and disposal. Observer requests
are asynchronous and polled every 5ms only while outstanding. Main-thread
`onExit` invalidates queued requests and stops any capture before worker restart
or termination completes. Metadata survives normal worker restart.

Each profile is bounded to 2000 samples and 16 MiB serialized JSON; the existing
watchdog duration/cooldown/file budgets also apply. Export serialization is still
synchronous on the target isolate; parsing, summary and file writing remain in
the observer. Stop/export pauses need measuring separately from activation.

V8 interrupts need a suitable safepoint. Native calls, GC, scheduling pressure and
CPU quotas can delay both activation and stop. This POC primarily targets
CPU-bound JavaScript, not guaranteed interruption of arbitrary native code.

Eager metadata is **not free**. V8 marks the isolate as profiling while logging
is enabled; this can affect code compilation/optimization as well as memory.
Low sampling overhead does not establish low metadata-maintenance overhead.

`RequestInterrupt` does not expose cancellation/destruction callbacks. Pending
payloads hold shared ownership until execution; if the target isolate is destroyed
without servicing them, small payloads can remain allocated until process exit.
Explicit disposal stops/releases the profiler, so this is a shutdown-lifetime
limitation, not continuous sampling. General-purpose addon lifecycle support is
out of scope; quantify/harden this before production adoption.

## Validation and benchmark

The real-worker suite builds the exact-runtime addon during setup using the same
local compiler command; it does not rely on a pre-existing ignored binary. Node
headers and a C++20 compiler are required. Build manually for the application opt-in:

```sh
node scripts/jest src/core/packages/metrics/server-internal/src/event_loop_watchdog --runInBand
node scripts/jest_integration --config src/core/server/integration_tests/event_loop_watchdog/jest.integration.config.js
node scripts/type_check --project src/core/packages/metrics/server-internal/tsconfig.json
BENCH_PROFILE_DIR=/absolute/new/profiles \
  node src/core/packages/metrics/server-internal/src/event_loop_watchdog/native/run_matrix.ts \
  /absolute/new/matrix.jsonl
```

Matrix: five fresh processes per mode, rotating/reversing order; 30k retained
compiled synthetic functions. Modes: no capture, metadata only, Inspector,
native eager, native lazy (bridge control), native eager initialized before fixture
compilation. Same watchdog/observer and 400ms threshold. Each capture mode performs
five fully stopped captures. Record preparation/compilation, CPU, idle ELU, fixed
work, memory, repeated start acknowledgements, and raw profiles.

Profile clocks differ from process.hrtime. The first-periodic upper-bound metric
adds heartbeat-to-request, request-to-ack, and profile-relative sample latency.
It is a conservative bound, **not an exact cross-clock timestamp**. Initial V8
synchronous stack samples at delta zero are recorded separately from periodic
samples. Fine-grained names can change with JIT inlining; source-file attribution
and exact named-blocker counts are both recorded.

All three image modes log structured preparation/startup/30s windows: wall time,
process CPU (one-core percent), main-thread ELU, RSS, heap, runtime ABI and mode.
Capture logs include start acknowledgement, stop/export acknowledgement and a
conservative first-periodic-sample bound (index zero excluded). CPU includes worker
and V8 threads; do not interpret it as main-thread CPU. Correlate by pod/role and
startup phase; compare idle windows separately from cpuSpin windows. Metadata
mode includes future lazy compilation, so it is not merely a one-time warmup.

Synthetic results are not Serverless/Kibana-scale evidence. Do not extrapolate
30k functions to 30k scripts or compare synthetic numbers directly with the
previous ~1.5s Serverless measurement. No CPU-quota, request-load or production safety claim. Shipping the POC image does
not establish overhead across every lazy-load/request workload.
