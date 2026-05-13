# Workflow-Driven LLM Anonymization — Technical Design

**Reading time:** ~20 minutes | [Quick decision brief](./improved_even_shorter_version.md) | [Full RFC](../rfc.md)

---

## TL;DR

Two lifecycle hooks at the one function every Kibana LLM call passes through. Before: PII → opaque tokens. After: tokens → originals. Admins enable a YAML workflow per space. No consumer code changes required.

---

## Decision + Why + Impact

*(Same as the [decision brief](./improved_even_shorter_version.md) — reproduced here so this document stands alone.)*

**What:** Anonymize LLM-bound prompts at the `inference.chatComplete` boundary — the single function all Kibana LLM consumers must call. A `beforeCompletion` hook replaces PII with deterministic tokens before the prompt reaches the connector. An `afterCompletion` hook restores originals in the response before the caller sees them.

**Why here and not elsewhere:**

- Every LLM consumer in Kibana (Agent Builder, Observability AI, Security AI, attack-discovery, AI Rule Creation, Automatic Import) routes through `chatComplete`. One hook covers all of them permanently — new consumers get protection automatically with zero wiring.
- Field-level rules were evaluated and rejected: ESQL operators (`EVAL`, `STATS`, `MV_*`) produce derived columns with no recoverable lineage to source fields. Text-level regex is lineage-agnostic and works correctly for tool outputs.
- The connector layer (below the inference plugin) was also evaluated: connectors are vendor-specific and expose non-uniform message shapes, making a clean hook contract harder to define there.

