# Step Size Limits: Enforcement for New Steps, Connector Coverage, and Observability

This document answers how the two-layer approach is enforced on new steps, how to track connector coverage (e.g. Jira vs HTTP), and what observability exists to prevent regression.

---

## 1. How is Layer 2 enforced on new steps?

### Current enforcement (by design)

**Layer 2 is enforced automatically for every atomic step** — there is no way for a new step to “opt out” as long as it is executed through the engine’s single entry path.

1. **Single execution path**  
   All atomic steps are created by `NodesFactory.create()`. The factory only ever returns implementations that extend `BaseAtomicNodeImplementation`:
   - `ElasticsearchActionStepImpl`
   - `KibanaActionStepImpl`
   - `ConnectorStepImpl` (includes `type: http`, `.slack`, `.jira`, etc.)
   - `DataSetStepImpl`
   - `CustomStepImpl` (extension-registered steps)

2. **Base class owns `run()`**  
   Execution always goes through `BaseAtomicNodeImplementation.run()`, which:
   - Checks **input** size after `getInput()` and before `_run()`.
   - Calls `_run(input)` (subclass logic).
   - Checks **output** size after `_run()` and before `finishStep()`.

   So any new step that extends this base class gets Layer 2 (input + output guard) without any extra code.

3. **`max-step-size` is applied even if the step forgets it**  
   The base class constructor copies `max-step-size` from `stepExecutionRuntime.node.configuration` onto `this.step` when the subclass does not set it. So new step types do not need to remember to pass `max-step-size` through.

### How to add a new step and still get Layer 2

- **Built-in step:** Implement a class that `extends BaseAtomicNodeImplementation<...>` and add a branch in `NodesFactory.create()` that instantiates it. Layer 2 is automatic.
- **Custom step (extensions):** Use `CustomStepImpl`, which already extends the base class. Layer 2 is automatic.

### Optional: compile-time / test-time enforcement

To make “every atomic step must get Layer 2” even more explicit:

- **Test:** Add a test that discovers all classes used for atomic steps (e.g. every branch in `NodesFactory` that returns an atomic impl) and asserts each one `extends BaseAtomicNodeImplementation`. That way, if someone adds a new atomic step that does not extend the base class, the test fails.
- **Docs:** In the same file as `NodesFactory` or in a CONTRIBUTING doc, add a one-line note: “All atomic step implementations must extend `BaseAtomicNodeImplementation` so they get Layer 2 size enforcement.”

No new runtime “enforcement” is required; the architecture already guarantees Layer 2 for every step that goes through `NodesFactory` and `run()`.

---

## 2. How can we track “connector coverage” (e.g. Jira vs HTTP)?

### What “coverage” means

- **Layer 1 (pre-emptive):** Response is aborted mid-stream (e.g. axios `maxContentLength`, ES `maxResponseSize`, Kibana streaming reader). Best for preventing OOM on large responses.
- **Layer 2 only:** Response is fully read into memory; size is checked only after the step returns. Still prevents unbounded context growth and rejects oversized output, but does not prevent a single huge response from causing memory pressure before the check.

“Jira-like” connectors (small JSON responses) are low risk even with Layer 2 only. High risk are connectors that can return very large bodies (e.g. HTTP to arbitrary URLs, webhooks, or future “export” connectors). Tracking coverage means: which connector types have Layer 1 vs Layer 2 only?

### Current coverage (single source of truth)

The only place that decides “this connector type gets Layer 1” is in code:

| Location | Rule |
|----------|------|
| `connector_step.ts` | `CONNECTOR_TYPES_WITH_LAYER_1.has(rawType)` → inject `fetcher.max_content_length` (Layer 1). Currently only `http`. All other connector types (e.g. `.slack`, `.jira`) get Layer 2 only. |
| ES step | Layer 1 via `transport.request(..., { maxResponseSize })`. |
| Kibana action step | Layer 1 via streaming body reader. |

So today:

- **Layer 1:** `http`, `elasticsearch.*`, `kibana.*`
- **Layer 2 only:** every other connector type (e.g. `.slack`, `.jira`, custom connector types), plus all steps still get Layer 2 in the base class.

### How to track and enforce connector coverage

1. **Explicit allowlist (recommended)**  
   - Define a constant, e.g. in `connector_step.ts` or a small `size_limits_constants.ts`:
     - `CONNECTOR_TYPES_WITH_LAYER_1: ReadonlySet<string> = new Set(['http'])`
   - Use it in the `if` condition instead of inline string checks. The list is then the single place to update when you add Layer 1 for another connector type (e.g. a future “large export” connector).
   - Optionally add a short comment: “Connector types that support mid-stream response size limit (Layer 1). All others rely on Layer 2 only.”

2. **Documentation**  
   - In the RFC or this doc, keep a “Connector coverage” table: columns = connector type, Layer 1 (Y/N), notes. Update it when you add a new connector type or add Layer 1 support for an existing one.

3. **Tests**  
   - One test: “when connector type is in `CONNECTOR_TYPES_WITH_LAYER_1`, renderedInputs.fetcher.max_content_length is set (for http/webhook).”
   - Another test: “when connector type is not in the set (e.g. `.jira`), fetcher.max_content_length is not injected.”  
   That way, if someone adds a new connector type that can return large payloads and forgets to add Layer 1, the team can at least see the list and add it when needed; the test documents expected behavior.

