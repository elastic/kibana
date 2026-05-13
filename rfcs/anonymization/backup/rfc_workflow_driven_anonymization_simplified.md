# Workflow-Driven LLM Anonymization — Simplified Overview

> This document explains the approach, its architecture, and its trade-offs in plain terms.
> The full design is in [`rfc_workflow_driven_anonymization.md`](./rfc_workflow_driven_anonymization.md).

## The proposed approach

Place a single AOP-style "around" synchronous lifecycle hook at the **`inference` plugin's `chatComplete` boundary** — the one function every LLM call in Kibana must pass through. A single `aroundCompletion` workflow anonymizes the full prompt (system prompt + all messages) in its pre-proceed steps, then a special `call_site.proceed` step marks where the real LLM call executes, and post-proceed steps restore originals in the response before it reaches the caller.

Anonymization itself is driven by workflow steps (`ai.pii`, `transform.pii_restore`) authored in the same YAML surface admins already use for other agent workflows. A default workflow ships with the standard PII patterns (IP addresses, email addresses, hostnames) enabled when the admin toggles the feature on.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, attack-discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

## Changes by plugin

### Generic workflow framework
_`@kbn/workflows-extensions` — the OSS plugin that owns trigger and step registration (modified)_

Gains the concept of a **synchronous hook** — a trigger that blocks the caller until all subscribed workflows have run and returns their combined output. Previously all triggers were fire-and-forget. The sync variant adds a timeout, a failure policy, and a chained execution mode where each workflow receives the previous one's output rather than the original event.

A small addition to the public contract lets the workflow runner manage a per-session capability store directly, which is needed so step types can access call-scoped state (the anonymization context) without it leaking through the YAML.

### Inline workflow executor
_`@kbn/workflows-execution-engine` — the x-pack plugin that runs workflow steps (modified)_

A lightweight in-process runner that evaluates YAML workflow steps one by one, using the existing templating engine for expressions and condition guards. It runs entirely in memory — no background jobs, no database writes. This is what makes synchronous hook execution fast enough to sit in the hot path of every LLM call.

### Workflow management
_`@kbn/workflows-management` — the OSS plugin that stores and orchestrates workflows (modified)_

**Hook invocation.** When a hook fires, the workflow management layer looks up which workflows in the current space are subscribed to that hook and have been enabled by the admin. It runs them in sequence using the inline executor, threading each workflow's output into the next. If no workflows are enabled it falls back gracefully.

**Default workflow seeding.** On startup, a single default workflow is written into the workflow store if it does not already exist — the `aroundCompletion` workflow that handles both anonymization (pre-proceed steps) and de-anonymization (post-proceed steps) in one YAML document. It is seeded as disabled so nothing changes for existing deployments until an admin explicitly turns it on. If an admin has previously deleted it, it is not recreated. If the bundled YAML has been updated (e.g. a bug fix), the stored copy is updated while preserving admin-controlled settings like the enabled state.

**Legacy settings migration.** A one-shot migration runs on first startup after upgrade: it reads any regex-based anonymization rules the admin previously configured in the Observability AI Assistant settings page (Stack Management → Advanced Settings → Observability) and imports them into the seeded around-completion workflow. This runs once and does not repeat.

### Inference lifecycle registrations and step types
_`@kbn/inference-workflows` — x-pack plugin that bridges inference and workflows (new); ships the default workflow YAML via `@kbn/default-anonymization-workflows` content package (new)_

Registers the single `inference.aroundCompletion` hook definition with the framework — specifying its input and output shapes, timeout, and failure policy. Registering here rather than inside the inference plugin itself keeps the generic workflow framework free of AI and inference knowledge.

Also registers the step types that workflows use:

**`ai.pii`** — detects PII in the prompt using configured regex patterns and replaces matches with deterministic HMAC-SHA256 tokens (`IP_a1b2c3…`, `EMAIL_d4e5f6…`). Each match is recorded in the call-scoped token map. Supports a list of built-in entity types plus custom regex patterns with a caller-defined label (`customPatterns`). An optional `action: block` drops the match entirely rather than tokenizing it.

