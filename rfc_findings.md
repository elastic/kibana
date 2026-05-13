# RFC implementation findings (workflow + inference lifecycle hooks)

Branch `workflow-and-inference-lifecycle-hooks`: **committed** work adds sync `invokeHook` / chained handlers in `workflows_extensions`; **in-progress** wiring (as of this note) includes `inference` ⇄ `invokeHook` integration, `inference_workflows`, default YAML in `default-anonymization-workflows`, and related callback/streaming behavior. Findings below reference that combined state.

---

## 1. Streaming de-anonymization: sliding buffer vs. filter-all-chunks

The RFC §4.6 specifies a sliding buffer approach for streaming de-anonymization. The legacy o11y path (`deanonymizeMessage` in the inference plugin) uses a different strategy: it filters out **all** raw chunk events and emits one synthetic complete chunk after the assembled `ChatCompletionMessage` is de-anonymized. This means no content streams to the UI during LLM generation — the full response appears all at once.

The RFC's sliding buffer is the correct production approach. The implementation risk callout in §4.6 about connector-level delta shapes does NOT apply at the level where `applyAfterCompletionHook` operates. The operator sits above `chunksIntoMessage`, which already assembles partial tool-call JSON deltas into complete `toolCalls` objects. The only streaming boundary that needs handling is **content text** (not structural/tool-call boundaries).

**Implemented approach:**
- Per-subscription `holdBuffer` (string, in original anonymized form) accumulates chunk content.
- A partial-token detection regex `/[A-Z][A-Z0-9_]*(?:_[0-9a-f]*)?$/` scans the end of the buffer after each chunk. If a potential partial token is found, the buffer is split: the safe prefix is emitted (with complete tokens restored via `restoreInString`), and the tail is held.
- False positives (e.g. "EMAIL" that turns out not to be a token) cause at most one chunk of latency — acceptable.
- On `ChatCompletionMessage` arrival: flush the buffer, call the `afterCompletion` hook once on the full assembled text, restore tool call arguments with `restoreInValue`, emit a flush chunk (remaining buffer content + restored tool calls as JSON strings) then the de-anonymized assembled message.
- The hook runs exactly once per call, as the RFC specifies. The buffer is an inference-plugin implementation detail invisible to workflow hooks.

**RFC update needed:** §4.6 should clarify that the structural boundary concern (connector-level delta shapes) is only relevant if the transform is placed below `chunksIntoMessage`. Above that operator, only content text boundaries need buffering. This significantly reduces implementation complexity.

---

## 2. Tool call argument restoration is outside the hook payload

