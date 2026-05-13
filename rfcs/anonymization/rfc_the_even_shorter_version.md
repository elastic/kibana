# Workflow-Driven LLM Anonymization \-  The even shorter version

**Reading time:** ~4 minutes | Concise reference. [The short version](?tab=t.8ts5kr6m0uek) | [Full design](?tab=t.0) | [PoC PR](https://github.com/elastic/kibana/pull/268994)

## The proposal

**What: ** Two synchronous lifecycle hooks at the point where every Kibana LLM call passes through — `beforeCompletion` anonymizes the full prompt before the connector sees it, `afterCompletion` restores originals in the response. Anonymization logic lives in YAML workflows that admins enable per space. No changes needed in any individual LLM consumer.

**What was ruled out:** Per-field allow/deny rules. ESQL operators (`EVAL`, `STATS`, `MV_*`) produce derived columns with no traceable lineage to source fields. Any field-level rule that appears to work for alert context would silently fail for tool outputs. Text-level matching sidesteps this entirely.

## Why this approach

| Problem | How this solves it |
| --- | --- |
| Multiple LLM consumers, all needing anonymization | One hook at `chatComplete` covers all of them — new consumers get protection automatically |
| Field-level rules break on tool output (ESQL lineage gap) | Text-level regex matching is lineage-agnostic |
| In-memory session state fails in multi-node clusters | Salt derived from `HMAC(encryptionKey, sessionId)` — same result on any node, no storage needed |
| Silent PII leaks if anonymization breaks | Fail-closed default: broken workflow rejects the call, surfaces an error, never passes raw prompt through |


## Impact by role

**Admin**
- Enable the pre-seeded workflow in Workflow Management for each space where anonymization should be active
- Add custom regex patterns (employee IDs, account numbers) by editing the workflow YAML — no code deployment needed
- Control failure behavior: default is fail-closed (call rejected); opt into `allow_unsafe` if uptime matters more than safety

**LLM consumer developer**
- No code changes required for anonymization coverage
- One targeted change for cross-turn token stability: thread a stable `sessionId` into `chatComplete`'s metadata (e.g. Agent Builder's `conversationId`)
- Consumers that omit `sessionId` still get anonymization — tokens just won't be stable across turns

**Security / ops**
- Monitor `anonymization.workflow.failure.count` — failures are loud by design
- Fail-closed means a broken regex workflow produces a user-visible error, not a silent PII leak
- Feature is off until the admin enables it; two gates: server flag + per-space workflow toggle


## What anonymization does NOT cover

- Data at rest (Elasticsearch indices, saved objects, dashboards)
- Tools that call Elasticsearch directly — their queries run on real data; the results are anonymized when they enter the *next* `chatComplete` prompt
- Named entities (person names, addresses) — NER support is deferred to a future phase; regex covers structured PII (IPs, emails, hostnames)
- The Security AI legacy path (`inferenceChatModelDisabled: true`) — that path bypasses `chatComplete` entirely and must be removed in Phase 3 before anonymization is complete for that consumer

![][image1]

## What changes (high level)

```
workflows-extensions      → gains concept of a synchronous (blocking) hook
workflows-execution-engine → gains lightweight inline YAML runner (no Task Manager, no DB writes)
inference-workflows (new) → registers hook definitions + ai.pii / transform.pii_restore step types
inference plugin          → wraps chatComplete to call both hooks around the connector
workflowsManagement       → seeds two default workflows on startup (disabled until admin enables)
Agent Builder             → conversationId threaded to chatComplete as sessionId (cross-turn stability)
```

## Changes by plugin

### Generic workflow framework

*`@kbn/workflows-extensions` — the OSS plugin that owns trigger and step registration (modified)*

Gains the concept of a **synchronous hook** — a trigger that blocks the caller until all subscribed workflows have run and returns their combined output. Previously triggers were fire-and-forget. The new sync variant is declared by adding an optional `sync` block to `registerTriggerDefinition`, which adds a timeout, a failure policy, and an option for chained execution where each workflow receives the previous one's output rather than the original event.

The public start contract gains **`invokeHook(triggerId, payload, capabilities?)`** — the single entry point for firing a synchronous hook. An optional `capabilities` map carries call-scoped objects (e.g. `AnonymizationContext`) to handlers without exposing them in YAML. `invokeHook` runs all registered in-process handlers in registration order — no task manager, no background jobs — and returns a `HookResult` (`completed`, `pass_through`, or `failed`). Three companion methods (`setSessionCapabilities`, `getSessionCapabilities`, `clearSessionCapabilities`) let inline YAML executors access the same capability store between steps.

### Inline workflow executor

*`@kbn/workflows-execution-engine` — the x-pack plugin that runs workflow steps (modified)*

A lightweight in-process runner that evaluates YAML workflow steps one by one, using the existing templating engine for expressions and condition guards. It runs entirely in memory — no background jobs, no database writes. This is what makes synchronous hook execution fast enough to sit in the hot path of every LLM call.