**`transform.pii_restore`** — the reverse pass. Scans input for known tokens and replaces each one with its original value from the call-scoped token map.

### Inline workflow executor
_`@kbn/workflows-execution-engine` — the x-pack plugin that runs workflow steps (modified)_

The executor gains **suspend/resume support** for the `call_site.proceed` sentinel step. When the step is encountered, the executor saves a checkpoint containing the accumulated execution context and the rendered `with` values, and returns a `suspended` status. The workflow management layer then calls the proceed function (the real LLM call), and resumes the executor with the response injected as `steps.proceed.output`.

### Inference plugin
_`@kbn/inference` — the x-pack plugin every LLM call in Kibana passes through (modified)_

The `chatComplete` call is wrapped to fire the single `aroundCompletion` hook, which suspends at `call_site.proceed` while the inference plugin executes the real connector call. The detailed flow is described in the next section.

## How it works

### The `aroundCompletion` hook

When a caller invokes `chatComplete`, the inference plugin fires the `aroundCompletion` hook. The hook runs any workflows subscribed to `inference.aroundCompletion` — by default, the default anonymization workflow. That workflow:

**Pre-proceed steps:**
1. Detects PII in the serialized messages and system prompt using configured regex patterns.
2. Replaces each match with a deterministic HMAC-SHA256 token: `IP_a1b2c3…`, `EMAIL_d4e5f6…`, `HOST_NAME_g7h8i9…`.
3. Writes each `token → original` pair to a call-scoped token map.
4. Suspends at `call_site.proceed`, passing the anonymized system/messages as the proceed input.

**LLM call (via `call_site.proceed`):** The inference plugin receives the anonymized system/messages, appends a short `[Anonymization context]` instruction to the system prompt if any tokens were produced (telling the LLM what tokens are, listing only the entity types present, and instructing it not to guess or reveal the originals), and calls the connector. The LLM response is returned to the workflow as `steps.proceed.output.response`.

**Post-proceed steps:**
5. Scans the LLM response for tokens and restores originals using the call-scoped token map.

The `[Anonymization context]` instruction is infrastructure-owned and automatic — not part of the workflow YAML. Without it the LLM encounters tokens like `EMAIL_a3f2c1…` with no context and may hallucinate what they represent, try to "fill them in", or refuse to use them in tool calls on the grounds that they look like placeholders. The instruction is omitted entirely when no tokens were produced (pass-through), so there is zero overhead when anonymization is off.

**Token cost.** The default instruction is approximately 150 tokens per call. Across multiple inference calls within a single agent round (reasoning, tool decision, final response), this is a non-trivial recurring overhead worth measuring. If cost becomes prohibitive: (a) ship a shorter instruction once per session via the initial system prompt rather than per call, or (b) cache and skip when the entity-type set is unchanged between calls in the same round.

**Customizing the instruction.** Workflow authors who want different wording set `systemPromptInstruction` on the `ai.pii` step input. The step echoes it through to its output and the inference plugin uses it instead of the auto-generated default. Most workflows should leave this unset.

### The `AnonymizationContext` (call-scoped)

The inference plugin creates an `AnonymizationContext` at the start of each `chatComplete` call. It holds two things:

- A **derived salt**: `HMAC(serverSecret, sessionId)` — computed from a stable Kibana keystore value and the caller-supplied session identifier.
- A **token map**: an in-memory `Map<token, original>` accumulated during the pre-proceed steps.

The context is passed as a capability to the `aroundCompletion` hook. It is never visible to workflow YAML and is garbage-collected when the call returns. No database, no TTL, no eviction — state lives for exactly the duration of one request.