4. **Enforcement for “Jira-like” connectors**  
   There is no need to “enforce” that Jira-like connectors don’t add a lot of memory: they naturally don’t. What you want is:
   - **Visibility:** Know which connectors have Layer 1 vs Layer 2 only (allowlist + doc + tests above).
   - **Process:** When adding or changing a connector that can return large responses (e.g. file download, bulk export), require adding it to the Layer 1 allowlist and implementing the transport-level limit (e.g. in the Actions executor for that connector). The RFC already calls out that non-HTTP stack connectors are “Layer 2 only” until the Actions framework supports response limits.

---

## 3. What observability/logs exist so we don’t regress?

### What exists today

When a step fails with **StepSizeLimitExceeded**:

1. **Step execution state**  
   The step is marked failed and the error is stored on the step execution with:
   - `error.type === 'StepSizeLimitExceeded'`
   - `error.message`, `error.details` (e.g. `limitBytes`, `_debug` for ES/HTTP).

2. **Workflow event logger**  
   Every step failure goes through `StepExecutionRuntime.failStep()` → `logStepFail()` → `stepLogger.logError(...)`. The logged event includes:
   - **Serialized error:** `ExecutionError.toSerializableObject()` → includes `type`, `message`, `details`.
   - **Tags:** `['workflow', 'step', 'fail']`.
   - **Labels:** `step_type`, `connector_type`, `step_name`, `step_id` (from `this.node.stepType`).

   So every size-limit failure produces a workflow log event with:
   - `error.type` = `'StepSizeLimitExceeded'`
   - `labels.step_type` = e.g. `http`, `elasticsearch.search`, `data.set`, `.jira`, etc.

3. **Elasticsearch step only**  
   When the ES step hits the size limit, it also calls `workflowLogger.logError(..., { tags: [..., 'response-size-exceeded'] })` before returning. So for ES you get an extra event with tag `response-size-exceeded`. For failures from the base class (Layer 2) or from the HTTP/connector path, that tag is not set today.

4. **Persistence**  
   Events are queued and then written via `logsRepository.createLogs(events)` to the workflow execution logs data stream. The event shape includes `error`, `tags`, `labels`, `workflow` (e.g. `step_type`).

5. **APM**  
   Step execution is wrapped in an APM span (`step: ${step.name}`) with labels such as `step_type`; on failure the span outcome is set to `failure`. So you can see failed steps in traces; the error type is not on the span itself but is in the workflow logs.

### Gaps and suggested improvements

- **Consistent tag for size-limit failures**  
  Today only the ES step adds the tag `response-size-exceeded`. For all other steps, you must query by `error.type === 'StepSizeLimitExceeded'`.  
  **Suggestion:** In `StepExecutionRuntime.logStepFail()`, when `executionError.type === 'StepSizeLimitExceeded'`, add the tag `'response-size-exceeded'` to the logged event. Then every size-limit failure (Layer 1 or Layer 2, any step type) can be found with a single tag filter.

- **Searchable error and labels in the data stream**  
  Workflow log events include `error` and `labels` in the document. If the logs data stream mapping does not declare these fields and uses `dynamic: false`, they may be stored in `_source` but not be queryable.  
  **Suggestion:** Ensure the logs data stream mapping (or a later index template) includes `error.type`, `labels.step_type`, and `tags` so you can run queries like: “count of events where `error.type = StepSizeLimitExceeded`” or “group by `labels.step_type`” for dashboards and alerts.

- **Dashboards and alerts (operational)**  
  - **Dashboard:** Count of `StepSizeLimitExceeded` over time, broken down by `labels.step_type` (and optionally workflow/space). That shows which step types hit the limit most and whether a change (e.g. new connector or new workflow) increases hits.
  - **Alert (optional):** If count of `StepSizeLimitExceeded` in a time window exceeds a threshold, notify (e.g. Slack). Helps catch misconfigured limits or a regression that causes many steps to hit the limit.

- **Regression tests**  
  The existing unit and integration tests already assert that size limits are enforced and that errors have `type: 'StepSizeLimitExceeded'`. Keeping these and the new tests suggested in sections 1 and 2 gives you automated regression protection.

### Summary table: observability today

| What | Where | How to use it |
|------|--------|----------------|
| Error type and details | Step execution document (e.g. in workflow execution state) and workflow log event `error` | UI can show “StepSizeLimitExceeded” and `_debug`; API responses include step error. |
| Step type for each failure | Workflow log event `labels.step_type` | Query/filter by connector or step type. |
| Tag for “size limit” (ES only today) | Workflow log event `tags` | ES path: filter by `response-size-exceeded`. Others: filter by `error.type`. |
| All step failures | Workflow log event (tags `workflow`, `step`, `fail`) | Count failures, group by step_type, correlate with APM. |
| APM | Span per step with outcome and labels | See which step failed in a trace; drill into logs by execution/step id. |

Adding the `response-size-exceeded` tag in `logStepFail()` when `executionError.type === 'StepSizeLimitExceeded'` and ensuring `error.type` and `labels` are queryable in the logs data stream would give you a solid base for “no degradation” monitoring and alerting.