### Workflow management

*`@kbn/workflows-management` — the OSS plugin that stores and orchestrates workflows (modified)*

Gains two capabilities:

**Hook invocation.** When a hook fires, the workflow management layer looks up which workflows in the current space are subscribed to that hook and have been enabled by the admin. It runs them in sequence using the inline executor, threading each workflow's output into the next. If no workflows are enabled it falls back gracefully.

**Default workflow seeding.** On startup, two default workflows are written into the workflow store if they do not already exist — one for anonymization before the LLM call, one for de-anonymization after. They are seeded as disabled so nothing changes for existing deployments until an admin explicitly turns them on. If an admin has previously deleted them, they are not recreated. If the bundled YAML has been updated (e.g. a bug fix), the stored copy is updated while preserving admin-controlled settings like the enabled state.

A one-shot migration runs on first startup after upgrade: it reads any regex-based anonymization rules the admin previously configured in the Observability AI Assistant settings page and imports them into the seeded workflow. This migration runs once and does not repeat.

### Inference lifecycle hook registrations and step types

*`@kbn/inference-workflows` — x-pack plugin that bridges inference and workflows (new); also ships the default workflow YAML via `@kbn/default-anonymization-workflows` content package (new)*

A dedicated plugin registers the two hook definitions with the framework — specifying their input and output shapes, timeout, and failure policy. This plugin also registers all the step types that workflows can use, including the PII anonymization step and the PII restore step.

A separate plugin is required here to avoid a circular dependency. The step types (e.g. `ai.pii`) need access to `inference` capabilities at runtime, so if they were registered directly inside `workflowsExtensions`, that plugin would need to depend on `inference`. But `inference` itself optionally depends on `workflowsExtensions` to call `invokeHook`. That would be a cycle. By placing the registrations in `inference_workflows` — a plugin that depends on both `inference` and `workflowsExtensions`, and that nothing depends on in return (except `workflowsManagement` as an optional seeding dep) — the dependency graph stays a clean DAG and `workflowsExtensions` retains zero knowledge of AI or inference concepts.

### Inference plugin

*`@kbn/inference` — the x-pack plugin every LLM call in Kibana passes through (modified)*

The actual LLM call is wrapped so that:

1. Before the prompt reaches the connector, `invokeHook('inference.beforeCompletion', payload, { anonymizationContext })` fires any enabled anonymization workflows. PII values are replaced with opaque tokens and a short note is appended to the system prompt telling the LLM what the tokens represent and how to handle them. If no PII was found, nothing is appended.

2. After the LLM responds, `invokeHook('inference.afterCompletion', payload, { anonymizationContext })` fires the de-anonymization workflows and real values are restored before the response is returned to the caller.

A small piece of call-scoped state — the mapping between tokens and their original values — is created at the start of each call and discarded when the call completes. It is never written to disk. Token values are deterministic: the same piece of PII always produces the same token within a session, even across Kibana restarts or different nodes, because the token is derived from a dedicated keystore secret (`xpack.inference.anonymization.encryptionKey`) and the session identifier rather than from stored state.

If anything in the anonymization workflow fails, the call is rejected by default — raw PII is never silently sent to the model. Admins can opt into a permissive mode if service continuity is more important than the safety guarantee.

## Key design decisions

| Concern | Decision |
| :---- | :---- |
| Who is covered | Every LLM call in Kibana, automatically, with no per-consumer changes |
| How state is managed | Call-scoped only — no session store, no TTL, no eviction |
| What happens on failure | Fail-closed by default — the call is rejected, not silently passed through |
| How admins control it | The workflow `enabled` toggle per space — no separate configuration needed |
| What is out of scope | Field-level rules, NER-based detection, in-Kibana data |


## Questions for reviewers

1. **Failure mode:** Fail-closed means a misconfigured regex workflow causes a user-visible error instead of a response. Is that the right trade-off, or should the default be fail-open with audit logging?

2. **SessionId threading:** Callers must pass a stable `sessionId` for cross-turn token consistency. Does this feel like an acceptable caller responsibility, or should the inference plugin handle correlation differently?

3. **Tool output coverage:** The LLM never sees raw PII in either direction of a tool call — tool call arguments are de-anonymized before the tool executes, and tool results are anonymized before the next LLM call. However, real PII values do exist in agent memory between a tool's return and the next `chatComplete` call. Are there logging, tracing, or error-reporting paths in your stack that could capture that in-process state and need to be accounted for?

4. **Admin control surface:** Per-space anonymization is controlled entirely by enabling/disabling the workflow document in Workflow Management. Is a single toggle per space the right granularity, or is there a need for per-agent or per-connector control?

5. **Scope boundary:** This RFC covers only what is sent to the LLM. Cases, dashboards, exports, and emails are explicitly out of scope. Does that boundary match where the team's risk lies, or should the scope be wider?