For streaming responses, the inference plugin wraps the response in a sliding buffer that holds the tail of each emitted chunk long enough to detect whether it ends with a partial HMAC token (e.g. `IP_a1b` cut mid-token). The safe prefix is emitted with tokens restored; the tail is held until the next chunk resolves it. Structural concerns (tool-call JSON deltas) are handled upstream by the `chunksIntoMessage` operator and are invisible at this level.

### Token determinism across conversation turns

The salt is derived from `HMAC(serverSecret, sessionId)`. Because this is a pure function of two stable inputs — the Kibana secret (consistent across restarts) and the caller's session identifier (stable across turns) — the same PII value always produces the same token:

- `192.168.1.50` becomes `IP_a1b2c3…` in turn 1 and `IP_a1b2c3…` in turn 5.
- This holds across any Kibana node — no session affinity required.
- This holds across process restarts — the salt is re-derived, not stored.

Callers that want cross-turn consistency must pass a stable `sessionId` in `chatComplete`'s metadata. Agent Builder can use its `conversationId`; single-shot consumers (like attack-discovery) can use a per-call UUID without issue.

### Token map lifecycle

| Phase | What happens |
|---|---|
| `chatComplete` is called | Inference plugin creates `AnonymizationContext { salt, tokenMap: new Map() }` |
| `aroundCompletion` hook runs (pre-proceed) | `ai.pii` step detects PII, replaces with tokens, writes `token → original` into `tokenMap`; workflow suspends at `call_site.proceed` with anonymized system/messages |
| Instruction injection | If `tokenMap.size > 0`, inference plugin appends `[Anonymization context]` block to the system prompt listing entity types present; omitted on pass-through |
| Connector call (`call_site.proceed`) | LLM sees only tokens and the anonymization instruction; context is held in-memory during the call; response returned to workflow as `steps.proceed.output.response` |
| `aroundCompletion` hook resumes (post-proceed) | `transform.pii_restore` step reads `tokenMap`, restores originals in response; `restoreInValue` also restores tool call arguments outside the hook |
| `chatComplete` returns | `AnonymizationContext` is discarded; `tokenMap` is garbage-collected |

## Configuration

Admins configure anonymization through the workflow authoring UI. The default workflow ships ready-to-use:

```yaml
# Default around-completion anonymization (seeded with enabled: false — admin enables in UI)
version: '1'
name: Default PII Anonymization (around completion)
triggers:
  - type: inference.aroundCompletion

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
      # ${{ }} calls evalValueSync which preserves the array type.
      # {{ }} calls renderSync which coerces arrays to a string.
      input: '${{ event.messages }}'
      entities:
        - IP
        - EMAIL
        - HOST_NAME

  - name: proceed
    type: call_site.proceed
    with:
      sessionId: '{{ event.sessionId }}'
      # ${{ }} returns null when anonymize_system was skipped; invoke_around_completion.ts
      # falls back to the original system prompt via the ?? operator.
      system: '${{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'

  - name: restore
    type: transform.pii_restore
    with:
      sessionId: '{{ event.sessionId }}'
      input: '{{ steps.proceed.output.response }}'

  - name: emit_output
    type: workflow.output
    with:
      response: '${{ steps.restore.output.output }}'
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

1. **`xpack.inference.anonymization.experimental_workflow_driven: true`** and **`xpack.inference.anonymization.experimental_around_hook: true`** in `kibana.yml`. Both default to `false` so the new code does not affect existing deployments. They will be removed once the workflow-driven path is stable and ready to become the default.
2. **Enable the seeded workflow** in the Workflow Management UI for the relevant space. The default workflow is seeded on startup with `enabled: false`, so the hook is a no-op until explicitly enabled.

Each workflow document belongs to exactly one space (`spaceId` field), so enabling a workflow in space A has no effect on space B. No workflow IDs need to be configured separately — the existing `enabled` toggle is the only control surface needed.

## What anonymization does NOT cover

**Field-level allow/anonymize/deny rules** — the approach works at the text level, not the field level. When a tool runs an ESQL query, the results arrive as raw text that gets anonymized on the next `chatComplete` call. It is not possible to say "allow `source.ip` but deny `user.name`" and have that resolve correctly across ESQL aggregations — ESQL operators (`EVAL`, `STATS`, `MV_*`, renames) produce derived columns whose lineage to source fields is unrecoverable without ESQL-native planner support. Field-level rules that seemed to work for alert context would silently fail for tool outputs.

**NER-based detection** — machine-learning–based named entity recognition is deferred. The regex set covers structured PII (IPv4/IPv6 addresses, email addresses, RFC-compliant hostnames). Free-text names, addresses, and similar unstructured PII are not detected.

**In-Kibana data** — only what goes to the LLM is anonymized. Elasticsearch indices, saved objects, and dashboards are unchanged.

**Cross-session correlation** — each `sessionId` scope is independent. Tokens in one conversation do not correlate with tokens in another.

**Content inside tool execution** — tools that call Elasticsearch do so with real values and return real data. That data is anonymized when it enters the *next* `chatComplete` call's prompt. The tool itself — the ESQL query, the retrieval call — operates on unmasked data.

**Tools that make LLM calls through the inference plugin get double anonymization cycles.** Some tools internally call `chatComplete` to perform summarization, classification, or other LLM-assisted operations. Each of those calls gets its own `beforeCompletion` / `afterCompletion` pair — the tool's query is anonymized, the LLM responds with tokens, and the response is deanonymized before the tool returns its result to Agent Builder. Agent Builder then incorporates those real values into the next parent `chatComplete` call, where they are anonymized again. The same PII value therefore passes through the anonymization cycle twice in a single user turn: once inside the tool's LLM call, and once in the parent agent's follow-up call. This is correct behavior — HMAC determinism means `192.168.1.50` produces the same token both times — but it is a natural cost of placing the integration point at the `chatComplete` boundary rather than above it.

This is a direct trade-off against the Agent Builder hooks approach, where the hooks sit above the inference plugin. In that approach, `afterInference` deanonymizes the LLM's response before the tool is dispatched. The tool then calls `chatComplete` with real values, and because the inference plugin has no hooks in that design, the tool's LLM call passes raw PII straight to the model with no protection. The inference-layer approach pays the cost of double processing; the Agent Builder hooks approach pays the cost of an unprotected nested LLM call.

## Benefits

**One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. New consumers do not need to wire it in; the default is protective.

**Stateless, multi-node compatible.** The derived-salt approach eliminates the session-store problem that made the previous in-memory design unsuitable for clustered deployments. There is no TTL to tune, no eviction to reason about, and no session affinity requirement in the load balancer.

**Cross-turn token stability without stored state.** Because the salt is derived from a stable server secret and the session ID, the same PII value always produces the same token across turns and across restarts. This is a stronger guarantee than a session store, which loses token history after eviction or restart.

**Fail-closed by default.** If the anonymization workflow fails — misconfigured regex, timeout, plugin error — the inference call is rejected and the user sees a clear error. Raw PII does not silently reach the LLM. Admins who need service continuity over safety can explicitly opt into `failureMode: 'allow_unsafe'`.

**Admin-customizable, not developer-owned.** The regex set is workflow YAML, not code. Admins can add custom patterns, enable or disable rules, and adjust per-space without a code deployment. The authoring surface is the same one they already use for agent workflows.

**Replaces eight inconsistent implementations with one.** After migration, there is a single code path for anonymization across all consumers. Auditing, observability, and failure handling are centralized.

**Tool outputs covered by induction.** Tools that produce raw PII (ESQL rows, retrieval results) do not need separate anonymization hooks. Their output enters the next `chatComplete` call's prompt, where the `beforeCompletion` hook anonymizes the full serialized text — tool output included.

## Drawbacks

**`sessionId` threading is a new caller responsibility.** Callers that want cross-turn token consistency must supply a stable session identifier through `chatComplete`'s metadata. Callers that omit it get a per-call UUID, which means tokens for the same PII value will differ between turns and the response will contain unresolvable tokens if the LLM references a value from a previous turn. The implementation checklist must verify that Agent Builder and Observability AI Assistant thread the correct identifiers.

**System prompt coverage requires care.** System prompts can contain PII when they embed user-configurable strings (space names, agent descriptions, customer URLs). The before hook explicitly anonymizes the system prompt as well as messages. This is correct behavior, but it means callers cannot use system prompts as a backdoor to send unmasked values to the model while keeping the feature enabled.

**Security AI has a legacy bypass path.** The `elastic_assistant` plugin has a feature-flagged path (`inferenceChatModelDisabled`) that instantiates LangChain model classes directly against the actions connector, bypassing the inference plugin entirely. While that flag is live, Security AI sessions on the legacy path receive no anonymization. Closing this gap requires removing the flag and the three `ActionsClientChat*` classes it selects — a coordinated deprecation with the elastic-assistant retirement schedule.

**Streaming adds implementation complexity.** De-anonymizing a streaming response requires a sliding buffer that detects partial HMAC tokens at chunk boundaries (e.g. `IP_a1b` cut mid-token). Because the transform sits above the `chunksIntoMessage` operator, structural concerns (tool-call JSON deltas, connector-specific chunk shapes) are already resolved and do not need separate handling. The main implementation cost is the partial-token detection regex and the flush-on-message logic.

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

```yaml
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

