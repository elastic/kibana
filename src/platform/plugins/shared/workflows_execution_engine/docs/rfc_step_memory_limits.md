# RFC: Step Memory Limits

**Status:** Draft
**Authors:** Workflows Engine Team
**Date:** 2026-02-15

---

## Problem Statement

Workflow steps execute inside the Kibana server's Node.js process. When a step fetches data from an external service (Elasticsearch, an HTTP endpoint, a Kibana API, or a connector), the entire response payload is loaded into the V8 heap. There is currently **no limit** on how large that payload can be.

This creates two distinct problems:

### Problem 1: Out-of-Memory (OOM) Crash

A single step can crash the entire Kibana process by loading a response that exceeds available heap memory.

**Example scenarios:**

- An HTTP step downloads a 1 GB file from an external API.
- An Elasticsearch step runs a query that returns millions of documents.
- A Kibana action step exports a large set of saved objects.

When this happens, V8 exhausts its heap, runs last-resort garbage collection, fails to free enough memory, and terminates the process. **Every user on the Kibana instance is affected** -- not just the workflow that caused it.

The critical characteristic of this problem is that the damage happens **during** the I/O operation, **before** any application code has a chance to inspect the response. By the time `_run()` returns its result, the data is already in memory and the OOM may have already occurred.

### Problem 2: Unbounded Context Growth

Even when individual responses are not large enough to cause an OOM, step outputs accumulate in the workflow execution context. Each step's output is stored in `WorkflowExecutionState` and made available to subsequent steps via `{{ steps.previous_step.output }}`. Over a workflow with many steps, this accumulated context can grow without bound.

**Example scenario:**

- A workflow has 20 steps, each returning a 5 MB response.
- The workflow context grows to 100 MB+ as outputs accumulate.
- The execution state document written to Elasticsearch becomes very large.
- Subsequent template rendering operations slow down as the context grows.

This problem is **also severe** because the full accumulated context is held in memory during execution. The workflow engine uses LiquidJS for template rendering (e.g., `{{ steps.step_a.output.field }}`), which requires the entire context object to be available in memory. Additionally, on retries or foreach iterations, the context is re-loaded and re-evaluated. A workflow with 20 steps each producing 5 MB of output means ~100 MB of live context that LiquidJS must traverse -- this directly contributes to memory pressure and can itself trigger OOM.

### Why These Are Different Problems

| | OOM (Problem 1) | Context Growth (Problem 2) |
|---|---|---|
| **When it happens** | During I/O, before `_run()` returns | After `_run()` returns, during output storage |
| **Impact** | Process crash, affects all users | OOM during template rendering/retries, performance degradation, large ES documents |
| **Prevention requires** | Intercepting data **during** transfer | Checking data **after** transfer |
| **Solvable generically?** | No -- depends on I/O layer | Yes -- single check in base class |

---

## Why There Is No Universal Solution in Node.js

In Python, you might approach this problem with a decorator:

```python
import resource

def limit_memory(max_bytes):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            resource.setrlimit(resource.RLIMIT_AS, (max_bytes, max_bytes))
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@limit_memory(50 * 1024 * 1024)  # 50 MB
def run_step(input):
    return requests.get(input['url']).json()
```

Python's `resource` module can set per-process memory limits enforced by the OS. Combined with `sys.getsizeof()` for cheap object size measurement, Python makes it relatively straightforward to constrain individual operations.

**Node.js has no equivalent.** Here's why:

### V8's Memory Model Is Process-Level

V8 manages memory at the heap level, not per function or per scope. The only built-in limit is `--max-old-space-size`, which applies to the **entire process**. There is no API to say "this function call may use at most 50 MB of heap."

### No Cheap Object Size Measurement

JavaScript objects don't expose their memory footprint. The closest equivalent is `Buffer.byteLength(JSON.stringify(obj))`, which:
- Requires **serializing the entire object** -- itself an expensive, memory-consuming operation.
- Is only accurate for the JSON representation, not the actual V8 heap cost (which includes hidden classes, property maps, prototype chains, etc.).
- Cannot be called on data that is still being streamed -- it requires the complete object.

