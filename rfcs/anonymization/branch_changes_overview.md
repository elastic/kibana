# Branch Changes Overview — `workflow-and-inference-lifecycle-hooks`

This document describes, in plain terms, what was introduced or changed on this branch, organised by the layer each change belongs to. It is intended as a conceptual record for reviewers and future contributors — not a technical specification.

---

## Why this branch exists

The goal is to connect the Workflows engine to the LLM inference path so that repeatable, admin-editable logic can run automatically around every AI call. The first concrete use case is PII anonymisation: replace sensitive values in the prompt before the model sees them, then restore the original values in the model's response before the user sees them. Crucially, this logic should live in workflows that an admin can inspect, copy, extend, or replace — not buried in server-side TypeScript that requires a code change to customise.

The branch is structured in two phases that build on each other:

- **Phase 1** established the plumbing: lifecycle hook points, in-memory TypeScript handlers to prove the concept end to end, and the core PII step types.
- **Phase 2** completed the picture: the YAML workflows in the index become the actual runtime source of truth, seeded automatically on startup, and activated per-space by enabling them in the Workflow Management UI.

---

## Layer 1 — Workflow infrastructure

### What existed before

The workflow engine already ran long-lived background workflows through Task Manager. The extension layer (`workflows_extensions`) let other plugins register step types and trigger definitions, and already had a mechanism for emitting asynchronous events to subscribed workflows.

### What changed

