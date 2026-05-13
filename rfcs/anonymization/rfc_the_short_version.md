# Workflow-Driven LLM Anonymization \-  The short version

**Reading time:** \~20 minutes | Too long? see [The even shorter version](?tab=t.i14gsnafb7ff) |  [Full RFC](?tab=t.0) | [PoC PR](https://github.com/elastic/kibana/pull/268994)

## The proposal

Place a single pair of synchronous lifecycle hooks at the **`inference` plugin's existing `chatComplete` boundary** — the one function every LLM call in Kibana must pass through. A `beforeCompletion` hook anonymizes the full prompt (system prompt \+ all messages) before it reaches the connector. An `afterCompletion` hook restores originals in the response before it reaches the caller.

Anonymization itself is driven by workflow steps (`ai.pii`, `transform.pii_restore`) authored in the same YAML surface admins already use for other agent workflows. Two default workflows ship with the standard PII patterns (IP addresses, email addresses, hostnames) enabled when the admin toggles the feature on.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, attack-discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

## Why this approach

*(“Why this approach” and “Impact by role” are the same as in the [even shorter version](?tab=t.i14gsnafb7ff) — reproduced here so this document stands alone)*

| Problem | How this solves it |
| :---- | :---- |
| Multiple LLM consumers, all needing anonymization | One hook at `chatComplete` covers all of them — new consumers get protection automatically |
| Field-level rules break on tool output (ESQL lineage gap) | Text-level regex matching is lineage-agnostic |
| In-memory session state fails in multi-node clusters | Salt derived from `HMAC(serverSecret, sessionId)` — same result on any node, no storage needed |
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
- Feature is off until the admin enables it; two gates: server flag \+ per-space workflow toggle

## Changes by plugin

### Generic workflow framework

*`@kbn/workflows-extensions` — the OSS plugin that owns trigger and step registration (modified)*

Gains the concept of a **synchronous hook** — a trigger that blocks the caller until all subscribed workflows have run and returns their combined output. Previously all triggers were fire-and-forget. The sync variant adds a timeout, a failure policy, and a chained execution mode where each workflow receives the previous one's output rather than the original event.

A small addition to the public contract lets the workflow runner manage a per-session capability store directly, which is needed so step types can access call-scoped state (the anonymization context) without it leaking through the YAML.

### Inline workflow executor

*`@kbn/workflows-execution-engine` — the x-pack plugin that runs workflow steps (modified)*

A lightweight in-process runner that evaluates YAML workflow steps one by one, using the existing templating engine for expressions and condition guards. It runs entirely in memory — no background jobs, no database writes. This is what makes synchronous hook execution fast enough to sit in the hot path of every LLM call.

### Workflow management

*`@kbn/workflows-management` — the OSS plugin that stores and orchestrates workflows (modified)*

**Hook invocation.** When a hook fires, the workflow management layer looks up which workflows in the current space are subscribed to that hook and have been enabled by the admin. It runs them in sequence using the inline executor, threading each workflow's output into the next. If no workflows are enabled it falls back gracefully.

**Default workflow seeding.** On startup, two default workflows are written into the workflow store if they do not already exist — one for anonymization before the LLM call, one for de-anonymization after. They are seeded as disabled so nothing changes for existing deployments until an admin explicitly turns them on. If an admin has previously deleted them, they are not recreated. If the bundled YAML has been updated (e.g. a bug fix), the stored copy is updated while preserving admin-controlled settings like the enabled state.

**Legacy settings migration.** A one-shot migration runs on first startup after upgrade: it reads any regex-based anonymization rules the admin previously configured in the Observability AI Assistant settings page (Stack Management → Advanced Settings → Observability) and imports them into the seeded before-completion workflow. This runs once and does not repeat.

### Inference lifecycle registrations and step types

*`@kbn/inference-workflows` — x-pack plugin that bridges inference and workflows (new); ships the default workflow YAML via `@kbn/default-anonymization-workflows` content package (new)*

Registers the two hook definitions with the framework — specifying their input and output shapes, timeout, and failure policy. Registering here rather than inside the inference plugin itself keeps the generic workflow framework free of AI and inference knowledge.

Also registers the step types that workflows use: **`ai.pii`** (regex-based PII detection and HMAC tokenization) and **`transform.pii_restore`** (the reverse pass). Both are described in detail in the [New step types](#new-step-types) section below.

A separate plugin is required here to avoid a circular dependency. The step types (e.g. `ai.pii`) need access to `inference` capabilities at runtime, so if they were registered directly inside `workflowsExtensions`, that plugin would need to depend on `inference`. But `inference` itself optionally depends on `workflowsExtensions` to call `invokeHook`. That would be a cycle. By placing the registrations in `inference_workflows` — a plugin that depends on both `inference` and `workflowsExtensions`, and that nothing depends on in return (except `workflowsManagement` as an optional seeding dep) — the dependency graph stays a clean DAG and `workflowsExtensions` retains zero knowledge of AI or inference concepts.

### Inference plugin

*`@kbn/inference` — the x-pack plugin every LLM call in Kibana passes through (modified)*

The `chatComplete` call is wrapped to fire both hooks around the connector call. The detailed flow is described in the next section.

## Architecture

### The single hook point

```
caller (Agent Builder, OAS, attack-discovery, …)
         │
         ▼
 inference plugin · chatComplete
   1. resolve options
   2. invokeHook('inference.beforeCompletion')   ← PII → tokens
   3. connector.chatComplete(anonymized prompt)
   4. invokeHook('inference.afterCompletion')    ← tokens → originals
   5. return to caller
```

Every consumer verified against the codebase:

| Consumer | Path to `chatComplete` | Covered |
| :---- | :---- | :---- |
| Agent Builder (research \+ answer agents) | `InferenceChatModel` → `client.chatComplete` | Yes |
| Observability AI Assistant | `plugins.inference.getClient()` → `chatComplete` directly | Yes |
| Attack Discovery | `inference.getClientWithoutRequest()` → `chatComplete` | Yes |
| SIEM Migrations / Entity Analytics | `inference.getChatModel()` → `InferenceChatModel` → `chatComplete` | Yes |
| AI Rule Creation / Automatic Import | `inference.getClient()` or `InferenceChatModel` → `chatComplete` | Yes |
| Security AI (primary path) | `inference.getChatModel()` → `InferenceChatModel` → `chatComplete` | Yes |
| **Security AI (legacy path)** | `ActionsClientChatOpenAI` / Bedrock / Vertex directly against actions connector | **No — bypasses inference plugin** |

**The Security AI gap** is the one known exception: `elastic_assistant` has a feature-flagged bypass (`inferenceChatModelDisabled`) that skips the inference plugin entirely. Closing it requires removing that flag and the three `ActionsClientChat*` classes it selects.

**Tool coverage — two events, not one:** Each tool invocation has two anonymization events covering opposite sides of the call:

1. **LLM → tool (tool call arguments):** The LLM responds with anonymized tool call arguments (tokens). In `afterCompletion`, `restoreInValue` de-anonymizes those arguments immediately. The tool executes with real values.  
2. **Tool → LLM (tool results):** The tool returns real data. Tool result messages are included in the anonymization pass — when they appear in the *next* `chatComplete` call's `messages` array, `beforeCompletion` anonymizes their content before the connector sees them. There is no path from tool result to LLM that bypasses `chatComplete`.

The result: the LLM never receives raw PII from either direction. Tool results do sit in agent memory as real data between the tool's return and the next `chatComplete` call; that is an in-process exposure window, not a network exposure.

### Token map — call-scoped, stateless

The inference plugin creates an `AnonymizationContext` at the start of each `chatComplete` call and discards it when the call returns. It holds:

1. **A derived salt:** `HMAC(serverSecret, sessionId)` — where `serverSecret` is `xpack.inference.anonymization.encryptionKey`, a dedicated keystore secret. Same result on any Kibana node, across restarts, because both inputs are stable. No session affinity needed. No TTL. No eviction.  
2. **A token map:** `Map<token, original>` accumulated during the `beforeCompletion` pass, read during `afterCompletion`.

Token format: `ENTITY_CLASS_<32 hex chars>` (e.g. `IP_a3f2c1d809e64b275fae2a8c9b1d04e7`). Because the salt is derived rather than stored, `192.168.1.50` produces `IP_a1b2…` in turn 1 and `IP_a1b2…` in turn 5 — even if the Kibana process restarted between them.

**Token map lifecycle:**

| Phase | What happens |
| :---- | :---- |
| `chatComplete` called | `AnonymizationContext { salt, tokenMap: new Map() }` created |
| `beforeCompletion` runs | `ai.pii` step detects PII in messages \+ system prompt; writes `token → original` into the map |
| Instruction injection | If `tokenMap.size > 0`, a `[Anonymization context]` block is appended to the system prompt (omitted on pass-through — zero overhead when no PII found) |
| Connector call | LLM sees only tokens |
| `afterCompletion` runs | `transform.pii_restore` restores originals in the text response; `restoreInValue` separately de-anonymizes tool call arguments |
| `chatComplete` returns | `AnonymizationContext` is garbage-collected |

When PII is detected, a short instruction block is appended to the system prompt telling the LLM that opaque tokens like `EMAIL_a3f2…` are placeholders — not values to interpret or reveal. Without it, the model may hallucinate what a token represents, attempt to infer the original, or refuse to use it in tool calls. The block (referred to as `[Anonymization context]` in the implementation) lists only the entity types present in the current call (`IP`, `EMAIL`, etc.) and is omitted entirely when no PII is found — it adds approximately 150 tokens when active.

### Default YAML workflows

Two workflows ship pre-seeded into `.kibana-workflows` on startup, both with `enabled: false`:

```
# Before-completion anonymization
version: '1'
name: Default PII Anonymization (before completion)
triggers:
  - type: inference.beforeCompletion
steps:
  - name: anonymize_system
    type: ai.pii
    if: 'event.system'
    with:
      sessionId: '{{ event.sessionId }}'
      input: '{{ event.system }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: anonymize_messages
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ event.messages }}'   # ${{ }} preserves array type; {{ }} coerces to string
      entities: [IP, EMAIL, HOST_NAME]

  - name: emit_output
    type: workflow.output
    with:
      sessionId: '{{ event.sessionId }}'   # passed through so chained workflows share the same AnonymizationContext
      system: '${{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'
```

```
# After-completion de-anonymization
version: '1'
name: Default PII De-anonymization (after completion)
triggers:
  - type: inference.afterCompletion
steps:
  - name: deanonymize_response
    type: transform.pii_restore
    with:
      input: '{{ event.response }}'
```

Both system prompt and messages are anonymized. System prompts can contain PII when callers embed user-configurable strings (space names, agent descriptions, tool definitions referencing URLs). Leaving the system prompt unprocessed would create a bypass.

### New step types

**`ai.pii`** — detects PII using configured regex patterns, replaces each match with a deterministic HMAC token, writes `token → original` into the call-scoped token map. Supports built-in entity types (`IP`, `EMAIL`, `HOST_NAME`) and custom patterns:

```
customPatterns:
  - pattern: 'EMP_\d{6}'
    entityClass: EMPLOYEE_ID
  - pattern: 'ACC-[A-Z]{2}\d{8}'
    entityClass: ACCOUNT_NUMBER
```

`action: replace` (default) produces a reversible token. `action: block` drops the match entirely — irreversible, no token map entry.

**`transform.pii_restore`** — reverse pass. Scans input for token patterns, replaces each with its original from the call-scoped token map. No-ops when the map is empty.

### Streaming

`chatComplete` has a streaming sibling. The `afterCompletion` hook runs on the assembled response, but tokens can be split across chunks (e.g. `IP_a1b` cut mid-token). A sliding buffer in the streaming path:

1. Accumulates chunk content.  
2. After each chunk, checks whether the buffer tail is a partial token (regex `/[A-Z][A-Z0-9_]*(?:_[0-9a-f]*)?$/`).  
3. Emits the safe prefix with tokens restored; holds the tail.  
4. On `ChatCompletionMessage` arrival: flushes, runs `afterCompletion` once on the full assembled text.

The buffer sits *above* the `chunksIntoMessage` operator, which already assembles tool-call JSON deltas. Structural boundaries (OpenAI / Anthropic / Bedrock delta shapes) are invisible at this level — only content text token boundaries require the buffer.

## What anonymization does NOT cover

**Field-level allow/anonymize/deny rules** — the approach works at the text level, not the field level. When a tool runs an ESQL query, the results arrive as raw text that gets anonymized on the next `chatComplete` call. It is not possible to say "allow `source.ip` but deny `user.name`" and have that resolve correctly across ESQL aggregations — ESQL operators (`EVAL`, `STATS`, `MV_*`, renames) produce derived columns whose lineage to source fields is unrecoverable without ESQL-native planner support. Field-level rules that seemed to work for alert context would silently fail for tool outputs.

**NER-based detection** — machine-learning–based named entity recognition is deferred. The regex set covers structured PII (IPv4/IPv6 addresses, email addresses, RFC-compliant hostnames). Free-text names, addresses, and similar unstructured PII are not detected.

**In-Kibana data** — only what goes to the LLM is anonymized. Elasticsearch indices, saved objects, and dashboards are unchanged.

**Cross-session correlation** — each `sessionId` scope is independent. Tokens in one conversation do not correlate with tokens in another.

## Benefits

**One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. New consumers do not need to wire it in; the default is protective.

**Stateless, multi-node compatible.** The derived-salt approach eliminates the session-store problem that makes an in-memory design unsuitable for clustered deployments. There is no TTL to tune, no eviction to reason about, and no session affinity requirement in the load balancer.

**Cross-turn token stability without stored state.** Because the salt is derived from a stable keystore secret (`xpack.inference.anonymization.encryptionKey`) and the session ID, the same PII value always produces the same token across turns and across restarts. This is a stronger guarantee than a session store, which loses token history after eviction or restart.

**Fail-closed by default.** If the anonymization workflow fails — misconfigured regex, timeout, plugin error — the inference call is rejected and the user sees a clear error. Raw PII does not silently reach the LLM. Admins who need service continuity over safety can explicitly opt into `failureMode: 'allow_unsafe'`.

**Admin-customizable, not developer-owned.** The regex set is workflow YAML, not code. Admins can add custom patterns, enable or disable rules, and adjust per-space without a code deployment. The authoring surface is the same one they already use for agent workflows.

**Replaces three implementations with one.** After migration, there is a single code path for anonymization across all consumers. Auditing, observability, and failure handling are centralized.

**Tool outputs covered by induction.** Tools that produce raw PII (ESQL rows, retrieval results) do not need separate anonymization hooks. Their output enters the next `chatComplete` call's prompt, where the `beforeCompletion` hook anonymizes the full serialized text — tool output included.

## Drawbacks

**Token overhead per call.** The `[Anonymization context]` system-prompt block injected after the before-hook is approximately 150 tokens per call. Across multiple inference calls within a single agent round (reasoning, tool decision, final response), this is a non-trivial recurring cost. Mitigations: inject once per session via the initial system prompt, or cache and skip when the entity-type set is unchanged between calls in the same round.

**Tools that invoke `chatComplete` internally get a double anonymization cycle.** Some tools call `chatComplete` for sub-tasks (summarization, classification, structured extraction). Each of those calls gets its own `beforeCompletion` / `afterCompletion` pair: the tool's prompt is anonymized, the LLM responds with tokens, and the response is de-anonymized before the tool returns. The tool's result then enters the parent agent's next `chatComplete` call, where the same PII is anonymized again. This is correct behavior — HMAC determinism means `192.168.1.50` produces the same token both times — but it is the cost of placing the boundary at `chatComplete` rather than above it. The alternative (hooks above the inference layer) avoids the double cycle but leaves nested LLM calls unprotected.

**`sessionId` threading is a new caller responsibility.** Callers that want cross-turn token consistency must supply a stable session identifier through `chatComplete`'s metadata. Callers that omit it get a per-call UUID, which means tokens for the same PII value will differ between turns and the response will contain unresolvable tokens if the LLM references a value from a previous turn. The implementation checklist must verify that Agent Builder and Observability AI Assistant thread the correct identifiers.

**System prompt coverage requires care.** System prompts can contain PII when they embed user-configurable strings (space names, agent descriptions, customer URLs). The before hook explicitly anonymizes the system prompt as well as messages. This is correct behavior, but it means callers cannot use system prompts as a backdoor to send unmasked values to the model while keeping the feature enabled.

**Security AI has a legacy bypass path.** The `elastic_assistant` plugin has a feature-flagged path (`inferenceChatModelDisabled`) that instantiates LangChain model classes directly against the actions connector, bypassing the inference plugin entirely. While that flag is live, Security AI sessions on the legacy path receive no anonymization. Closing this gap requires removing the flag and the three `ActionsClientChat*` classes it selects — a coordinated deprecation with the elastic-assistant retirement schedule.

**Streaming adds implementation complexity.** De-anonymizing a streaming response requires a sliding buffer that detects partial HMAC tokens at chunk boundaries (e.g. `IP_a1b` cut mid-token). Because the transform sits above the `chunksIntoMessage` operator, structural concerns (tool-call JSON deltas, connector-specific chunk shapes) are already resolved in [the PoC](https://github.com/elastic/kibana/pull/268994) and do not need separate handling. The main implementation cost is the partial-token detection regex and the flush-on-message logic.

**Fail-closed default will surface errors to users when workflows break.** A misconfigured regex, a workflow timeout, or a startup failure in the anonymization step means the user sees an error instead of a response. This is the correct security behavior, but it means operational teams must monitor workflow health — broken anonymization now directly causes visible service degradation rather than silently passing through.

**No per-call override of failure mode.** The failure policy is set at admin level (per-space). Individual callers cannot relax it per call. This is intentional — it prevents individual consumers from weakening the security posture — but it means a trusted internal pipeline that can tolerate regex outage cannot opt out without an admin-level config change.

**Token-cap per call is new operational surface.** The call-scoped token map has a default cap of 10 000 unique PII values per `chatComplete` call. Exceeding it causes a step failure that flows through `failureMode`. This cap is far harder to hit than a per-session cap (it requires a single prompt to contain more than 10 000 distinct PII values), but it needs monitoring and may require tuning for large-context models.

## Future potential improvements

### NER-based detection via a new `ai.ner` step

The current `ai.pii` step covers structured PII that matches a regex — IP addresses, email addresses, hostnames, and custom patterns an admin provides. It cannot detect unstructured PII like free-text person names, physical addresses, or organisation names. That class of detection requires a machine-learning model running inside Elasticsearch.

Adding NER support would not require changing the overall architecture. The token format, the `AnonymizationContext`, and `transform.pii_restore` are already fully compatible — `ai.ner` would simply write additional entries into the same token map that `ai.pii` writes into today.

What would actually need to change:

- **The inline workflow executor** needs to be given a real Elasticsearch client. Today it deliberately throws if a step tries to query Elasticsearch — an intentional simplification to keep Phase 2 pure in-memory. This is a small, contained change: the caller already has an HTTP request object and can create a scoped ES client from it.  
    
- **A new `ai.ner` step type** would be added to `inference_workflows`. It accepts text or messages and a model ID, calls the Elasticsearch ML inference API, parses the entity spans from the response, and applies the same HMAC token replacement as `ai.pii`.  
    
- **The one-shot legacy settings migration** would be updated to convert `NER` rules from the old `ai:anonymizationSettings` into `ai.ner` steps instead of silently dropping them (the old rules are deliberately preserved in place until this is available).

An admin could then combine regex and NER detection in a single workflow:

```
steps:
  - name: regex_pii
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ event.messages }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: ner_pii
    type: ai.ner
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ steps.regex_pii.output.output }}'
      modelId: '.elser-2'

  - name: emit_output
    type: workflow.output
    with:
      messages: '${{ steps.ner_pii.output.output }}'
```

Both steps write into the same token map, so `transform.pii_restore` in the after-completion workflow handles the full set of replacements without any change.

The main operational consideration is latency: calling an ML model adds a synchronous Elasticsearch round-trip inside the `beforeCompletion` hook. The trigger's 15-second timeout may need to increase for NER-heavy workflows.

### AOP-style "around" hook via `inference.aroundCompletion`

The RFC ships two separate hooks — `beforeCompletion` for anonymization and `afterCompletion` for restoration. An implementation on the `workflow-and-inference-lifecycle-hooks` branch collapses both into a single `inference.aroundCompletion` trigger with two execution paths.

**Default path (streaming).** The YAML contains only `ai.pii` steps. They write anonymized values into the `AnonymizationContext` via `ctx.setField`. After the hook returns, `invokeAroundCompletion` reads those values, appends the anonymization instruction to the system prompt, calls the LLM with streaming enabled, and restores tokens progressively. Admins who only want to configure regex patterns never see the LLM call or restoration mechanics:

```yaml
steps:
  - name: anonymize_system
    type: ai.pii
    if: 'event.system'
    with:
      sessionId: '{{ event.sessionId }}'
      input: '{{ event.system }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: anonymize_messages
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ event.messages }}'
      entities: [IP, EMAIL, HOST_NAME]
```

**Advanced AOP path (buffered, opt-in).** Workflow authors who need custom post-LLM logic can include a `call_site.proceed` step. The executor suspends at that point and returns a checkpoint. `WorkflowsClient.invokeHook` (which already orchestrates suspend/resume) calls the `proceedFn` capability supplied by `invokeAroundCompletion`, which performs the LLM call (buffered). Execution then resumes with the assembled response, and post-proceed steps (e.g. `transform.pii_restore`) run against it:

```yaml
steps:
  - name: anonymize_messages
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ event.messages }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: proceed
    type: call_site.proceed
    with:
      system: '{{ event.system }}'
      messages: '${{ steps.anonymize_messages.output.output }}'

  - name: restore
    type: transform.pii_restore
    with:
      sessionId: '{{ event.sessionId }}'
      input: '{{ steps.proceed.output.response }}'
```

The trade-off: the advanced path loses streaming because the workflow must resume with the full response before post-proceed steps can run. Users opt in explicitly by including `call_site.proceed`; the default path is unaffected.

The operational benefit of the single-trigger design: with two separate workflows there is a risk of a space having `beforeCompletion` enabled but `afterCompletion` disabled. A single `aroundCompletion` workflow cannot have that mismatched pair — the lifecycle is a fixed contract of the trigger.

## Comparison with existing approaches

|  | This RFC (Workflow-Driven at Inference Layer) | Security AI Assistant (legacy) | Observability AI Assistant |
| :---- | :---- | :---- | :---- |
| **Integration point** | `inference.chatComplete` — one site for all consumers | Per-consumer: `elastic_assistant` plugin and `ActionsClientChat*` model classes | At the inference layer, inside the `inference` plugin (`chatComplete` boundary) |
| **State model** | Stateless: derived salt \+ call-scoped token map | UUID-based tokens (`v4()`); conversation replacements loaded at start of each request, new mappings accumulated and persisted back to conversation — same value yields same UUID across turns | In-request token map; deterministic object-hash tokens (same PII → same token, no per-space salt) |
| **Multi-node compatible** | Yes — derived salt is node-independent | Yes — replacements persisted in shared data stream, not local memory | Yes — no stored state |
| **Cross-turn token consistency** | Yes — same `sessionId` \+ `encryptionKey` always yield the same salt and therefore the same token | Yes — replacements saved in conversation document survive restarts and node failures | Yes — deterministic hash produces the same token for the same PII value on every call |
| **Covers tool outputs** | Yes — tool output enters the next `chatComplete` prompt, which is anonymized | Partial — field-level rules on alert context only; tool outputs not covered | Yes — `MessageRole.Tool` messages (response and data) are included in anonymization |
| **Covers tool-internal LLM calls** | Yes — every `chatComplete` call is protected regardless of call depth; same PII gets same token (double cycle, correct behavior) | No — field-level rules do not extend to nested LLM calls | Yes — every `chatComplete` call goes through the same inference-layer pipeline |
| **Coverage** | All `chatComplete` consumers | Security AI only | All `chatComplete` consumers (request-scoped clients) |
| **Shipped to production** | No (proposed) | Yes | Yes |
| **Configurable by admin** | Yes — workflow YAML, per-space | Partial — UI settings for field-level allow/deny rules | Yes — NER and regex rules in Stack Management → Advanced Settings (`ai:anonymizationSettings`) |
| **Fail mode** | Fail-closed by default (admin can opt into fail-open) | Fail-open (PII leaks silently if anonymization errors) | Fail-open — bad regex patterns are caught and silently skipped |
| **Field-level rules** | No (text level only; ESQL lineage gap makes field-level unreliable) | Yes (for alert fields with known lineage) | No |
| **NER support** | No (deferred) | No | Yes (via ML model) |
| **State persistence** | None — call-scoped only | Conversation data stream (`.kibana-elastic-ai-assistant-conversation`) — replacements embedded in conversation documents | None — deterministic tokens provide cross-turn stability without storage |
| **New consumer wiring required** | No | Yes | No — automatic for all request-scoped `chatComplete` consumers |

The key differences from the Observability AI Assistant approach are a fail-closed default (the current implementation is fail-open), per-space workflow authoring in place of a global JSON blob in Advanced Settings, and a session-scoped HMAC salt in place of a global object-hash (which prevents cross-space token correlation). The coverage and cross-turn consistency properties are equivalent. Relative to Security AI's legacy path: this approach requires no per-consumer wiring, covers every LLM call regardless of nesting depth, and derives token stability from an HMAC secret rather than requiring replacements to be stored and loaded per conversation. Security AI is also multi-node compatible (state is in a shared data stream), but its UUID-based tokens are not reproducible without that stored state — a new process with no saved conversation yields different tokens for the same PII values.

## Questions for reviewers

1. **Failure mode:** Fail-closed means a misconfigured regex workflow causes a user-visible error instead of a response. Is that the right trade-off, or should the default be fail-open with audit logging?  
     
2. **SessionId threading:** Callers must pass a stable `sessionId` for cross-turn token consistency. Does this feel like an acceptable caller responsibility, or should the inference plugin handle correlation differently?  
     
3. **Tool output coverage:** The LLM never sees raw PII in either direction of a tool call — tool call arguments are de-anonymized before the tool executes, and tool results are anonymized before the next LLM call. However, real PII values do exist in agent memory between a tool's return and the next `chatComplete` call. Are there logging, tracing, or error-reporting paths in your stack that could capture that in-process state and need to be accounted for?  
     
4. **Admin control surface:** Per-space anonymization is controlled entirely by enabling/disabling the workflow document in Workflow Management. Is a single toggle per space the right granularity, or is there a need for per-agent or per-connector control?  
     
5. **Scope boundary:** This RFC covers only what is sent to the LLM. Cases, dashboards, exports, and emails are explicitly out of scope. Does that boundary match where the team's risk lies, or should the scope be wider?