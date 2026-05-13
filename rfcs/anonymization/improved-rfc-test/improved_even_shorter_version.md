# Workflow-Driven LLM Anonymization — Decision Brief

**Reading time:** ~4 minutes | [Deeper technical read](./improved_short_version.md) | [Full RFC](../rfc.md)

---

## TL;DR

Two lifecycle hooks at the one function every Kibana LLM call passes through. Before: PII → opaque tokens. After: tokens → originals. Admins enable a YAML workflow per space. No consumer code changes required.

---

## The decision

**What:** Anonymize LLM-bound prompts at the `inference.chatComplete` boundary — the single function all Kibana LLM consumers (Agent Builder, Observability AI Assistant, Security AI, attack-discovery) must call. A `beforeCompletion` hook replaces PII with deterministic tokens before the prompt reaches the connector. An `afterCompletion` hook restores originals in the response before the caller sees them.

**What was ruled out:** Per-field allow/deny rules. ESQL operators (`EVAL`, `STATS`, `MV_*`) produce derived columns with no traceable lineage to source fields. Any field-level rule that appears to work for alert context would silently fail for tool outputs. Text-level matching sidesteps this entirely.

---

## Why this approach

| Problem | How this solves it |
| --- | --- |
| Multiple LLM consumers, all needing anonymization | One hook at `chatComplete` covers all of them — new consumers get protection automatically |
| Field-level rules break on tool output (ESQL lineage gap) | Text-level regex matching is lineage-agnostic |
| In-memory session state fails in multi-node clusters | Salt derived from `HMAC(serverSecret, sessionId)` — same result on any node, no storage needed |
| Silent PII leaks if anonymization breaks | Fail-closed default: broken workflow rejects the call, surfaces an error, never passes raw prompt through |

---

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

---

## What changes (high level)

```
workflows-extensions      → gains concept of a synchronous (blocking) hook
workflows-execution-engine → gains lightweight inline YAML runner (no Task Manager, no DB writes)
inference-workflows (new) → registers hook definitions + ai.pii / transform.pii_restore step types
inference plugin          → wraps chatComplete to call both hooks around the connector
workflowsManagement       → seeds two default workflows on startup (disabled until admin enables)
Agent Builder             → conversationId threaded to chatComplete as sessionId (cross-turn stability)
```

**Removed after migration (Phase 3):**
`inference/chat_complete/anonymization/*`, `anonymization/` plugin, `elastic_assistant` field-level plumbing, `observability_ai_assistant` deanon decorator, `kbn-elastic-assistant-common/data_anonymization/*`

---

## What anonymization does NOT cover

- Data at rest (Elasticsearch indices, saved objects, dashboards)
- Tools that call Elasticsearch directly — their queries run on real data; the results are anonymized when they enter the *next* `chatComplete` prompt
- Named entities (person names, addresses) — NER support is deferred to a future phase; regex covers structured PII (IPs, emails, hostnames)
- The Security AI legacy path (`inferenceChatModelDisabled: true`) — that path bypasses `chatComplete` entirely and must be removed in Phase 3 before anonymization is complete for that consumer

---

## Questions for reviewers

1. **Failure mode:** Fail-closed means a misconfigured regex workflow causes a user-visible error instead of a response. Is that the right trade-off, or should the default be fail-open with audit logging?

2. **SessionId threading:** Callers must pass a stable `sessionId` for cross-turn token consistency. Does this feel like an acceptable caller responsibility, or should the inference plugin handle correlation differently?

3. **Tool output coverage:** The LLM never sees raw PII in either direction of a tool call — tool call arguments are de-anonymized before the tool executes, and tool results are anonymized before the next LLM call. However, real PII values do exist in agent memory between a tool's return and the next `chatComplete` call. Are there logging, tracing, or error-reporting paths in your stack that could capture that in-process state and need to be accounted for?

4. **Admin control surface:** Per-space anonymization is controlled entirely by enabling/disabling the workflow document in Workflow Management. Is a single toggle per space the right granularity, or is there a need for per-agent or per-connector control?

5. **Scope boundary:** This RFC covers only what is sent to the LLM. Cases, dashboards, exports, and emails are explicitly out of scope. Does that boundary match where the team's risk lies, or should the scope be wider?