The `inference.afterCompletion` payload is `{ sessionId, response: string }` — text only. Tool call argument restoration happens in the inference pipeline *outside* the hook (via `restoreInValue` on the assembled message's `toolCalls`), not inside the hook handler.

**RFC update needed:** §4.5 / the `AfterCompletionEventSchema` description should explicitly state that `toolCalls` restoration is an inference-plugin implementation detail, not part of the hook contract. Workflow hook handlers for `inference.afterCompletion` only need to concern themselves with restoring the `response` text.

---

## 3. HOST_NAME regex false positives in practice

The initial broad hostname pattern `\b[a-zA-Z0-9\-]{3,63}(?:\.[a-zA-Z0-9\-]{1,63})+\b` matched file paths, extensions (`package.json`, `executor.test.ts`, `kibana.jsonc`), dotted identifiers (`platform.core.search`), and path segments (`/skills/security/alerts/alert-analysis/manifest.md`). This caused tool invocation failures like `Entry '…/HOST_NAME_d98569363fcd838d9cea0192fb81ee1b' not found`.

Tightened to a TLD-restricted pattern with a leading-slash/dot negative lookbehind:

```
(?<![/\.])\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|edu|gov|io|ai|co|app|dev|info|biz|me|us|uk|de|fr|jp|cn|in|ru|br|au|ca|nl|se|no|dk|fi|es|it|ch|be|local|internal|corp|lan)\\b
```

Known gap: internal hostnames whose TLD is not in the curated list (e.g. `db1.acme`, `host.k8s`). RFC §4.4 `custom_patterns` is the escape hatch.

**RFC update needed:** Include the curated TLD list and the negative lookbehind as the recommended HOST_NAME pattern. Document the known gap (non-standard TLDs) and the `custom_patterns` escape hatch explicitly in §4.3 (built-in entity rules).

---

## 4. Safety net: tool call restoration is robust to sloppy custom regexes

A sloppy `custom_patterns` entry (e.g. `\w+\.\w+` matching any dotted token) will tokenize file paths and identifiers it shouldn't. The safety net — `restoreInValue` on the assembled message's `toolCalls` using the same session-scoped token map — restores them before any tool is invoked, regardless of how aggressively the regex matched.

This confirms the RFC's fail-closed design: bad regex causes noise in the LLM's view (it sees tokens instead of real values), but does not break tool execution. Admins see the noise in execution traces, which signals that the pattern needs refinement.

**RFC update needed:** §4.4 should state explicitly that tool call argument restoration acts as a safety net for over-broad `custom_patterns`. The safety net is not a justification for sloppy patterns — the LLM's reasoning quality degrades — but it prevents downstream breakage.

---

## 5. Duplicate default rules needed consolidation

`DEFAULT_RULES` / `ENTITY_PATTERNS` were duplicated in `default_handlers.ts` and `steps/pii/ai_pii/index.ts`. A single `default_rules.ts` module was introduced as the interim source of truth, matching the RFC's planned extraction to `@kbn/ai-infra/pii-detection` (RFC line 248).

**RFC update needed:** Line 248 should reference the interim `default_rules.ts` location and clarify the extraction is a Phase 2 step, not a Phase 1 prerequisite.

---

## 6. `AnonymizationContext` capability key and structural compatibility

The `capabilities` map key `'anonymizationContext'` must match between the inference plugin (which creates the `AnonymizationContext` instance) and the workflows_extensions handlers (which consume it via `AnonymizationContextHandle`). The interface is satisfied structurally — no direct cross-plugin import needed. This works correctly.

One subtle issue: `invokeHookInternal` stores the context in a per-session registry for the duration of each hook invocation (for YAML step executors like `ai.pii` to look up). The registry entry is deleted in a `finally` block after each invocation. Two concurrent `chatComplete` calls sharing the same `sessionId` on the same node will race on this registry. This is benign for the POC (Agent Builder drives sequential calls) but must be fixed before production: thread the context through the workflow engine's per-execution context rather than a module-level map.

**RFC update needed:** §4.5 should document the registry race condition as a known Phase 1 limitation and specify the Phase 2 fix (per-execution context threading).

---

## 7. Feature flag default is off — document the opt-in clearly

`xpack.inference.anonymization.enabled` defaults to `false`. The hook path is entirely skipped unless this is set. The RFC should surface the opt-in mechanism more prominently in the deployment/operations section, including the `failureMode` options (`block` vs `allow_unsafe`) and `maxTokensPerCall`.

---

## 8. Architectural decision: `inference_workflows` plugin separates AI domain from extension framework

`workflowsExtensions` is a generic extension framework and should have zero knowledge of inference or AI concepts.
The initial implementation placed AI steps (`ai.prompt`, `ai.classify`, `ai.summarize`), PII steps (`ai.pii`,
`transform.pii_restore`), and anonymization hook handlers inside `workflowsExtensions`, forcing it to depend
on the `inference` plugin. This made a direct `inference → workflowsExtensions` dependency impossible
(cycle), requiring the `AnonymizationHookInvoker` callback workaround.

**Decision:** Introduce a new `inferenceWorkflows` x-pack plugin that owns all inference-specific extensions:
AI steps, PII steps, anonymization context/handlers, and inference trigger registrations.
`workflowsExtensions` becomes a pure framework with no inference knowledge.
`inference` directly depends on `workflowsExtensions` (optional plugin), registers its triggers,
and calls `invokeHook` directly — `registerAnonymizationHookInvoker` is removed.
`agent_builder` depends on all three. The dependency graph is a clean DAG:

```
workflowsExtensions   (pure framework — zero inference/AI knowledge)
        ↑
  inference           (optionally depends on workflowsExtensions; registers triggers, calls invokeHook directly)
        ↑
  inference_workflows (x-pack plugin; hosts AI steps, PII steps, anonymization handlers)
        ↑
  agent_builder       (depends on inference + workflowsExtensions + inferenceWorkflows)
```

**RFC update needed:**
- The architecture diagram in §3 should reflect this three-layer structure: `workflowsExtensions` (framework) ← `inference` (hooks) ← `inference_workflows` (AI/PII extensions) ← `agent_builder`.
- §7.5 ("Step type ownership: shared `workflows_extensions` package") and Appendix A ("New shared step types — in `workflows_extensions`") are now incorrect: `ai.pii` and `transform.pii_restore` live in the `inferenceWorkflows` plugin, not `workflowsExtensions`. Update both to reference `inferenceWorkflows`.

---

## 9. Branch snapshot — what landed vs what the RFC describes

This is a **readiness checklist** for RFC authors: map narrative to the code that exists on this branch (committed `invokeHook` / `TriggerSyncBlock` work **plus** the in-progress inference integration in the working tree).

| RFC idea | Current branch | Notes |
|----------|----------------|--------|
| Sync `invokeHook` + `chained` + `failurePolicy` on trigger definitions | **Aligned** | `workflows_extensions` `invokeHookInternal` implements chained handler loops; triggers registered with `sync` block in `inference_workflows`. |
| `inference.beforePromptSend` / `inference.afterCompletion` | **Aligned** | IDs and Zod schemas live in `workflows_extensions/common/triggers/inference_anonymization.ts`; full definitions registered from `inference_workflows`. |
| Inference passes **capabilities** (e.g. `anonymizationContext`) alongside payload | **Aligned** | `inference` start uses `workflowsExtensions.invokeHook(triggerId, payload, capabilities)` — not the HTTP-scoped `WorkflowsClient.invokeHook` path (that wrapper does not forward `capabilities` today). |
| Default behavior = **user-authored YAML** subscribed to hooks | **Partial** | Default behavior is implemented as **registered TypeScript `HookHandler`s** (`default_handlers.ts`) that mirror the shipped YAML. The `default-anonymization-workflows` package is the **authoring / import** surface (“Import workflow” in UI), not necessarily the runtime path until persisted workflows drive hooks. |
| `ai.pii` / `transform.pii_restore` as reusable steps | **Aligned** | Steps register from `inference_workflows`, look up `AnonymizationContext` via `getSessionCapabilities(sessionId)` during hook execution. |
| Derived salt + call-scoped token map | **Aligned in spirit** | Implementation uses an `AnonymizationContext` handle with salt + map; token format and rules live in `default_rules` / handlers (see §5–6). |
| Feature flag + `failureMode` + `maxTokensPerCall` | **Aligned** | `xpack.inference.anonymization.*` in `inference/server/config.ts`. |
| Agent Builder “zero changes” vs `sessionId` threading | **Verify** | Threading `metadata.anonymization.sessionId` (or equivalent) from chat-round call sites is still an explicit integration check; do not claim zero touch until verified. |

**RFC update needed:** Add a “Phase 1 vs Phase 2 execution model” callout in §4.5 and §8.3:

- **Phase 1 (current branch):** `invokeHook` dispatches to in-memory `HookHandler` chains registered at plugin startup (`defaultBeforePromptSendHandler` / `defaultAfterCompletionHandler` in `inference_workflows`). The shipped YAML (`@kbn/ai-infra/default-anonymization-workflows`) is the portable *spec* of default behavior and the authoring/import surface — not the runtime source of truth. `inference.anonymization.workflowIds` and the per-space admin toggle (RFC §4.5, §Q3) describe **Phase 2 behavior**, not Phase 1.
- **Phase 2 (follow-up work):** `invokeHook` resolves persisted trigger-subscription saved objects and routes matching workflows through the execution engine. The OOTB “anon” workflow becomes a seeded or importable SO that admins see, clone, and edit live. No architectural pivot is required for this transition — only `invokeHook`'s internal resolver changes; the call site in `inference` and the trigger ID contracts are unchanged. See Finding #13.

---

## 10. Clarify *intended use* (product + RFC prose)

Use this language to avoid the common confusion: *“I added PII to my Cases workflow — why did/didn’t inference change?”*

1. **Primary intent — LLM boundary (chat and any other `chatComplete` caller)**  
   When `xpack.inference.anonymization.enabled` is on, **every** qualifying `chatComplete` (and the streaming path wired the same way) runs the **inference triggers**, independent of whether some *other* workflow is running (e.g. “case opened”). There is **no temporal coupling** to unrelated async workflows.

2. **What “workflow” means in the anonymization story**  
   - **Inference lifecycle hooks** = sync triggers `inference.beforePromptSend` / `inference.afterCompletion`.  
   - **Admin customization** = either **code-registered handlers** (POC / defaults) or, when wired, **saved workflows** that the platform executes for those triggers **plus** optional **imported YAML** starting from `default-anonymization-workflows`.  
   Stating this explicitly prevents equating “workflow YAML in repo” with “runs on every LLM call automatically without registration/import.”

3. **Scope is not “global Kibana”**  
   It is **global for model-bound traffic** that uses the inference plugin path. It does **not** redact Elasticsearch documents, case comments, emails, or exports unless those flows **separately** run redaction or call an LLM through the same boundary.

4. **Configuration surface**  
   Call out `failureMode` (`block` vs `allow_unsafe`), `maxTokensPerCall`, and (when present) **per-space / per-agent workflow lists** as the **policy layer** — distinct from “any workflow that mentions PII.”

**RFC update needed:** Add a **“Mental model”** box in §1 or §4 with the four bullets above.

---

## 11. Non-chat use cases — how `ai.pii` *can* be used vs what ships first

The RFC already hints at **log redaction** and other non-LLM workflows. The branch makes the split concrete:

| Use case | Mechanism | Feasibility on this branch |
|----------|-----------|------------------------------|
| **Any feature that calls `chatComplete`** (summarization, classification, NL→ESQL, batch jobs) | Same inference hooks | **Same as chat** — if the call path uses inference and the flag is on, hooks run. “Not only chat” = *not only interactive UI*, not a different hook. |
| **Redact text in an async workflow** (webhook payload, connector action, case automation) | `emitEvent` + workflow steps | **`ai.pii` only helps if execution provides a salt + map (or you only need one-way redaction).** Today, `AnonymizationContext` is injected by **inference** around `invokeHook` for the two inference triggers. Arbitrary triggers do **not** automatically get that capability — steps will error or no-op per step implementation. |
| **One-way masking** (never restore; e.g. archive to a third party) | `ai.pii` without a restore step | **Conceptually valid** if you accept **non-deterministic or separately configured** tokens, or you add **platform support** to create an ephemeral context for that execution. Do not promise cross-system token correlation without defining salt + session semantics. |
| **Deanonymize after an LLM call** | `before` + model + `after` | **This is the shipped design** — restore depends on the **same** call-scoped token map (inference implementation). |

**RFC update needed:**  
- In §4.4 / §7.5, **split “step type registration” from “capability injection”**: `ai.pii` is registered broadly, but **full round-trip anonymization** is **defined** for **inference sync hooks** first.  
- Add a **“Future: generic execution context”** note for non-inference triggers (Case opened, scheduled export) if product wants true reuse without duplicating salt/map wiring.

---

## 13. Phase 2 gap: `invokeHook` today dispatches TypeScript handlers, not saved-object workflows

**What currently executes when `inference.beforePromptSend` fires:**
`invokeHook` iterates in-memory `HookHandler` closures registered at plugin startup (`defaultBeforePromptSendHandler` / `defaultAfterCompletionHandler` in `inference_workflows`). No saved objects are queried; the workflow execution engine is not involved.

**What the RFC §4.5 and product framing describe:**
An admin selects OOTB or custom workflows from a catalog and attaches them to `inference.beforePromptSend` / `inference.afterCompletion` — the same "attach N workflows to hook" UX as guardrails. Editing the workflow in the editor changes production behavior. The YAML (and its saved object) is the source of runtime truth.

**The gap breaks into three concrete pieces:**

1. **Persisted trigger subscriptions.** No saved object type for "workflow X subscribes to trigger Y at priority Z" exists yet. `registerHookHandler` is pure in-memory and ephemeral.
2. **`invokeHook` resolution layer.** Currently iterates only the `HookHandlerRegistry`. Phase 2 adds a second pass: query saved subscriptions via SO client, then dispatch matching workflows to the execution engine. The `invokeHook(triggerId, payload, capabilities)` call site in `inference` is unchanged — this is an internal implementation extension.
3. **OOTB workflow seeding.** The default "anon" workflow must be a seeded or importable SO for admins to discover, clone, and edit in Workflow Management. Currently it is YAML in a package (`@kbn/ai-infra/default-anonymization-workflows`) plus TS handler mirrors in `inference_workflows`.

**No architectural pivot required:**
- Trigger IDs, `invokeHook` signature, `capabilities` pattern, and the plugin DAG are all stable.
- TS handlers remain as the fallback/default layer after Phase 2; they do not disappear.
- The only non-trivial dependency question: `workflowsExtensions` needs the workflow execution engine at hook-dispatch time. If `workflowsManagement` sits above `workflowsExtensions` in the graph, the engine reference must be injected via a startup callback rather than a direct plugin dep. Worth validating before committing to the Phase 2 internal design.

**Practical consequence for current communications:**
The product framing "users attach canned workflows to inference lifecycle hooks" is forward-looking (Phase 2), not a description of what shipped in Phase 1. Saying "anonymization is workflow-driven" is accurate in spirit — the hook platform is real, the YAML is the canonical spec — but "driven by attachable saved-object workflows" is not yet true. Separating these two statements avoids credibility issues when the runtime is inspected.

**RFC update needed:** §4.5 ("Default workflow shipped out of the box"), §10 Q2/Q3, and §8.3 migration phases all describe Phase 2 behavior without marking it as such. Add an explicit Phase 1 / Phase 2 split: Phase 1 = TS handlers + hook plumbing + YAML spec; Phase 2 = persisted subscriptions + engine-driven execution + workflow-binding UI + OOTB SO seeding. The `inference.anonymization.workflowIds` admin setting and per-space workflow-binding UI are Phase 2 deliverables.

---

## 12. `WorkflowsClient.invokeHook` and `capabilities` (integration footgun)

`workflows_management`’s client provider implements `invokeHook(triggerId, payload)` **without** forwarding a third argument. Inference correctly bypasses this and calls `workflowsExtensions.invokeHook` from server `start`.

**RFC / doc update needed:** If other plugins are expected to invoke sync hooks with capabilities, extend the `WorkflowsClient` type and provider **or** document that **capabilities are only supported via `workflowsExtensions.start.invokeHook`** (internal / platform use).

---

## 14. `inference_workflows` is a pattern, not a one-off — domain step packages as the long-term model

The `inference_workflows` plugin was introduced to keep `workflowsExtensions` free of inference/AI knowledge (Finding #8). The same pattern applies to every other domain that wants to contribute steps or triggers to the workflows framework.

**Two boundaries govern where a step lives:**

1. **License boundary.** `workflows_extensions` is OSS (SSPL/EL/AGPL triple-licensed). Steps without an x-pack dependency should stay there so they are available to all license tiers. Steps that depend on x-pack features must live in an x-pack plugin.

2. **Domain boundary.** `workflows_extensions` should contain only generic, zero-domain built-ins (`data.map`, etc.). Domain-specific steps belong in domain packages. `inference_workflows` is the first example of this pattern.

**Projected long-term shape:**

```
workflows_extensions       ← pure framework + generic OSS built-in steps
         ↑
  inference_workflows      ← AI steps, PII steps, inference lifecycle hooks (x-pack)
  cases_workflows          ← cases steps, cases triggers (future, x-pack)
  security_workflows       ← security enrichment steps (future, x-pack)
  observability_workflows  ← log/metric steps (future, x-pack)
         ↑
  agent_builder / consumers
```

Each domain package registers its own steps and triggers with `workflowsExtensions` during `setup()`. No cross-domain dependencies are needed. `workflowsExtensions` remains the single registry point without importing from any of them.

**Decision criteria for step placement:**
- Has a meaningful runtime dependency on a domain plugin (inference, cases, security)? → domain package.
- OSS-safe and domain-agnostic? → `workflows_extensions` built-ins.
- x-pack but domain-agnostic? → could live in a future `x-pack/workflows_extensions` layer; out of scope for now.

**RFC update needed:** §7.5 ("Step type ownership") currently treats `workflowsExtensions` as the home for all shared steps. It should be updated to describe the domain-package pattern and use `inference_workflows` as the reference implementation. Any steps listed as "future additions to `workflowsExtensions`" should be re-evaluated: if they have a domain dependency, they belong in a domain package, not the generic framework.
