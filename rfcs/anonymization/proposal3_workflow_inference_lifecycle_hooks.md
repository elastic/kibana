# Proposal 3: Workflow and Inference Lifecycle Hooks

> This document explains the approach, its architecture, and its trade-offs in plain terms.
> The full design is in [RFC: Workflow-Driven LLM Anonymization at the Inference Layer](./rfc_workflow_driven_anonymization.md).

---

## The proposed approach

Place a single pair of synchronous lifecycle hooks at the **`inference` plugin's `chatComplete` boundary** — the one function every LLM call in Kibana must pass through. A `beforeCompletion` hook anonymizes the full prompt (system prompt + all messages) before it reaches the connector. An `afterCompletion` hook restores originals in the response before it reaches the caller.

Anonymization itself is driven by workflow steps (`ai.pii`, `transform.pii_restore`) authored in the same YAML surface admins already use for other agent workflows. A default workflow ships with the standard PII patterns (IP addresses, email addresses, hostnames) seeded on startup. The admin enables it per-space via the Workflow Management UI.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, attack-discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

---

## How it works

### The `beforeCompletion` hook

When a caller invokes `chatComplete`, the inference plugin fires the `beforeCompletion` hook before the message payload reaches the connector. The hook runs any workflows subscribed to `inference.beforeCompletion` — by default, the default anonymization workflow. That workflow:

1. Detects PII in the serialized messages and system prompt using configured regex patterns.
2. Replaces each match with a deterministic HMAC-SHA256 token: `IP_a1b2c3…`, `EMAIL_d4e5f6…`, `HOST_NAME_g7h8i9…`.
3. Writes each `token → original` pair to a call-scoped token map.

After the hook returns, if any tokens were produced the inference plugin appends a short `[Anonymization context]` instruction to the system prompt. The instruction tells the LLM what tokens are, lists only the entity types actually present in this call, and instructs it not to guess or reveal the original values. This is infrastructure-owned and automatic — not part of the workflow YAML. Without it the LLM encounters tokens like `EMAIL_a3f2c1…` with no context and may hallucinate what they represent, try to "fill them in", or refuse to use them in tool calls on the grounds that they look like placeholders. The instruction is omitted entirely when no tokens were produced (pass-through), so there is zero overhead when anonymization is off.

The inference plugin then sends the anonymized messages and the augmented system prompt to the connector. The connector — and through it the external LLM — sees only tokens.

### The `AnonymizationContext` (call-scoped)

The inference plugin creates an `AnonymizationContext` at the start of each `chatComplete` call. It holds two things:

- A **derived salt**: `HMAC(serverSecret, sessionId)` — computed from a stable Kibana keystore value and the caller-supplied session identifier.
- A **token map**: an in-memory `Map<token, original>` accumulated during the before-hook pass.

The context is threaded internally between the before and after hooks. It is never visible to workflow YAML and is garbage-collected when the call returns. No database, no TTL, no eviction — state lives for exactly the duration of one request.

### The `afterCompletion` hook

After the LLM responds, the inference plugin fires `afterCompletion`. The hook runs the restore workflow, which scans the response for tokens and replaces each one with its original from the call-scoped token map. The caller receives real values everywhere.

For streaming responses, the inference plugin wraps the response in a sliding buffer that holds the tail of each emitted chunk long enough to detect whether it ends with a partial HMAC token (e.g. `IP_a1b` cut mid-token). The safe prefix is emitted with tokens restored; the tail is held until the next chunk resolves it. The transform sits above the `chunksIntoMessage` operator, which already assembles partial tool-call JSON deltas — so only content text token boundaries require the buffer; structural concerns are already resolved upstream.

### Token determinism across conversation turns

The salt is derived from `HMAC(serverSecret, sessionId)`. Because this is a pure function of two stable inputs — the Kibana secret (consistent across restarts) and the caller's session identifier (stable across turns) — the same PII value always produces the same token:

- `192.168.1.50` becomes `IP_a1b2c3…` in turn 1 and `IP_a1b2c3…` in turn 5.
- This holds across any Kibana node — no session affinity required.
- This holds across process restarts — the salt is re-derived, not stored.

Callers that want cross-turn consistency must pass a stable `sessionId` in `chatComplete`'s metadata. Agent Builder threads its `conversationId`; single-shot consumers (like attack-discovery) can use a per-call UUID without issue.

### Token map lifecycle

| Phase | What happens |
|---|---|
| `chatComplete` is called | Inference plugin creates `AnonymizationContext { salt, tokenMap: new Map() }` |
| `beforeCompletion` hook runs | `ai.pii` step detects PII, replaces with tokens, writes `token → original` into `tokenMap` |
| Instruction injection | If `tokenMap.size > 0`, inference plugin appends `[Anonymization context]` block to the system prompt listing entity types present; omitted on pass-through |
| Connector call | LLM sees only tokens and the anonymization instruction; context is held in-memory during the call |
| `afterCompletion` hook runs | `transform.pii_restore` step reads `tokenMap`, restores originals in response |
| `chatComplete` returns | `AnonymizationContext` is discarded; `tokenMap` is garbage-collected |

---

## Configuration

Admins configure anonymization through the workflow authoring UI. Two default workflows are seeded automatically on startup with `enabled: false`. The admin enables them in the Workflow Management UI for the relevant space.

```yaml
# Default before-completion anonymization (seeded with enabled: false — admin enables in UI)
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
      entities:
        - IP
        - EMAIL
        - HOST_NAME

  - name: anonymize_messages
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      # ${{ }} preserves the array type; {{ }} would coerce it to a string
      input: '${{ event.messages }}'
      entities:
        - IP
        - EMAIL
        - HOST_NAME

  - name: emit_output
    type: workflow.output
    with:
      # Pass sessionId through so chained workflows can find the same AnonymizationContext.
      sessionId: '{{ event.sessionId }}'
      # ${{ }} returns null when anonymize_system was skipped; inference plugin falls back
      # to the original system prompt via the ?? operator.
      system: '${{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'
```

```yaml
# Default after-completion de-anonymization (seeded with enabled: false — admin enables in UI)
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

### Adding custom patterns

Admins can extend the default workflow with organization-specific regex patterns by adding entries to `customPatterns`. Each entry requires a `pattern` (regex) and an `entityClass`, which becomes the prefix of the replacement token:

```yaml
  - name: anonymize_messages
    type: ai.pii
    with:
      sessionId: '{{ event.sessionId }}'
      input: '${{ event.messages }}'
      entities:
        - IP
        - EMAIL
        - HOST_NAME
      customPatterns:
        - pattern: 'EMP_\d{6}'
          entityClass: EMPLOYEE_ID
        - pattern: 'ACC-[A-Z]{2}\d{8}'
          entityClass: ACCOUNT_NUMBER