### `isolated-vm` Cannot Hold Service References

The [`isolated-vm`](https://github.com/nicolo-ribaudo/isolated-vm) package creates separate V8 heaps with configurable memory limits. However, workflow steps need access to Kibana service objects:

- `ElasticsearchClient` (native bindings, TCP sockets)
- `ActionsClient` (Kibana service with internal state)
- `KibanaRequest` / `fakeRequest` (HTTP objects with auth headers)
- `fetch` / `axios` (network I/O handles)

These objects **cannot be transferred** into an isolate. They contain native bindings, event emitters, and TCP connections that only exist in the main V8 heap. You would need to rewrite every step to use message-passing ("please call ES for me and send back the result"), which defeats the purpose since the result still enters the main heap.

### Worker Threads: Possible but Heavy

Node.js `worker_threads` support `resourceLimits` (e.g., `maxOldGenerationSizeMb`), which provides true per-thread memory isolation. However:

- Each worker costs ~5-10 MB of baseline memory.
- All Kibana services must be proxied via `MessagePort` with full serialization/deserialization.
- The worker can't directly use `actionsClient`, `esClient`, or any Kibana core service.
- The response data still needs to be transferred back to the main thread (via structured clone or `SharedArrayBuffer`), at which point it enters the main heap anyway.

Worker threads could be explored for a future hardened solution, but they don't provide a simple "decorator-style" protection.

### Summary: No Single Enforcement Point Exists

| Approach | Prevents OOM? | Works with Kibana services? | Complexity |
|---|---|---|---|
| Python-style `resource.setrlimit` | Yes | N/A (not available in Node.js) | -- |
| `isolated-vm` | Yes | No -- can't hold service refs | High |
| `worker_threads` with `resourceLimits` | Yes | No -- requires full service proxy | Very high |
| Post-hoc size check (`JSON.stringify`) | No | Yes | Low |
| Per-I/O-layer streaming limits | Yes (where applicable) | Yes | Medium |

The only viable approach is a **two-layer solution**: per-I/O-layer enforcement where we control the transport, combined with a generic output check for everything else.

---

## Solution: Two-Layer Enforcement

### Layer 1: Pre-emptive I/O Enforcement (Prevents OOM)

For step types where we control the network I/O, we can intercept the response **during transfer** and abort if it exceeds the limit. The data never fully enters the heap.

This layer is **per-node-type** because each I/O mechanism has a different interception API.

#### HTTP Step (`HttpStepImpl`)

**Mechanism:** `axios` natively supports `maxContentLength` and `maxBodyLength`. When the response stream exceeds the limit, axios aborts the request and throws an error.

```typescript
const config: AxiosRequestConfig = {
  url,
  method,
  headers,
  signal: this.stepExecutionRuntime.abortController.signal,
  maxContentLength: maxResponseSizeBytes,  // abort if response body exceeds limit
  maxBodyLength: maxResponseSizeBytes,
  ...(body && { data: body }),
};
```

**Error:** `ResponseSizeLimitError` with type `StepSizeLimitExceeded`.

**Coverage:** True pre-emptive. A 1 GB download is aborted after the configured limit (e.g., 10 MB). The remaining data is never read.

#### Kibana Action Step (`KibanaActionStepImpl`)

**Mechanism:** Replace `response.json()` with a streaming body reader that counts bytes as chunks arrive.

```typescript
const reader = response.body?.getReader();
const chunks: Uint8Array[] = [];
let totalBytes = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  totalBytes += value.byteLength;
  if (totalBytes > maxResponseSizeBytes) {
    reader.cancel();
    throw new ResponseSizeLimitError(totalBytes, maxResponseSizeBytes, stepName);
  }
  chunks.push(value);
}
return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
```

**Error:** `ResponseSizeLimitError` with type `StepSizeLimitExceeded`.

**Coverage:** True pre-emptive. The fetch response is aborted mid-stream.

#### Elasticsearch Action Step (`ElasticsearchActionStepImpl`)

**Mechanism:** The `@elastic/transport` client natively supports a `maxResponseSize` option on `transport.request()`. When the response body exceeds the limit during transfer, the client throws a `RequestAbortedError` and aborts the connection mid-stream. The data never fully enters the heap.

```typescript
const result = await esClient.transport.request(requestOptions, {
  maxResponseSize: maxResponseSizeBytes,
});
```

When the limit is exceeded, the transport layer throws:
```
RequestAbortedError: "The content length (N) is bigger than the maximum allowed string (M)"
```

This is true mid-stream enforcement -- the same mechanism used by Kibana's own ES proxy transport and inference connector streaming.

**Error:** `RequestAbortedError` caught and mapped to `ResponseSizeLimitError` with type `StepSizeLimitExceeded`.

**Coverage:** True pre-emptive. A query returning 1 GB of results is aborted after the configured limit (e.g., 15 MB).

#### Connector Step (`ConnectorStepImpl`)

**Current state:** Connectors execute via `actionsClient.execute()`, which is part of the Kibana Actions framework. This API is completely opaque -- it accepts params and returns a result. There is no way to intercept the internal HTTP calls that connectors make.

**Future possibility:** The Actions framework itself could be extended to support response size limits. This would require changes outside the workflows engine scope.

**Coverage for now:** Post-hoc only (Layer 2).

#### Custom Step (`CustomStepImpl`)

**Current state:** Custom steps run arbitrary handler code provided by plugin extensions. The handler receives service references (`getScopedEsClient()`, `getFakeRequest()`) and can make any calls it wants. We cannot intercept the handler's internal operations.

**Coverage for now:** Post-hoc only (Layer 2).

### Layer 2: Generic Output Enforcement (Prevents Context Growth)

This layer lives in `BaseAtomicNodeImplementation.run()` -- the base class that **every** atomic step extends. It checks the size of `result.output` after `_run()` returns but **before** `finishStep()` stores it in the workflow execution state.

```
getInput() --> _run(input) --> [OUTPUT SIZE CHECK] --> finishStep(output)
```

```typescript
// In BaseAtomicNodeImplementation.run(), after _run() returns:
const result = await this._run(input);

if (result.output !== undefined && result.output !== null) {
  const outputSize = Buffer.byteLength(JSON.stringify(result.output), 'utf8');
  if (outputSize > maxResponseSizeBytes) {
    throw new ResponseSizeLimitError(outputSize, maxResponseSizeBytes, this.step.name);
  }
}
```

**Error:** `ResponseSizeLimitError` with type `StepSizeLimitExceeded`.

**What this protects against:**
- Oversized outputs being stored in `WorkflowExecutionState`.
- Accumulated context growing without bound across steps.
- Large execution state documents being written to Elasticsearch.
- Template rendering slowdowns from oversized context.

**What this does NOT protect against:**
- OOM during the I/O operation itself (the data is already in memory when we check it).
- Transient memory spikes from large intermediate computations within `_run()`.

**Why this is still valuable:**
- **Automatic:** Every step type gets it for free, including future step types. No per-step implementation needed.
- **Reviewer-proof:** A new step contributor cannot forget to add size checking -- it's enforced by the infrastructure.
- **Consistent errors:** Every step that exceeds the limit fails with the same error type and message format.

---

## Coverage Matrix

| Step Type | OOM Prevention (Layer 1) | Context Protection (Layer 2) | Demo Workflow | Notes |
|---|---|---|---|---|
| `HttpStepImpl` | Yes -- axios `maxContentLength` aborts mid-stream | Yes -- base class output check | `test_response_size_limit.yaml` | Full coverage |
| `KibanaActionStepImpl` | Yes -- streaming reader aborts mid-stream | Yes -- base class output check | `test_kibana_action_size_limit.yaml` | Full coverage |
| `ElasticsearchActionStepImpl` | Yes -- `transport.request({ maxResponseSize })` aborts mid-stream | Yes -- base class output check | `test_es_size_limit.yaml` | Full coverage |
| `ConnectorStepImpl` | No -- `actionsClient.execute()` is opaque | Yes -- base class output check | `test-connector-size-limit.yaml` | Layer 2 only |
| `CustomStepImpl` | No -- handler code is opaque | Yes -- base class output check | -- | Layer 2 only |
| `DataSetStepImpl` | N/A -- no external I/O | Yes -- base class output check | -- | Very low risk |
| Control flow nodes | N/A | N/A | -- | No data processing |

All demo workflows are in `workflows/examples/`. The ES workflow requires seeding test data first via `bash workflows/examples/seed_large_index.sh`.

---

## Error Types

All enforcement layers throw the same error type for consistency:

```typescript
class ResponseSizeLimitError extends ExecutionError {
  constructor(actualBytes: number, limitBytes: number, stepName: string) {
    super({
      type: 'StepSizeLimitExceeded',
      message: `Step "${stepName}" response exceeded the size limit: ` +
               `${formatBytes(actualBytes)} > ${formatBytes(limitBytes)}. ` +
               `Configure 'max-step-size' at the step or workflow level to adjust.`,
      details: { actualBytes, limitBytes },
    });
  }
}
```

When a step fails with this error:
- The step status is set to `FAILED`.
- The error is logged via the workflow event logger.
- The workflow continues to the next node (respecting `on-failure` handlers if configured).
- No partial output is stored in the execution state.

---

## Configuration

Limits are configured at three levels, resolved in priority order:

### 1. Step-level (highest priority)

Per-step override in workflow YAML:

```yaml
steps:
  - name: big_export
    type: kibana.export_objects
    max-step-size: 100mb
```

### 2. Workflow-level

Default for all steps in a workflow:

```yaml
settings:
  max-step-size: 10mb
```

### 3. Plugin config (lowest priority, cluster-wide default)

In `kibana.yml`:

```yaml
workflowsExecutionEngine.maxResponseSize: 10mb
```

### Resolution

```
step['max-step-size']  ??  workflow.settings['max-step-size']  ??  pluginConfig.maxResponseSize  ??  '10mb'
```

---

## Files Changed

| File | Change |
|---|---|
| `server/step/node_implementation.ts` | Add `enforceOutputSizeLimit()` and `getMaxResponseSize()` to base class; add size check in `run()` |
| `server/step/errors.ts` | New file: `ResponseSizeLimitError` class |
| `server/config.ts` | Add `maxResponseSize` to plugin config schema |
| `kbn-workflows/spec/schema.ts` | Add `max-step-size` to `WorkflowSettingsSchema` and step base schema |
| `server/step/http_step/http_step_impl.ts` | Add `maxContentLength`/`maxBodyLength` to axios config |
| `server/step/elasticsearch_action_step.ts` | Pass `maxResponseSize` option to `transport.request()` |
| `server/step/kibana_action_step.ts` | Replace `response.json()` with streaming body reader |

No changes needed to `connector_step.ts`, `custom_step_impl.ts`, or any control-flow node implementations.

---

## Future Work: Lazy Context Rendering

Today, the entire step context (`steps.*`, `variables.*`, `workflow.*`) is held in memory as a single JavaScript object and passed to LiquidJS for template rendering. This means every previous step's full output is live in the V8 heap for the duration of each subsequent step's execution, even if the template only references a single field from one step.

A future optimization is **lazy context rendering**: instead of eagerly loading all step outputs into memory, the context manager would load step outputs on-demand from Elasticsearch (or a local cache) only when a template expression actually references them. For example, `{{ steps.fetch_users.output.count }}` would only load `fetch_users`'s output at render time, not at context construction time.

This would decouple the number of steps in a workflow from the memory footprint of template rendering and significantly reduce the baseline memory cost of long workflows.

---

## Future Work: Step Output Post-processing (`postprocess`)

Even with size limits, many steps return far more data than subsequent steps actually need. For example, an Elasticsearch search step might return full `_source` documents when only one field is used downstream.

A `postprocess` attribute on steps would let workflow authors control which fields are kept in the step output before it is stored in the execution state. This reduces both memory usage and Elasticsearch document size.

### Whitelist mode (keep only specified fields)

```yaml
steps:
  - name: fetch_users
    type: elasticsearch.search
    with:
      index: users
      body:
        query: { match_all: {} }
    postprocess:
      keep:
        - hits.hits._source.name
        - hits.hits._source.email
        - hits.total.value
```

Only the specified paths are retained in `steps.fetch_users.output`. Everything else is discarded before the output is stored.

### Blacklist mode (remove specified fields)

```yaml
steps:
  - name: fetch_logs
    type: elasticsearch.search
    with:
      index: logs-*
      body:
        size: 100
    postprocess:
      remove:
        - hits.hits._source.message    # large field not needed downstream
        - _shards                       # metadata noise
```

The specified paths are removed; everything else is kept.

### How it fits in the execution flow

Post-processing runs **after** `_run()` returns but **before** the output size check and `finishStep()`:

```
_run(input) --> [POSTPROCESS] --> [OUTPUT SIZE CHECK] --> finishStep(output)
```

This means post-processing can bring an output under the size limit that would otherwise be rejected -- giving workflow authors a tool to work within the constraints rather than just hitting errors.

---

## PoC Scope

The initial proof-of-concept will cover the following:

### OOM Prevention (Layer 1) -- Per-node pre-emptive enforcement

| Step Type | Approach |
|---|---|
| `HttpStepImpl` | `axios` `maxContentLength` / `maxBodyLength` -- aborts mid-stream |
| `KibanaActionStepImpl` | Streaming `fetch` body reader with byte counting -- aborts mid-stream |
| `ElasticsearchActionStepImpl` | `transport.request({ maxResponseSize })` -- native mid-stream abort via `@elastic/transport` |
| `ConnectorStepImpl` (Kibana stack connectors) | Post-hoc size check on `actionsClient.execute()` result (Actions framework is opaque) |

For connector steps, the OOM protection is best-effort (post-hoc). True streaming enforcement for connectors requires changes to the Kibana Actions framework, which is out of scope for the PoC.

### Context Protection (Layer 2) -- Generic base-class enforcement

| Scope | Approach |
|---|---|
| All step types (current and future) | Output size check in `BaseAtomicNodeImplementation.run()`, after `_run()` returns, before `finishStep()` stores the output |

This gives **automatic context protection to every step type**, including any future step types added by contributors. No per-step implementation is required. The base class enforces the limit, and new step types inherit it without any additional code.

### What the PoC will NOT cover

- Lazy context rendering (future optimization).
- `postprocess` attribute (future feature, designed here for context).
- Worker thread isolation for hard OOM protection on connectors/custom steps.
- Streaming enforcement for connectors (`actionsClient` API changes).

### PoC deliverables

| Deliverable | Description |
|---|---|
| `ResponseSizeLimitError` | New error type in `server/step/errors.ts` |
| Base class enforcement | `enforceOutputSizeLimit()` in `BaseAtomicNodeImplementation.run()` |
| `getMaxResponseSize()` | Config resolution helper (step > workflow > plugin config > default) |
| HTTP step enforcement | `maxContentLength` / `maxBodyLength` in axios config |
| Kibana action step enforcement | Streaming body reader replacing `response.json()` |
| ES step enforcement | `maxResponseSize` option on `transport.request()` -- native mid-stream abort |
| Connector step enforcement | Post-hoc size check after `actionsClient.execute()` |
| Plugin config | `maxResponseSize` field in `server/config.ts` |
| Schema changes | `max-step-size` in `WorkflowSettingsSchema` and step base schema |
| Unit tests | Tests for base class enforcement, HTTP pre-emptive, Kibana pre-emptive, config resolution |

---

## Relationship to Epic: Workflow Execution Limits & Guardrails

This RFC maps to the [Workflow Execution Limits & Guardrails epic](https://github.com/elastic/security-team/issues/15842). The epic defines four phases of work across step-level, workflow-level, account-level, and documentation concerns. Below is an honest mapping of what this RFC and its PoC cover vs. what remains.

### Epic Sub-Issues

| Issue | Title | Phase | Covered by this RFC? | Notes |
|---|---|---|---|---|
| [#15838](https://github.com/elastic/security-team/issues/15838) | Step/Action-level memory and response size limits | Phase 1 | **Yes -- primary focus** | This RFC's Layer 1 (pre-emptive) and Layer 2 (post-hoc) directly implement this issue. Mid-stream HTTP/Kibana enforcement, post-hoc ES/connector enforcement, base-class output guard, per-step `max-step-size` config. |
| [#15746](https://github.com/elastic/security-team/issues/15746) | Workflow execution API responses too large (OOM incident) | Phase 1 | **Partially** | This RFC covers the step execution side (preventing large data from entering memory during workflow runs). The API response side (pagination, `_source_includes` filtering for `GET /api/workflowExecutions/{id}`, reducing hardcoded `size: 1000`) is a separate management-plugin concern not addressed here. |
| [#15837](https://github.com/elastic/security-team/issues/15837) | Workflow-level execution limits | Phase 2 | **Partially** | This RFC's Layer 2 (base-class output guard) contributes to the "max total output size across all steps" requirement. However, the other limits in #15837 are **not covered**: max steps per workflow (150), max execution duration (24h), max workflow output size (5 MB), max steps started per minute (60). |
| [#15840](https://github.com/elastic/security-team/issues/15840) | Foreach loop iteration limits | Phase 2 | **No** | Not addressed. Foreach iteration caps (2000) require changes to `ForeachNodeImpl`, not the memory/size enforcement described here. |
| [#15839](https://github.com/elastic/security-team/issues/15839) | Account/Space-level rate limits | Phase 3 | **No** | Not addressed. Rate limiting (max executions per minute per space/source) is an orthogonal concern handled at the trigger/scheduling layer, not at step execution time. |
| [#14808](https://github.com/elastic/security-team/issues/14808) | Global Concurrency Limits | Phase 3 | **No** | Not addressed. Per-workflow concurrency already exists via `ConcurrencyManager`. Global concurrency limits are a separate concern. |
| [#15841](https://github.com/elastic/security-team/issues/15841) | Limits documentation page | Phase 4 | **Partially** | This RFC document itself provides internal technical documentation. The public-facing limits page (modeled on [Datadog's limits page](https://docs.datadoghq.com/actions/workflows/limits/)) will need its own implementation. |
| [#15236](https://github.com/elastic/security-team/issues/15236) | Load testing to identify scaling limits | Phase 4 | **No** | Not addressed. Load testing is a separate validation effort that should run after limits are implemented to confirm suggested values (15 MB, 150 MB, etc.). |

### Coverage Summary

```
Epic Phase 1 (Step-Level Limits):
  #15838 .............. [COVERED]     This RFC's core scope
  #15746 .............. [PARTIAL]     Step-side OOM covered; API response pagination not covered

Epic Phase 2 (Workflow-Level Limits):
  #15837 .............. [PARTIAL]     Cumulative output budget via Layer 2; other limits not covered
  #15840 .............. [NOT COVERED] Foreach iteration limits

Epic Phase 3 (Account/Space-Level):
  #15839 .............. [NOT COVERED] Rate limits
  #14808 .............. [NOT COVERED] Global concurrency

Epic Phase 4 (Documentation & Validation):
  #15841 .............. [PARTIAL]     This RFC provides internal docs; public page not covered
  #15236 .............. [NOT COVERED] Load testing
```

### What the PoC Delivers Toward the Epic

The PoC directly addresses the **critical path** items from the epic:

1. **#15838 acceptance criteria coverage:**
   - "HTTP step aborts download mid-stream when response exceeds configured limit" -- **Yes** (axios `maxContentLength`)
   - "Elasticsearch step aborts response mid-stream when it exceeds configured limit" -- **Yes** (`transport.request({ maxResponseSize })` -- native mid-stream abort)
   - "Post-hoc output size check rejects oversized step outputs before persisting" -- **Yes** (base class guard)
   - "Heap pressure monitor triggers abort when V8 heap usage exceeds threshold" -- **No** (deferred to research: [#16107](https://github.com/elastic/security-team/issues/16107))
   - "Per-step `max_response_size` YAML config is supported" -- **Yes**
   - "Connector step outputs are checked post-hoc" -- **Yes**
   - "Clear error messages" -- **Yes** (`ResponseSizeLimitError`)
   - "Limits configurable via `kibana.yml`" -- **Yes** (`maxResponseSize` in plugin config)

2. **#15746 root cause mitigation:**
   - The OOM incident was caused by unbounded data entering the heap during step execution. The PoC's pre-emptive enforcement (HTTP, Elasticsearch, Kibana action) and post-hoc guard (all steps) directly prevent recurrence for step execution scenarios.
   - The API response side of #15746 (pagination, field filtering in `GET /api/workflowExecutions`) is not covered and should be addressed separately in `workflows_management`.

### What Remains After the PoC

| Remaining Work | Related Issue | Priority |
|---|---|---|
| Heap pressure circuit breaker (research needed -- no deterministic approach available) | [#16107](https://github.com/elastic/security-team/issues/16107) | Research |
| Max step input size check (before `_run()`) | #15838 | Medium |
| API response pagination and `_source_includes` filtering | #15746 | High |
| Max steps per workflow (definition-time validation) | #15837 | Medium |
| Max execution duration enforcement | #15837 | Medium |
| Cumulative output budget across all steps | #15837 | Medium |
| Max workflow output size | #15837 | Low |
| Foreach iteration cap (2000) | #15840 | Medium |
| Account/space-level rate limits | #15839 | Medium |
| Global concurrency limits | #14808 | Medium |
| Public limits documentation page | #15841 | Low |
| Load testing with enforced limits | #15236 | Medium |

---

## Enforcement, connector coverage, and observability

See [step_size_limits_enforcement_and_observability.md](./step_size_limits_enforcement_and_observability.md) for:

- How Layer 2 is enforced on new steps (single execution path via `BaseAtomicNodeImplementation.run()`).
- How to track connector coverage (which connector types have Layer 1 vs Layer 2 only) and the `CONNECTOR_TYPES_WITH_LAYER_1` allowlist.
- What logs and tags exist for `StepSizeLimitExceeded` and how to use them for dashboards and regression detection.

---

## Known Limitations

1. **Connector OOM protection is best-effort.** The post-hoc check catches the output after it's in memory. True streaming enforcement for connectors requires changes to the Kibana Actions framework (`actionsClient.execute()`).

2. **`JSON.stringify` for size measurement is expensive.** For very large outputs (tens of MB), the serialization itself consumes memory and CPU. A future optimization could sample the output or use `v8.serialize()` which is more memory-efficient for size estimation.

3. **Worker threads remain a future option.** For truly untrusted or unbounded step execution, running steps in a `worker_thread` with `resourceLimits.maxOldGenerationSizeMb` would provide hard OS-level enforcement. This requires significant architecture changes (service proxying, serialization) but would close the gap for connectors and custom steps.

4. **No protection against slow memory leaks within a step.** If a step gradually accumulates memory during computation (not from a single I/O response), neither layer catches it. This is an inherent limitation of in-process execution.

5. **Full context is held in memory during rendering.** Until lazy context rendering is implemented, every step's output is live in the heap during template evaluation. The `postprocess` attribute and size limits mitigate this but do not eliminate it.