**A synchronous hook contract was added to triggers.**
Previously a trigger could only fire-and-forget an event to a background workflow. Now a trigger can also declare a *synchronous* contract — meaning callers can invoke it and wait inline for a result, with a maximum timeout, a chaining mode (each workflow receives the previous one's output), and a failure policy (reject the caller if a workflow fails, or log and continue).

The choice of whether to use the sync path for a given trigger is explicit: the trigger's registration must opt in via a flag. This ensures existing async triggers are completely unchanged.

**An inline executor was added to the execution engine.**
For the synchronous path, running a full Task Manager job (which involves writing to Elasticsearch and waiting for a worker pickup) would be too slow and too heavy. A new lightweight executor was added that runs YAML workflow steps directly in memory, one after another, using the same step definitions and the same template engine as the full engine. It has no side effects — it does not write execution state anywhere. It respects the timeout declared on the trigger and surfaces a typed result (completed or failed) to the caller.

**The workflows management plugin was extended with seeding and migration.**
On startup, `workflows_management` now looks for an optional dependency (`inference_workflows`) and, if present, calls a seeding routine. The seeder writes the two default anonymisation workflow YAML files into the `.kibana-workflows` index if they are not already there. This is idempotent — subsequent restarts detect the documents and skip. A one-shot migration also runs once to carry over any regex rules that were previously stored in the legacy `AI:anonymizationSettings` UI setting into the newly seeded workflow.

**Session capabilities are now manageable from outside the extension layer.**
The PII step needs an encryption salt and a live token map to do its work. These are stored in a short-lived in-memory cache keyed by session ID. Previously only the internal hook invocation code managed that cache. Two new methods on the extensions plugin's start contract — set and clear — allow the workflows management client to manage the cache directly when running YAML workflows inline, without going through the internal handler path.

---

## Layer 2 — Inference layer

### What existed before

The inference plugin provided a `chatComplete` API that sent messages to a connector and streamed the response back. It had a config flag for anonymisation and some plumbing for a token map, but no lifecycle hook mechanism.

### What changed

**Two named lifecycle points were introduced around every LLM call.**
`inference.beforeCompletion` fires after the caller has assembled the prompt but before it is sent to the connector. `inference.afterCompletion` fires after the connector responds but before the response is returned to the caller. These hook points — their string IDs and Zod event schemas — are declared in `workflows_extensions/common` rather than inside `inference` or `inference_workflows`. That placement means any plugin can import the constants without taking a dependency on either of the two heavier plugins, avoiding further coupling.

**The inference plugin calls the workflows client at those two points.**
Before sending to the connector, `chatComplete` now invokes the `beforeCompletion` hook and uses whatever messages and system prompt come back. After receiving the response, it invokes the `afterCompletion` hook and uses the response text that comes back. If no workflows are configured, the hook returns immediately with the original data and there is no overhead.

**A new anonymisation context is created per session.**
The context holds a per-session HMAC salt (derived deterministically from an encrypted secret) and a live token map that accumulates replacements across conversation turns. The salt means tokens are stable within a session — the same IP address always produces the same token, so the LLM can refer back to earlier turns consistently.

**The existing enabled toggle on each workflow controls whether it runs.**
Workflows are already space-scoped — each workflow document belongs to exactly one space, and `getWorkflowsSubscribedToTrigger` always filters by the current space. This means the existing per-workflow **Enabled** toggle in the Workflow Management UI is all an admin needs: enable the seeded anonymisation workflow in a space to activate the feature for that space, disable it to turn it off, or create a cloned variant and enable that instead. No separate configuration is required.

**A new x-pack plugin — `inference_workflows` — was created.**
This plugin bridges the inference and workflows domains. It owns the AI step types (`ai.prompt`, `ai.classify`, `ai.summarize`) and the PII step types (`ai.pii`, `transform.pii_restore`), registers both synchronous lifecycle trigger definitions with their output schemas and timeout contracts, and provides the list of default workflow YAML files to the seeder.

A dedicated plugin was necessary primarily to **avoid circular dependencies**. The inference plugin needs to call into the workflows layer (to invoke hooks), and the workflow step types need to call back into the inference plugin (to make LLM calls). If the steps lived inside either `inference` or `workflows_extensions`, one of those plugins would end up depending on the other, creating a cycle. `inference_workflows` sits at the edge of both domains — it depends on `inference` for LLM access and on `workflows_extensions` for step registration, but neither of those plugins depends on it. The dependency arrow is one-way in each direction.

A secondary benefit is that placing the steps here keeps them behind the enterprise licence boundary and avoids making the OSS `workflows_extensions` layer depend on inference internals.

**A default workflow package was created.**
Two short YAML files define the canonical anonymisation behaviour:

- *Before-prompt workflow*: runs `ai.pii` over the system prompt (if present) and then over the message list, replacing entity values — IP addresses, email addresses, and hostnames — with opaque deterministic tokens.
- *After-completion workflow*: runs `transform.pii_restore` over the model's response text, substituting the tokens back to their original values.

These YAML files live in their own package (`@kbn/default-anonymization-workflows`) so they can be versioned and imported independently. They serve both as the seeded default and as a reference for admins writing their own custom workflows.

---

## Layer 3 — Consumers (Agent Builder, Cases)

### Agent Builder

Agent Builder is the primary consumer. The changes on this branch are in two parts.

The first part is structural: `inferenceWorkflows` is added as an optional plugin dependency in `kibana.jsonc`. This is the minimum wiring to ensure the `inference_workflows` plugin is loaded when Agent Builder runs.

The second part connects conversation identity to the anonymisation session. For PII tokens to be stable across multiple turns of the same conversation — so the LLM sees the same token each time it encounters the same IP address — the PII step needs a consistent salt per conversation. Agent Builder threads the `conversationId` through its entire execution pipeline: from the execution runner down into the runner factory, into `createModelProvider`, and finally into the `InferenceChatModel` instance it creates. There the `conversationId` is stored as `anonymizationSessionId` and forwarded in the `metadata.anonymization.sessionId` field of every `chatComplete` call it makes. This lets the inference plugin use the conversation ID as the key for the salt derivation and session capabilities cache, ensuring tokens are stable for the lifetime of a conversation.

These changes are entirely behind the existing plugin boundary — Agent Builder's user-facing behaviour is unchanged.

### inference-langchain

The `InferenceChatModel` class (the LangChain adapter for the Kibana inference API) was extended with a new optional `anonymizationSessionId` field. When set, the value is forwarded in the `metadata.anonymization.sessionId` field of every `chatComplete` call the model makes. This is the mechanism Agent Builder uses (described above) and is equally available to any other consumer that instantiates `InferenceChatModel` directly.

### Cases

The only change in the Cases plugin is a test fix: the mock `WorkflowsClient` in `event_bridge.test.ts` was updated to include `invokeHook` alongside the existing `emitEvent` mock, reflecting the expanded `WorkflowsClient` contract introduced on this branch. No production code in Cases was changed.

---

## Layer 4 — Shared packages and contracts

**`kbn-workflows` package** — the shared type package was extended with `HookHandler`, `HookResult`, and the `invokeHook` method added to the `WorkflowsClient` interface. These give every consumer — and test mocks — a single source of truth for the synchronous hook path without depending on implementation-internal types in `workflows_extensions` or `workflows_management`.

**`inference-common` package** — the `ChatCompleteAnonymizationMetadata` type was extended with an optional `sessionId` field. This allows callers such as Agent Builder to forward a stable session identifier (their `conversationId`) so that PII tokens are consistent across conversation turns.

---

## Future potential improvements

### NER (Named Entity Recognition) support via `ai.ner`

The regex-based `ai.pii` step covers structured PII — IP addresses, email addresses, hostnames, and custom patterns. Unstructured PII (free-text names, addresses, organisation names) requires machine-learning–based named entity recognition, which runs inside Elasticsearch via the ML inference API.

Adding NER would require three changes:

1. **Expose a scoped ES client in the inline executor.** `executeWorkflowSync` currently throws if a step calls `getScopedEsClient` — this was a deliberate simplification to keep Phase 2 pure in-memory. The caller (`WorkflowsClient.invokeHook`) already holds the `KibanaRequest`, so it can create a scoped ES client and pass it through. This is the only structural change needed in the executor.

2. **A new `ai.ner` step type in `inference_workflows`.** The step would accept `input` (text or messages array) and a `modelId`, call `_ml/trained_models/<id>/_infer` via the scoped ES client, parse the entity span annotations from the response, and apply the same HMAC token replacement as `ai.pii` — writing into the same `AnonymizationContext.tokenMap`. The token format and `transform.pii_restore` step are already compatible; no changes needed on the restore side.

3. **Update the legacy migration.** The one-shot migration currently drops `{ type: 'NER', modelId: '...' }` rules with a deprecation warning. Once `ai.ner` exists, those rules can be converted into `ai.ner` steps in the seeded before-prompt workflow instead of being discarded.

The YAML would look like:
```yaml
- name: ner_messages
  type: ai.ner
  with:
    sessionId: '{{ event.sessionId }}'
    input: '{{ event.messages }}'
    modelId: '.elser-2'
```

A latency consideration: calling an ML model adds a synchronous Elasticsearch round-trip inside the `beforeCompletion` hook. The 15-second trigger timeout would likely need to be increased, or the NER call optimised to batch all text into a single inference request.

---

## What was deliberately left out

- **No dedicated admin UI** was added for managing the anonymisation feature. The admin activates it by enabling the seeded workflow in the existing Workflow Management UI, and deactivates it by disabling or deleting the workflow. No Stack Management settings are involved.
- **No field-level anonymisation**. The anonymisation operates on full message strings and the system prompt. Per-field masking of Elasticsearch documents before they reach the agent was excluded because ESQL aggregations break column lineage, making it impossible to re-identify values after anonymisation. This was an explicit design decision in the RFC.
- **No NER (Named Entity Recognition) support in Phase 2**. The legacy migration imports only RegExp-based rules. NER rules from the old setting are logged as dropped because the workflow YAML step type does not yet support an NER execution mode. A follow-up is expected.
- **No full-async workflow path for anonymisation**. The inline executor does not write execution state to Elasticsearch and does not support steps that need a real HTTP request scope (such as querying Elasticsearch or making outbound HTTP calls from within a step). All anonymisation steps on this branch are pure in-memory operations, which is the correct trade-off for a synchronous LLM call path.