```

`EMP_123456` becomes `EMPLOYEE_ID_a1b2c3…` — the hex suffix is always a deterministic HMAC of the matched value, so the same employee ID produces the same token across every turn in a session.

The `action` field controls what happens to a match:
- `replace` (default) — substitute with the HMAC token; reversible by `transform.pii_restore`
- `block` — drop the match entirely; not reversible, no token map entry

There is no way to specify a custom replacement string (e.g. `[REDACTED]`). The only choices are a deterministic HMAC token or a hard block.

Admins can:
- Add custom regex patterns for organization-specific identifiers (employee IDs, account numbers, internal hostnames).
- Clone the default workflow and modify it rather than editing it in place.
- Author entirely separate workflows for different spaces or agents.
- Disable the default and use only custom rules.

The feature requires two things to activate:

1. **`xpack.inference.anonymization.experimental_workflow_driven: true`** in `kibana.yml`. This is off by default so the new code does not affect existing deployments.
2. **Enable the seeded workflow** in the Workflow Management UI for the relevant space. The two default workflows are seeded with `enabled: false`, so the hook is a no-op until explicitly enabled.

Each workflow document belongs to exactly one space (`spaceId` field), so enabling a workflow in space A has no effect on space B. No workflow IDs need to be configured separately — the existing `enabled` toggle is the only control surface needed.

Enterprise license required, consistent with the legacy Assistant.

---

## What anonymization does NOT cover

**Field-level allow/anonymize/deny rules** — the approach works at the text level, not the field level. When a tool runs an ESQL query, the results arrive as raw text that gets anonymized on the next `chatComplete` call. It is not possible to say "allow `source.ip` but deny `user.name`" and have that resolve correctly across ESQL aggregations — ESQL operators (`EVAL`, `STATS`, `MV_*`, renames) produce derived columns whose lineage to source fields is unrecoverable without ESQL-native planner support. Field-level rules that seemed to work for alert context would silently fail for tool outputs.

**NER-based detection** — machine-learning–based named entity recognition is deferred. The regex set covers structured PII (IPv4/IPv6 addresses, email addresses, RFC-compliant hostnames). Free-text names, addresses, and similar unstructured PII are not detected.

**In-Kibana data** — only what goes to the LLM is anonymized. Elasticsearch indices, saved objects, and dashboards are unchanged.

**Cross-session correlation** — each `sessionId` scope is independent. Tokens in one conversation do not correlate with tokens in another.

**Content inside tool execution** — tools that call Elasticsearch do so with real values and return real data. That data is anonymized when it enters the *next* `chatComplete` call's prompt. The tool itself — the ESQL query, the retrieval call — operates on unmasked data.

---

## Benefits

**One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. New consumers do not need to wire it in; the default is protective.

**Stateless, multi-node compatible.** The derived-salt approach eliminates the session-store problem that made the previous in-memory design unsuitable for clustered deployments. There is no TTL to tune, no eviction to reason about, and no session affinity requirement in the load balancer.

**Cross-turn token stability without stored state.** Because the salt is derived from a stable server secret and the session ID, the same PII value always produces the same token across turns and across restarts. This is a stronger guarantee than a session store, which loses token history after eviction or restart.

**Fail-closed by default.** If the anonymization workflow fails — misconfigured regex, timeout, plugin error — the inference call is rejected and the user sees a clear error. Raw PII does not silently reach the LLM. Admins who need service continuity over safety can explicitly opt into `failureMode: 'allow_unsafe'`.

**Admin-customizable, not developer-owned.** The regex set is workflow YAML, not code. Admins can add custom patterns, enable or disable rules, and adjust per-space without a code deployment. The authoring surface is the same one they already use for agent workflows.

**Replaces eight inconsistent implementations with one.** After migration, there is a single code path for anonymization across all consumers. Auditing, observability, and failure handling are centralized.

**Tool outputs covered by induction.** Tools that produce raw PII (ESQL rows, retrieval results) do not need separate anonymization hooks. Their output enters the next `chatComplete` call's prompt, where the `beforeCompletion` hook anonymizes the full serialized text — tool output included.

---

## Drawbacks

**`sessionId` threading is a new caller responsibility.** Callers that want cross-turn token consistency must supply a stable session identifier through `chatComplete`'s metadata. Callers that omit it get a per-call UUID, which means tokens for the same PII value will differ between turns and the response will contain unresolvable tokens if the LLM references a value from a previous turn. The implementation checklist must verify that Agent Builder and Observability AI Assistant thread the correct identifiers.

**System prompt coverage requires care.** System prompts can contain PII when they embed user-configurable strings (space names, agent descriptions, customer URLs). The before hook explicitly anonymizes the system prompt as well as messages. This is correct behavior, but it means callers cannot use system prompts as a backdoor to send unmasked values to the model while keeping the feature enabled.

**Security AI has a legacy bypass path.** The `elastic_assistant` plugin has a feature-flagged path (`inferenceChatModelDisabled`) that instantiates LangChain model classes directly against the actions connector, bypassing the inference plugin entirely. While that flag is live, Security AI sessions on the legacy path receive no anonymization. Closing this gap requires removing the flag and the three `ActionsClientChat*` classes it selects — a coordinated deprecation with the elastic-assistant retirement schedule.

**Streaming adds implementation complexity.** De-anonymizing a streaming response requires a sliding buffer that detects partial HMAC tokens at chunk boundaries (e.g. `IP_a1b` cut mid-token). The transform sits above the `chunksIntoMessage` operator — structural concerns (tool-call JSON deltas) are resolved upstream and are invisible at this level — but the partial-token detection regex and flush-on-message logic are real implementation cost.

**Fail-closed default will surface errors to users when workflows break.** A misconfigured regex, a workflow timeout, or a startup failure in the anonymization step means the user sees an error instead of a response. This is the correct security behavior, but it means operational teams must monitor workflow health — broken anonymization now directly causes visible service degradation rather than silently passing through.

**No per-call override of failure mode.** The failure policy is set at admin level (per-space). Individual callers cannot relax it per call. This is intentional — it prevents individual consumers from weakening the security posture — but it means a trusted internal pipeline that can tolerate regex outage cannot opt out without an admin-level config change.

**Token-cap per call is new operational surface.** The call-scoped token map has a default cap of 10 000 unique PII values per `chatComplete` call. Exceeding it causes a step failure that flows through `failureMode`. This cap is far harder to hit than a per-session cap (it requires a single prompt to contain more than 10 000 distinct PII values), but it needs monitoring and may require tuning for large-context models.

---

## Comparison with existing approaches

| | **This RFC (Workflow-Driven at Inference Layer)** | **Security AI Assistant (legacy)** | **Observability AI Assistant** |
|---|---|---|---|
| **Integration point** | `inference.chatComplete` — one site for all consumers | Per-consumer: `elastic_assistant` plugin and `ActionsClientChat*` model classes | At the inference layer, inside the `observability_ai_assistant` plugin |
| **State model** | Stateless: derived salt + call-scoped token map | Session-store (in-memory, per-node) + persistent replacements in system index | In-request state via a streaming deanonymization decorator; no cross-turn correlation |
| **Multi-node compatible** | Yes — derived salt is node-independent | No — in-memory session store is node-local; sticky sessions required | Yes for its own sessions; isolated from other consumers |
| **Cross-turn token consistency** | Yes — same `sessionId` + server secret always yields same salt and therefore same token | Yes — replacements persisted in system index survive restarts | No — session state does not persist across request boundaries |
| **Covers tool outputs** | Yes — tool output enters the next `chatComplete` prompt, which is anonymized | Partial — field-level rules on alert context only; tool outputs not covered | No |
| **Coverage** | All `chatComplete` consumers | Security AI only | Observability AI only |
| **Shipped to production** | No (proposed) | Yes | Yes |
| **Configurable by admin** | Yes — workflow YAML, per-space | Partial — UI settings for field-level allow/deny rules | No — hardcoded |
| **Fail mode** | Fail-closed by default (admin can opt into fail-open) | Fail-open (PII leaks silently if anonymization errors) | Fail-open |
| **Field-level rules** | No (text level only; ESQL lineage gap makes field-level unreliable) | Yes (for alert fields with known lineage) | No |
| **NER support** | No (deferred) | No | Yes (via ML model) |
| **State persistence** | None — call-scoped only | System index for replacements | None |
| **New consumer wiring required** | No | Yes | Yes |

The key trade-off: this approach gives up field-level rules (which were only reliable for alert context with known field lineage anyway) in exchange for complete, consistent coverage of every text path to every LLM — with no per-consumer wiring, no session state, and a single admin control surface.
