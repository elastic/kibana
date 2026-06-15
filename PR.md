# Add experimental `scripts.javaScript` workflow step

## Summary

### Motivation

Workflows need a way to run small, user-authored JavaScript snippets for lightweight data transformation and custom logic without building a dedicated connector for every case. This PR introduces the internal `scripts.javaScript` step (`Run JavaScript`), executed in a sandboxed V8 isolate via `isolated-vm`.

The step is marked `tech_preview` and gated behind `workflowsExtensions.experimentalSteps` (boolean or per-step object) so it can ship incrementally while workflows-eng validates behavior in real environments. Script source lives in `with.script` and supports Liquid templating so prior step outputs and workflow consts can be embedded at render time.

### Security concerns solved

- **Process isolation** — User code runs in a dedicated `isolated-vm` isolate, not in the Kibana Node.js main context.
- **No host / Node globals** — Scripts do not receive `require`, `process`, `fetch`, workflow `context`/`input`, or internal bridge references (`__logBridge__`).
- **Wrapper-injection resistance** — User scripts are executed via `AsyncFunction` inside a closure, preventing concatenation attacks that try to break out of the runner wrapper.
- **Input validation** — Empty scripts are rejected; rendered script size is capped at 1 MB before execution.
- **Opt-in registration** — The step is not registered unless `workflowsExtensions.experimentalSteps` is enabled, limiting exposure during rollout.

### Performance concerns solved

- **Execution timeout** — Scripts are terminated after 1 second (`SCRIPT_EXECUTION_TIMEOUT_MS`).
- **Memory limit** — Each isolate is capped at 8 MB; OOM failures are normalized to a user-friendly `Script failed due to out of memory` message.
- **Console log cap** — At most 100 `console.*` calls are forwarded to the step logger; additional logs are silently dropped to prevent log flooding.
- **Cancellation** — Workflow step abort disposes the isolate promptly via `abortSignal` racing.
- **Catastrophic isolate errors** — `onCatastrophicError` disposes the isolate and surfaces a controlled failure instead of leaving a corrupted isolate running.

### Tests implemented

- **Unit tests** — `execute_script_in_isolate` (execution, console routing, log cap, timeout, abort, OOM, wrapper injection), `javascript_step` handler (validation, size limit, timeout, cancellation, handler hash), `catastrophic.test.ts`, config schema/resolver (`config.test.ts`), step registration (`server/steps/index.test.ts`), public plugin wiring (`public/plugin.test.ts`).
- **Scout API harness** — `javascript_step_harness.spec.ts` runs an 11-step workflow covering happy-path execution (Liquid, async/await, complex return values), security cases (no globals, wrapper injection, empty script), and performance limits (infinite loop timeout, object/ArrayBuffer memory bombs, console cap + CPU loop).
- **Scout server config** — All `workflows_ui` Scout configs enable `workflowsExtensions.experimentalSteps=true` and set `NODE_OPTIONS=--no-node-snapshot` so `isolated-vm` runs reliably in CI.

### Dependency: `isolated-vm` (6.1.2)

**Purpose**

`isolated-vm` runs user-authored workflow scripts inside a separate V8 isolate with its own heap. It powers the `scripts.javaScript` step handler (`execute_script_in_isolate/`), providing script execution, a 1s timeout, an 8 MB memory limit, controlled `console.*` bridging to the step logger, and clean disposal on workflow cancellation.

**Justification**

Workflow steps must execute untrusted JavaScript without access to Kibana's Node.js process, native bindings, or service objects. `isolated-vm` is the most practical way to get **per-isolate CPU/memory limits** and **hard isolation** in Node.js today. The step is intentionally self-contained (script in, JSON-serializable result out), so we do not need to pass Elasticsearch clients or other host services into the sandbox — a good fit for what `isolated-vm` supports.

**Alternatives explored**

| Option | Why not chosen |
|--------|----------------|
| **Node.js `vm` (`runInNewContext`, etc.)** | Not a security boundary; shares the main V8 heap and process globals. Kibana security guidance explicitly treats `vm` as unsafe for untrusted code. No reliable per-script memory or CPU limits. |
| **`worker_threads` + `resourceLimits`** | Stronger process-level isolation, but every Kibana service would need proxying over `MessagePort`. High complexity and baseline memory cost (~5–10 MB per worker) for a step that only needs to transform data locally. Documented in `rfc_step_memory_limits.md` as a possible future hardening path, not a simple first implementation. |
| **Child process (`child_process`)** | Spawning a separate Node process per script adds latency, lifecycle/ops overhead, and still requires a sandbox inside the child. The `isolated-vm` maintainer and adopters (e.g. Backstage scaffolder) recommend `--no-node-snapshot` over per-script processes for most cases. |
| **Implement isolation directly** | Would still require V8 isolate APIs via native addons — effectively reimplementing `isolated-vm`. |

**Existing dependencies**

Kibana already uses `worker_threads` (e.g. screenshotting, synthtrace) and `vm` in **trusted, internal** test/tooling code — not for executing user-supplied workflow scripts. There is **no existing Kibana dependency** that provides sandboxed, memory-bounded execution of arbitrary user JavaScript for workflows. `isolated-vm` is preferred because it is a focused, widely used library for exactly this pattern (untrusted JS snippets with copy-in/copy-out semantics), keeps the change scoped to the script step, and aligns with the workflows engine team's prior analysis in `rfc_step_memory_limits.md`.