**Impact by role:** see the [decision brief](./improved_even_shorter_version.md#impact-by-role).

---

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
| --- | --- | --- |
| Agent Builder (research + answer agents) | `InferenceChatModel` → `client.chatComplete` | Yes |
| Observability AI Assistant | `plugins.inference.getClient()` → `chatComplete` directly | Yes |
| Attack Discovery | `inference.getClientWithoutRequest()` → `chatComplete` | Yes |
| SIEM Migrations / Entity Analytics | `inference.getChatModel()` → `InferenceChatModel` → `chatComplete` | Yes |
| AI Rule Creation / Automatic Import | `inference.getClient()` or `InferenceChatModel` → `chatComplete` | Yes |
| Security AI (primary path) | `inference.getChatModel()` → `InferenceChatModel` → `chatComplete` | Yes |
| **Security AI (legacy path)** | `ActionsClientChatOpenAI` / Bedrock / Vertex directly against actions connector | **No — bypasses inference plugin** |

**The Security AI gap** is the one known exception: `elastic_assistant` has a feature-flagged bypass (`inferenceChatModelDisabled`) that skips the inference plugin entirely. Closing it requires removing that flag and the three `ActionsClientChat*` classes it selects — coordinated with the elastic-assistant retirement schedule in Phase 3.

**Tool coverage — two events, not one:** Each tool invocation has two anonymization events covering opposite sides of the call:

1. **LLM → tool (tool call arguments):** The LLM responds with anonymized tool call arguments (tokens). In `afterCompletion`, `restoreInValue` de-anonymizes those arguments immediately (`apply_after_completion_hook.ts:268-271`). The tool executes with real values.
2. **Tool → LLM (tool results):** The tool returns real data. `get_anonymizable_message_parts.ts:19-23` marks `MessageRole.Tool` messages for anonymization — but only when they appear in the *next* `chatComplete` call's `messages` array, where `beforeCompletion` anonymizes them before the connector sees them. There is no path from tool result to LLM that bypasses `chatComplete`.

The result: the LLM never receives raw PII from either direction. Tool results do sit in agent memory as real data between the tool's return and the next `chatComplete` call; that is an in-process exposure window, not a network exposure.

---

### Token map — call-scoped, stateless

The inference plugin creates an `AnonymizationContext` at the start of each `chatComplete` call and discards it when the call returns. It holds:

1. **A derived salt:** `HMAC(serverSecret, sessionId)` — same result on any Kibana node, across restarts, because both inputs are stable. No session affinity needed. No TTL. No eviction.
2. **A token map:** `Map<token, original>` accumulated during the `beforeCompletion` pass, read during `afterCompletion`.

Token format: `ENTITY_CLASS_<32 hex chars>` (e.g. `IP_a3f2c1d809e64b275fae2a8c9b1d04e7`). Because the salt is derived rather than stored, `192.168.1.50` produces `IP_a1b2…` in turn 1 and `IP_a1b2…` in turn 5 — even if the Kibana process restarted between them.

**Token map lifecycle:**

| Phase | What happens |
| --- | --- |
| `chatComplete` called | `AnonymizationContext { salt, tokenMap: new Map() }` created |
| `beforeCompletion` runs | `ai.pii` step detects PII in messages + system prompt; writes `token → original` into the map |
| Instruction injection | If `tokenMap.size > 0`, a `[Anonymization context]` block is appended to the system prompt (omitted on pass-through — zero overhead when no PII found) |
| Connector call | LLM sees only tokens |
| `afterCompletion` runs | `transform.pii_restore` restores originals in the text response; `restoreInValue` separately de-anonymizes tool call arguments |
| `chatComplete` returns | `AnonymizationContext` is garbage-collected |

**`[Anonymization context]` system prompt block:** approximately 150 tokens per call. Without it, the LLM encounters tokens like `EMAIL_a3f2…` with no context and may hallucinate what they mean, try to infer the original, or refuse to use them in tool calls. The block lists only entity types present in this call (`IP`, `EMAIL`, etc.) so the LLM knows not to interpret or reveal them.

---

### Default YAML workflows

Two workflows ship pre-seeded into `.kibana-workflows` on startup, both with `enabled: false`:

```yaml
# Before-completion anonymization
version: '1'
name: Default PII Anonymization (before completion)
triggers:
  - type: inference.beforeCompletion
steps:
  - name: anonymize_system
    type: ai.pii
    if: 'event.system != null'
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
      system: '${{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'
```

```yaml
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

---

### New step types

**`ai.pii`** — detects PII using configured regex patterns, replaces each match with a deterministic HMAC token, writes `token → original` into the call-scoped token map. Supports built-in entity types (`IP`, `EMAIL`, `HOST_NAME`, `USER_NAME`) and custom patterns:

```yaml
customPatterns:
  - pattern: 'EMP_\d{6}'
    entityClass: EMPLOYEE_ID
  - pattern: 'ACC-[A-Z]{2}\d{8}'
    entityClass: ACCOUNT_NUMBER
```

`action: replace` (default) produces a reversible token. `action: block` drops the match entirely — irreversible, no token map entry.

**`transform.pii_restore`** — reverse pass. Scans input for token patterns, replaces each with its original from the call-scoped token map. No-ops when the map is empty.

---

### Streaming

`chatComplete` has a streaming sibling. The `afterCompletion` hook runs on the assembled response, but tokens can be split across chunks (e.g. `IP_a1b` cut mid-token). A sliding buffer in the streaming path:

1. Accumulates chunk content.
2. After each chunk, checks whether the buffer tail is a partial token (regex `/[A-Z][A-Z0-9_]*(?:_[0-9a-f]*)?$/`).
3. Emits the safe prefix with tokens restored; holds the tail.
4. On `ChatCompletionMessage` arrival: flushes, runs `afterCompletion` once on the full assembled text.

The buffer sits *above* the `chunksIntoMessage` operator, which already assembles tool-call JSON deltas. Structural boundaries (OpenAI / Anthropic / Bedrock delta shapes) are invisible at this level — only content text token boundaries require the buffer.

---

## Plugin dependency graph

```
workflowsExtensions        (OSS — zero inference/AI knowledge)
         ↑
   inference               (optional dep on workflowsExtensions; calls invokeHook at chatComplete)
         ↑
   inference_workflows     (x-pack; registers trigger defs + ai.pii + transform.pii_restore)
         ↑
   workflowsManagement     (seeds default workflows; optional dep on inference_workflows)
         ↑
   agent_builder           (deps on inference + workflowsExtensions + inference_workflows)
```

`inference_workflows` is a new plugin specifically to break the circular dependency that would arise if `workflowsExtensions` registered AI-aware step types (it would then depend on `inference`), while `inference` also depends on `workflowsExtensions` for `invokeHook`.

---

## Risks and trade-offs

### Accepted trade-offs

**Tool results in agent memory between calls.** Between the moment a tool returns (real values, including PII) and the moment those values appear in the next `chatComplete` call's messages, the data sits in-process with real PII. This is an in-memory exposure within the Kibana server process, not a network exposure — the data never reaches the LLM unprotected. The boundary is intentional: tools execute with real values so that Elasticsearch queries, retrieval calls, and other non-LLM operations work correctly.

**Tools that call the LLM internally go through two anonymization cycles per user turn.** A summarization or classification tool that calls `chatComplete` internally gets its own before/after hook pair. The same PII value is anonymized, used in the tool's LLM call, de-anonymized, returned to Agent Builder as a real value, then re-anonymized in the parent agent's next prompt. HMAC determinism guarantees the same token both times. This is the correct behavior, not a bug — but it is an implicit per-turn cost.

**System prompt anonymization.** System prompts are anonymized alongside messages. Callers that embed real values in system prompts expecting them to function as trusted instructions will have those values replaced with tokens. This is the correct security behavior, but it may surprise callers who assumed the system prompt was a privileged channel.

**`sessionId` threading is a new caller responsibility.** Callers that want cross-turn token stability must pass a stable identifier. Omitting it is safe (per-call UUID is used as fallback, anonymization still works) but tokens for the same value will differ between turns.

### Active risks to track

**Security AI legacy path.** `inferenceChatModelDisabled: true` routes through `ActionsClientChat*` classes, bypassing the inference plugin. As long as any production deployment can hit this path, Security AI anonymization is incomplete. Phase 3 must verify this flag is always `false` in production before deleting it.

**Phase 1 race condition on `AnonymizationContext` registry.** The context is stored in a per-session module-level map for the duration of hook invocation. Two concurrent `chatComplete` calls sharing the same `sessionId` on the same node will race. Acceptable in Phase 1 (Agent Builder drives sequential calls), but must be fixed before production by threading the context through the workflow engine's per-execution context.

**Fail-closed creates visible user errors.** A misconfigured regex, a workflow timeout, or a bug in `ai.pii` causes a user-visible "Anonymization unavailable" error instead of a response. This is the right security behavior, but ops teams must monitor workflow health — broken anonymization now causes direct service degradation rather than silently passing through.

**150-token overhead per call.** The `[Anonymization context]` system prompt instruction adds ~150 tokens per `chatComplete` call. Across reasoning, tool-decision, and final-response calls in a single agent round (the runner can issue several), this is non-trivial. Mitigations: inject once per session, or cache and skip when entity types are unchanged between calls in the same round.

---

## Key design decisions

| Decision | Choice | Rejected alternatives |
| --- | --- | --- |
| Hook placement | `chatComplete` boundary | Per-consumer wiring (high miss risk, new consumers must opt in); connector layer (vendor-specific shapes, harder to unify) |
| State model | Derived salt + call-scoped token map | Session store (node-local, breaks multi-node, requires TTL/eviction); caller-passed map (new contract burden on every consumer) |
| Sync hook API | Optional `sync` block on `registerTriggerDefinition` | Separate `registerHookDefinition()` method (two APIs, two registries, authors must know which is which) |
| Default workflow | Shipped off, admin enables | On by default (behavior change for existing deployments); admin must author from scratch (anonymization off until someone acts; bad security default) |
| Failure mode | Fail-closed, admin opt-in to `allow_unsafe` | Fail-open (silent PII leak, no caller-side signal — defeats the feature's purpose) |
| Step type ownership | `inference_workflows` x-pack plugin | Inside `workflowsExtensions` (creates circular dependency; pollutes generic OSS framework with AI concepts) |

---

## Migration phases

**Phase 1 (additive, dark):** workflow engine gets `invokeHook` + sync trigger support; inference plugin gets the hook wrapping behind a feature flag (`xpack.inference.anonymization.experimental_workflow_driven: false` default). `ai.pii` and `transform.pii_restore` step types land. No user-visible change.

**Phase 2 (shipped, disabled by default):** Default YAML workflows seeded into `.kibana-workflows` with `enabled: false`. Inline executor added to execution engine. `WorkflowsClient.invokeHook` routes to inline executor for triggers marked `inlineExecution: true`. One-shot migration imports regex rules from `ai:anonymizationSettings`. Agent Builder `conversationId` threading added.

**Phase 3 (remove deprecated code):** Delete all eight existing anonymization implementations. Remove `inferenceChatModelDisabled` flag and `ActionsClientChat*` classes. Remove feature flag from inference plugin.

---

## Questions for reviewers

1. **The Security AI legacy path** (`inferenceChatModelDisabled`) is a known gap. Is the plan to remove it in Phase 3 — coordinated with elastic-assistant retirement — the right sequencing, or should it block Phase 1/2 from shipping?

2. **Fail-closed as the default** will cause visible service errors when workflows break. Given that admins must actively enable the feature, is there an argument that the default *after opt-in* should be fail-open, with fail-closed as the stricter opt-in? Or is fail-closed the right mandatory default regardless?

3. **Observability of in-process PII:** The LLM never sees raw PII in either direction of a tool call. Real values do exist in agent memory between a tool's return and the next `chatComplete` call. Are there logging, tracing, or error-reporting paths in your stack that capture in-process agent state, and if so, do they need to be explicitly excluded from this data?

4. **The `[Anonymization context]` system prompt instruction** adds ~150 tokens per `chatComplete` call — including tool-decision and reasoning calls within a single agent round. Has the per-call cost been measured against your expected workloads, and does it need to be mitigated before Phase 2 ships?

5. **Per-space control** via the workflow `enabled` toggle is the only admin granularity. Is there a realistic need for per-agent or per-connector granularity, or is per-space sufficient for the deployment scenarios you're planning for?