## Comparison with existing approaches

| | **This RFC (Workflow-Driven at Inference Layer)** | **Security AI Assistant (legacy)** | **Observability AI Assistant** |
|---|---|---|---|
| **Integration point** | `inference.chatComplete` — one site, one `aroundCompletion` hook | Per-consumer: `elastic_assistant` plugin and `ActionsClientChat*` model classes | At the inference layer, inside the `observability_ai_assistant` plugin |
| **State model** | Stateless: derived salt + call-scoped token map | Session-store (in-memory, per-node) + persistent replacements in system index | In-request state via a streaming deanonymization decorator; no cross-turn correlation |
| **Multi-node compatible** | Yes — derived salt is node-independent | No — in-memory session store is node-local; sticky sessions required | Yes for its own sessions; isolated from other consumers |
| **Cross-turn token consistency** | Yes — same `sessionId` + server secret always yields same salt and therefore same token | Yes — replacements persisted in system index survive restarts | No — session state does not persist across request boundaries |
| **Covers tool outputs** | Yes — tool output enters the next `chatComplete` prompt, which is anonymized | Partial — field-level rules on alert context only; tool outputs not covered | No |
| **Covers tool-internal LLM calls** | Yes — every `chatComplete` call is protected regardless of call depth; same PII gets same token (double cycle, correct behavior) | No — field-level rules do not extend to nested LLM calls | No |
| **Coverage** | All `chatComplete` consumers | Security AI only | Observability AI only |
| **Shipped to production** | No (proposed) | Yes | Yes |
| **Configurable by admin** | Yes — workflow YAML, per-space | Partial — UI settings for field-level allow/deny rules | No — hardcoded |
| **Fail mode** | Fail-closed by default (admin can opt into fail-open) | Fail-open (PII leaks silently if anonymization errors) | Fail-open |
| **Field-level rules** | No (text level only; ESQL lineage gap makes field-level unreliable) | Yes (for alert fields with known lineage) | No |
| **NER support** | No (deferred) | No | Yes (via ML model) |
| **State persistence** | None — call-scoped only | System index for replacements | None |
| **New consumer wiring required** | No | Yes | Yes |

The key trade-off: this approach gives up field-level rules (which were only reliable for alert context with known field lineage anyway) in exchange for complete, consistent coverage of every text path to every LLM — with no per-consumer wiring, no session state, and a single admin control surface.
