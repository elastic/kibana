# One Pager

Anonymization \- One Pager

## Comparing the options

We evaluated two approaches for wiring PII anonymization into the **inference pipeline**. Here's the breakdown.

## Option 1: beforeCompletion & afterCompletion hooks added to the Inference plugin

Two separate YAML workflows. The key architectural point: the LLM call is made directly by the **Inference plugin** in TypeScript \- it never passes through the YAML expression engine. This is what makes streaming possible: the expression engine can only resolve inputs from fully materialized values (an expression like `${{ steps.llm.output.response }}` cannot be fed a chunk at a time), so any workflow step that owns the LLM call is forced to buffer the entire response.

By keeping the connector call in TypeScript, the Inference plugin de-anonymizes each chunk as it arrives and forwards it to the caller immediately. The `afterCompletion` workflow is only invoked once the full response is assembled.

| ![][image1] |
| :---- |

**Pros**

- Streaming to caller starts immediately \- Time To First Token (TTFT) is unaffected  
- Per-space configuration \- each space can independently enable, disable, and customize detection rules  
- Each workflow is simple and single-purpose  
- Fail-closed by default \- if either hook errors or times out, the call is blocked rather than leaking PII; admins can opt into fail-open (`allow_unsafe`) per space if availability matters more than strict protection

**Cons**

- Hooks run synchronously on the LLM call path \- each hook has a hard per-workflow timeout (default 15s); a slow or complex workflow directly increases user-perceived latency  
- Initial detection is regex-only (IP, email, hostname, custom patterns); NER (ML-based named entity recognition) is a potential later addition  
- Two workflows must both be enabled \- operational footgun if one is orphaned  
- Token map lives in-memory between the two hooks; no shared context within one YAML file  
- Post-LLM YAML logic must live in `afterCompletion`, physically separate from the pre-LLM logic

---

## Option 2: `aroundCompletion` hook with `call_site.proceed` 

A single YAML workflow owns the full pipeline. It anonymizes the prompt, then signals the Inference plugin to make the LLM call via a `call_site.proceed` step. The Inference plugin streams de-anonymized chunks to the caller in real time while simultaneously buffering the assembled response as step output, allowing the workflow to continue with post-LLM steps such as token restoration.

| ![][image2] |
| :---- |

**Pros**

- Single workflow \= single unit to deploy, enable, and reason about  
- Pre- and post-LLM logic co-located in one YAML file  
- Per-space configuration \- each space can independently enable, disable, and customize detection rules  
- Simpler admin experience (one thing to toggle)  
- Post-LLM steps can directly reference pre-LLM step outputs via template expressions

**Cons**

- After some earlier concerns on how to handle streaming within the around hook we have confirmed streaming is still viable \- a streaming proceed prototype shows `call_site.proceed` can stream de-anonymized chunks to the caller inline while buffering the assembled response as step output. The open question is how additional workflows on the same hook (telemetry, output transforms) access the LLM response without triggering a second call. Solution paths exist (first-call-wins caching, phased execution, sequential result forwarding) but each adds engine complexity and affects the mental model for workflow authors reasoning about proceed ownership  
- Runs synchronously on the LLM call path \- hard per-workflow timeout (default 30s) applies; workflow complexity directly increases latency  
- Requires `call_site.proceed` step support in the workflow engine  
- `proceedFn` capability adds a more complex mental model than simple before/after

Read more about other options we explored [here](#other-technical-options-we-explored).

# User Problems

# PII Anonymization for Agent Builder \[draft\]

| Reviewer | Comment | Status |
| :---- | :---- | :---- |
| [James Spiteri](mailto:james.spiteri@elastic.co) |  | In progress |
| [Yuliia Naumenko](mailto:yuliia.naumenko@elastic.co) |  | Approved |
| [Anish Mathur](mailto:anish.mathur@elastic.co) |  | Approved |
| [Tinsae Erkailo](mailto:tin@elastic.co) |  | Not started |
| [Snehal Adlinge](mailto:snehal.adlinge@elastic.co) |  | Not started |

## User problems

Agent Builder serves users across all three of Elastic's solutions:

- Search — Developers and admins building agents and RAG applications over enterprise data: HR systems, CRMs, knowledge bases, customer records, internal wikis.  
- Observability — SREs, DevOps engineers, and platform operators investigating production incidents using logs, traces, and APM data that carry internal hostnames, customer identifiers, request payloads, and operator credentials.  
- Security — SOC analysts, threat hunters, and incident responders investigating alerts and user activity, where prompts carry employee names, infrastructure metadata, and account identifiers.

The problems below apply to every Agent Builder user regardless of solution:

- Sensitive data reaches external models on every prompt.  
  - The shape of the data differs by solution but in every case the raw content leaves Elastic with each LLM call. There is no mechanism to keep PII inside the boundary, and no team building on Agent Builder can offer their own users that guarantee.

- Regulated and multi-tenant customers can't use AI for their highest-value workflows.  
  - Financial services, healthcare, government, and multi-tenant SaaS operators all have policies that block PII from external models. These customers either disable Agent Builder entirely or accept compliance risk to use it. The features they paid for go unused.

### User Stories

As a developer building a search agent over our enterprise data,  
the data my agent retrieves contain customer records, employee details, and CRM history. That data reaches an external LLM on every query, and I have no way to prevent it.   
As an SRE investigating a production incident,  
the logs and traces I send through my AI agent contain customer email addresses, internal hostnames, IP addresses, and account identifiers from across our infrastructure. That data reaches an external LLM, and I have no way to prevent it.  
As an analyst triaging alerts,  
the data I send through my AI agent contains employee names, IP addresses, email addresses, and hostnames from my environment. That data reaches an external LLM, and I have no way to prevent it. My investigation just became a compliance event.

## Concept

Agent Builder is the AI agent platform for all of Elastic. Every prompt sent through an agent — whether by a developer building a RAG application over an HR system, an SRE summarizing a production incident, or a security analyst triaging an alert — can carry sensitive content. Customer records, employee data, log lines with internal IPs and hostnames, alert context, RAG-retrieved documents — all of it flows to an external LLM by default. For customers in regulated industries (financial services, healthcare, government) and for multi-tenant SaaS operators, this is a compliance non-starter. The Observability AI Assistant ships text-level anonymization today, but it is a single global advanced setting — not per-space, not visible to space admins outside Observability, and off by default. The platform needs a single, consistent answer that every agent across every solution inherits, surfaced where admins actually operate.

# Technical proposal

## Technical Approaches: Inference-Layer Lifecycle Hooks

Both options protect Agent Builder (and every other Kibana LLM consumer) through **synchronous lifecycle hooks added at the `inference` plugin's `chatComplete` boundary** — the single function every LLM call in Kibana passes through today. In both cases, PII in the prompt is replaced with deterministic HMAC tokens (e.g., `IP_a1b2c3d4`) before the LLM sees the data; the LLM reasons over tokens and can still correlate entities across events ("this IP appeared in all five alerts"); original values are restored in the response before the analyst sees them. The two options differ in how hooks are structured around the LLM call — see the comparison in the one-pager above and the hook models section below.

The token map lives in-memory for the duration of a single `chatComplete` call and is discarded when the call returns. No PII is persisted. No new indices. No encryption infrastructure. Admins enable anonymization for a space by activating the seeded default workflow in the Workflows UI (`app/workflows`), which are triggered synchronously by these hooks rather than by asynchronous background events. Admins can also add custom regex patterns for organization-specific identifiers via the workflow YAML. This is the "bare bones" approach: solve the compliance problem for LLM-bound data, nothing more.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, Attack Discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

Regex-based detection is the first phase as it covers structured PII patterns (IPs, emails, hostnames, usernames, custom identifiers) reliably and with sub-100ms latency. The second phase adds NER (Named Entity Recognition) using an ML model to catch natural language PII that regex cannot like names, locations, and organizations embedded in free text.

## Why Hooks at the Inference Layer, Not Per-Consumer

Three previous anonymization efforts preceded this approach. The Observability AI Assistant shipped a content-scanning approach using regex and NER rules, configured via an advanced setting (`ai:anonymizationSettings`). It is text-level — operating on prompt content rather than fields — which is why it works correctly with ESQL. It is opt-in, and has seen low adoption (one cluster). Security AI shipped a separate field-level implementation (per-ECS-field Allow/Anonymize/Deny) matching its use case of structured alert context with known field lineage. A subsequent effort then attempted to merge both into a single global solution covering regex, NER, and field-level rules for all consumers, with two system indices (`.kibana-anonymization-profiles`, `.kibana-anonymization-replacements`), encrypted saved objects for per-space salt, a full CRUD API, and a dedicated Stack Management UI. That merged implementation never reached production. It is disabled in the codebase (`ANONYMIZATION_FEATURE_ACTIVE = false`) and is marked for removal.

The fundamental problem the global solution ran into was that field-level anonymization breaks down with Agent Builder. Tools are defined in ESQL, and ESQL operators like `EVAL`, `STATS`, and renames produce derived columns whose lineage back to source fields is unrecoverable — making field-level rules unreliable for any tool that uses ESQL ([discussion](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)). Building a field lineage utility would be tightly coupled to ESQL syntax and fragile to maintain as new operators are added. The O11y approach validates the right technical direction — text-level scanning over the serialized prompt, no field lineage required, works correctly with ESQL — but it cannot be the platform answer. It is a single global setting with Observability ownership and Observability UX; in its current form it cannot cater for Search and Security users. Lifecycle hooks at the inference layer take the same text-level approach and deliver it at the platform level:

* **One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. Agent Builder, Observability AI Assistant, Security AI, Attack Discovery — all covered without per-consumer wiring.  
* **Text-level, not field-level.** Hooks operate on the serialized prompt text after all tool outputs have been assembled. Regex and NER scan the full text regardless of which fields or ESQL transformations produced it. The ESQL lineage problem disappears.  
* **No infrastructure.** The token map is call-scoped in-memory state. No indices, no encrypted saved objects, no CRUD APIs.  
* **Admin-customizable.** Configuration is workflow YAML, not code. Admins add custom patterns, enable or disable rules, and adjust per-space without a code deployment.  
* **Extensible.** Any team can subscribe custom anonymization logic via workflow steps. While any LLM traffic from other plugins (Cases, Dashboards, etc.) is automatically protected by this inference-layer integration, adding specialized lifecycle hooks to those plugins' internal operations (e.g., `cases.beforeSave` or `dashboards.onView`) is out of scope for this phase.


## How It Works

![][image3]

### Hook Models

Two hook structures are under consideration. Both sit at the `inference.chatComplete` boundary and share the same token format, session identity, failure policy, and streaming de-anonymization mechanism.

**Option 1 — before/after hooks**

| Hook | Purpose | Failure Policy | Timeout |
| :---- | :---- | :---- | :---- |
| inference.beforeCompletion | Anonymize: scan prompt for PII, replace with HMAC tokens, inject anonymization context | Fail-closed by default (admin-configurable to fail-open) | 15s |
| inference.afterCompletion | De-anonymize: restore original values in the assembled response | Fail-closed by default (admin-configurable to fail-open) | 15s |

**Option 2 — aroundCompletion hook**

| Hook | Purpose | Failure Policy | Timeout |
| :---- | :---- | :---- | :---- |
| inference.aroundCompletion | Full pipeline: anonymize prompt, trigger LLM call via `call_site.proceed`, restore tokens in response | Fail-closed by default (admin-configurable to fail-open) | 30s |

### Multi-workflow composition — the key trade-off

Option 1 composes cleanly when multiple workflows register to the same trigger. No workflow owns the LLM call; the TypeScript pipeline makes it exactly once, and any number of workflows run in sequence around it.

Option 2's challenge appears when multiple workflows register to `aroundCompletion`. Exactly one workflow must own `call_site.proceed` — the step that triggers the LLM call. A second workflow on the same hook (telemetry, output transformation, a custom guard) has no clean path to the LLM response without triggering a second call, unless the engine explicitly provides one. Three candidate solutions exist:

- **First-call-wins caching** — the engine makes the LLM call only once per hook invocation; subsequent `call_site.proceed` calls in the same context receive the cached result. Low authoring overhead; semantically opaque (workflow authors cannot tell if their proceed triggered a live call or a cache hit).  
- **Phased execution** — the engine splits `aroundCompletion` into explicit pre-proceed, proceed, and post-proceed phases; all registered workflows participate in each phase sequentially. Cleanest model; largest engine change.  
- **Sequential result forwarding** — after the proceed-owning workflow completes, its `output.result` is injected into subsequent workflows' event context as `event.proceedResult`. Minimal engine change; the prior workflow's output shape becomes an implicit interface contract.

Note that both models share the same limitation for post-LLM response mutations: per-chunk streaming carries only what can be applied inline (token restoration against a known map); any workflow step that mutates the assembled response after the fact can only affect the final `ChatCompletionMessageEvent`, not already-emitted chunks. This is a property of streaming itself, not a differentiator between the two approaches.

Streaming has been confirmed viable for Option 2: a streaming proceed prototype shows `call_site.proceed` streaming de-anonymized chunks to the caller inline while buffering the assembled response as step output for post-proceed YAML steps.

The technical details in the sections below describe **Option 1 as the reference implementation**. The token format, session identity, failure policy, tool call coverage, and streaming de-anonymization mechanism apply equally to both options; the primary difference is where in the YAML the LLM call is wired and how additional workflows access the response.

### Deterministic Tokenization

Tokens are generated using HMAC-SHA256 with a salt derived from a stable Kibana keystore value and the caller-supplied session identifier. The same input value always produces the same token within a session — and across sessions that share the same session ID:

* `john.doe@acme.com` becomes `EMAIL_7f3a...` every time it appears in the same session  
* The LLM sees consistent tokens and can reason about entity relationships: "this email appeared in all five alerts"  
* Tokens are prefixed with entity class (`EMAIL_`, `IP_`, `HOST_NAME_`, `USER_NAME_`) so the LLM understands the type without seeing the value  
* Cross-turn consistency holds across Kibana restarts and across any node in the cluster — no session affinity required

Because the salt is derived from stable inputs (server secret \+ session ID), the same PII value always produces the same token. Callers that want cross-turn consistency must pass a stable `sessionId` in `chatComplete`'s metadata. Agent Builder uses its `conversationId` for this purpose.

### Token Map Lifecycle

The token map is call-scoped in-memory state, created at the start of each `chatComplete` call and released when the call returns. It is never written to disk.

| Phase | What happens |
| :---- | :---- |
| `chatComplete` is called | Inference plugin derives `sessionId` and `salt`; both are placed in the `beforeCompletion` event payload |
| `beforeCompletion` hook runs | `ai.pii` step detects PII, replaces with tokens, returns `{ output, tokenMap }` as step output; workflow returns the token map in its output block |
| Instruction injection | If the token map is non-empty, the inference plugin appends an `[Anonymization context]` block to the system prompt |
| Connector call | LLM sees only tokens and the anonymization instruction |
| `afterCompletion` hook runs | Inference plugin passes the token map in the event payload; `transform.pii_restore` step reads it and restores originals in the response |
| `chatComplete` returns | Token map local variable is released; no PII is persisted |

###  Token Map Transport

All anonymization state moves through the workflow event and output schemas as plain, JSON-serializable values. No hidden object references are involved.

At the start of a `chatComplete` call the Inference plugin derives two values:

- `sessionId` — taken from `metadata.anonymization.sessionId` if present, otherwise a fresh `uuidv4()`.  
- `salt` — HMAC-SHA256 of `sessionId` keyed by the configured encryption key; falls back to `sessionId` itself when no encryption key is set.

Both values are placed in the `inference.beforeCompletion` event payload alongside the prompt — `{ sessionId, salt, system, messages }` — typed by `BeforeCompletionEventSchema`.

The `ai.pii` step receives `salt` (and an optional `tokenMap` to chain from a preceding step) as ordinary step inputs. It calls `generateToken(salt, entityClass, value)` — an HMAC-SHA256 of `${entityClass}::${value}` keyed by `salt` — and returns `{ output: anonymizedText, tokenMap: Record<token, { original, entityClass }> }` as step output. Because the token is a pure function of the salt and the matched value, the same PII string always maps to the same token within a session — the LLM can correlate entities across turns without seeing real data. The token map propagates to subsequent steps or the workflow `output:` block as normal YAML data and is referenceable via template expressions.

After `invokeBeforeCompletion` returns, the Inference plugin parses the workflow output against `BeforeCompletionOutputSchema` and holds the token map as a plain local variable for the duration of the call. When the LLM finishes, the map is passed by value into the `inference.afterCompletion` event payload — `{ sessionId, response, tokenMap }` — typed by `AfterCompletionEventSchema`. The `transform.pii_restore` step reads it from `${{ event.tokenMap }}` as a regular input.

Both `ai.pii` and `transform.pii_restore` declare their full input/output contracts in Zod schemas at step-registration time. The token map is visible to YAML template expressions in any step that receives it, which is appropriate given these are admin-authored workflows running with elevated trust. The Inference plugin is explicitly responsible for extracting the token map from the `beforeCompletion` output and re-injecting it into the `afterCompletion` event; that hand-off is the only place outside of workflow YAML where the map is touched.

### Failure Behavior

Anonymization hooks **default to fail-closed** and are **admin-configurable** per space:

* **Default (fail-closed)**: if the anonymization workflow times out or errors, the prompt is blocked and the analyst sees a clear message. Customers who enabled anonymization did so for compliance reasons; leaking PII because a workflow hiccupped violates that contract.  
* **Opt-in fail-open**: admins can configure `failureMode: 'allow_unsafe'` if operational speed matters more than strict PII protection. All failures are logged regardless of policy.

### Tool Call Coverage

Because the hooks sit at the `chatComplete` boundary, tool outputs are covered by induction: any PII that a tool returns enters the *next* `chatComplete` call's serialized prompt, where the `beforeCompletion` hook anonymizes the full text — tool output included. There is no need for separate anonymization hooks on tool execution.

**Tool call arguments** are handled separately from tool outputs. When the LLM emits a message containing tool calls, the inference pipeline's output processing restores any anonymization tokens found in the arguments — walking the argument structure recursively so tokens inside nested objects or arrays are caught — before the result ever reaches the tool executor. This is not a workflow hook; it is a direct step inside the pipeline's completion handling. The tool executor always receives real values.

**Tool outputs** contain real data (the tool fetched from Elasticsearch, so values were never anonymized in the first place). Results flow back into the conversation as-is and are anonymized when they appear in the assembled prompt on the next `chatComplete` call.

Tools that make their own LLM calls through the inference plugin (e.g., a summarization sub-call) get their own `beforeCompletion`/`afterCompletion` pair. Because HMAC determinism means the same PII produces the same token, the parent agent call sees consistent tokens even when tool-internal calls processed the same data.

Tools that need real values to function (entity lookups, LDAP queries) operate on unmasked data — they execute against Elasticsearch with real values and their results enter the next `chatComplete` prompt, where they are anonymized before the LLM sees them.

**Streaming de-anonymization**  
`afterCompletion` runs once on the fully assembled response, which is clean and consistent for the hook contract — but streaming responses emit content incrementally, and tokens can straddle chunk boundaries. The solution is a sliding-buffer transform inside the inference pipeline:

1. A small `holdBuffer` accumulates the tail of already-emitted content.  
2. After each chunk, the pipeline checks whether the tail looks like a partial token (e.g., `EMAIL_7f3a` cut mid-suffix). If yes, the tail is held; the safe prefix (with any complete tokens already restored inline) is emitted.  
3. False positives (e.g., the word `EMAIL` that turns out not to be a token) cause at most one chunk of latency.  
4. On the final assembled-message event: the buffer is flushed, `afterCompletion` runs once on the full assembled text, tool call arguments are de-anonymized, and any remaining content is emitted.

The `holdBuffer` is bounded to the length of the longest possible token suffix — it never buffers the full response. The sliding-buffer transform is an inference-pipeline implementation detail; workflow authors are not aware of it. `afterCompletion` still runs exactly once per call from the perspective of the hook contract.

## Phase 1: Regex-Based Detection

The first phase ships regex pattern matching for structured PII. This covers the categories that enterprise customers care about most and that regex handles reliably.

### Shipped Patterns

| Entity Class | Pattern | Examples |
| :---- | :---- | :---- |
| IP | IPv4 and IPv6 | 10.0.5.42, 2001:db8::1 |
| EMAIL | Standard email format | john.doe@acme.com |
| HOST\_NAME | FQDNs, common internal hostname formats | srv-prod-db-01, host.internal.corp |
| USER\_NAME | Domain backslash user, user@domain | ACME\\jdoe, jdoe@acme |

### Custom Patterns

Admins can add organization-specific regex patterns with a label and entity class. Examples:

* Employee IDs: `EMP-\d{6}` mapped to `EMPLOYEE_ID`  
* Internal account numbers: `ACC[A-Z]\d{8}` mapped to `ACCOUNT_ID`  
* Badge numbers, case IDs, or any structured identifier the organization considers sensitive

### Performance

Regex scanning adds latency to every prompt. With a small rule set (10-20 patterns), benchmarks from the existing inference regex worker show sub-100ms overhead. The workflow engine's 15-second timeout provides a hard cap.

### Legacy Settings Migration

On first startup after upgrade, a one-shot migration reads any regex-based anonymization rules the admin previously configured in the Observability AI Assistant settings page (Stack Management → Advanced Settings → Observability → `ai:anonymizationSettings`) and imports them into the seeded before-completion workflow. This migration runs once and does not repeat.

## Phase 2: NER-Based Detection \[TBD\]

The second phase adds Named Entity Recognition to catch PII that regex cannot — personal names, organization names, and locations embedded in natural language.

### How It Works

NER uses an ML model (deployed via Elasticsearch's inference API) to identify entity spans in text. The model classifies each span as a person, organization, location, or miscellaneous entity. Detected spans are tokenized using the same HMAC mechanism as regex matches, and the token map is extended with the NER-detected entries.

NER runs alongside regex in the same `beforeCompletion` hook — the workflow first runs regex patterns (fast, precise), then runs NER over the remaining text (slower, broader coverage). Overlapping detections are resolved: if regex already tokenized a span, NER skips it.

### Entity Classes

| NER Class | Maps To | Examples |
| :---- | :---- | :---- |
| PER | PERSON\_NAME | "John Smith", "Dr. Alice Chen" |
| ORG | ORG\_NAME | "Acme Corp", "Deutsche Telekom" |
| LOC | LOCATION | "Berlin office", "US-East-1" |
| MISC | MISC\_ENTITY | Context-dependent entities |

### Considerations

* **Model dependency**: NER requires a deployed ML model. For air-gapped environments, the model must be bundled or pre-installed. This adds operational complexity.  
* **Latency**: NER inference adds 1-5 seconds depending on text length and model. The 15-second hook timeout accommodates this, but multi-step agent interactions with many tool outputs could approach the cap.  
* **False positives**: NER models occasionally misclassify common words as entities. The entity class prefix in tokens (`PERSON_NAME_...`) helps the LLM understand what was masked, but over-anonymization can reduce response quality.  
* **Optional**: NER is admin-enabled separately from regex. Customers who only need structured pattern matching can skip NER entirely.

### Why Phase 2, Not Phase 1

The initial scope focuses on the minimum viable capability. Regex covers the structured PII that regulated customers cite in escalations (IPs, emails, hostnames, usernames). NER is additive — same hooks, same token format, same admin controls but introduces ML model dependency and latency that should be validated with customers before committing. The hooks architecture means NER is an enhancement.

## Admin Experience

### Enabling Anonymization

Two things must be true for anonymization to activate:

1. **`xpack.inference.anonymization.experimental_workflow_driven: true`** in `kibana.yml` — off by default so the new code does not affect existing deployments. Removed once stable.  
2. **Enable the seeded workflow** in the Workflow Management UI for the relevant space. Two default workflows are seeded on startup with `enabled: false`. Toggling them on activates protection for all LLM calls in that space.

### Progressive Disclosure

Three layers of configuration, matching the lifecycle hooks design spec ([\#16705](https://github.com/elastic/security-team/issues/16705)):

* **Simple toggle**: Admin enables anonymization for an agent. Default regex patterns activate. No workflow knowledge required.  
* **Entity configuration**: Admin selects which entity types to protect (IPs, emails, hostnames, custom). Adds custom regex patterns for org-specific identifiers. Still no workflow authoring.  
* **Custom workflow**: Advanced users who want full control can view the underlying system workflow ("View workflow" link) and replace it with a custom workflow on the same hook. The system workflow is replaced, not stacked.

### 

### Space Scoping

Each workflow belongs to exactly one space. Enabling a workflow in space A has no effect on space B. There is no cross-space configuration.

## Dependencies

| Dependency | Owner | Status | Impact |
| :---- | :---- | :---- | :---- |
| Lifecycle hooks infrastructure (`invokeHook`) | One Workflow (\#16701) | Open, milestone 9.5 | Blocking — nothing works without sync workflow execution |
| Inline workflow executor | One Workflow | Proposed in workflows-aop | Blocking — required for in-process, synchronous step execution |
| Default workflow seeding (generating OOTB workflows for anonymization)  | One Workflow | Proposed in workflows-aop | Required for zero-config admin onboarding |
| `inference.beforeCompletion` / `afterCompletion` hook registration | Inference \+ One Workflow | Open | Blocking — hooks must be registered before workflows can subscribe |
| `chatComplete` hook invocation | Inference | Open | Blocking — wires hooks into every LLM call |
| `ai.pii` workflow step | One Workflow | Proposed in workflows-aop | Blocking for P1 — the regex/HMAC detection step |
| `transform.pii_restore` workflow step | One Workflow | Proposed in workflows-aop | Blocking for P1 — the de-anonymization step |
| Legacy settings migration | One Workflow | Open | Needed for Observability AI Assistant upgrade path |
| Hook outcome surfacing | One Workflow (\#16704) | Open | Needed for fail-open indicator (anonymization unavailable notice) |
| Design for hooks UX | Design (\#16705) | Open, assigned to @r4zr32d3k1l | Needed for admin toggle, entity configuration, centralized management |
| Removal of existing anonymization implementation | Security / Inference | Disabled in codebase (`ANONYMIZATION_FEATURE_ACTIVE = false`) | Should be removed to avoid confusion and dead code |
| NER model deployment | ML team | Existing (.ner\_model\_1) | Phase 2 only — must be available via inference API |

Dependencies above are written for Option 1\. Option 2 would substitute `inference.aroundCompletion` hook registration for `beforeCompletion`/`afterCompletion`, and would additionally require `call_site.proceed` step support in the workflow engine plus whichever multi-workflow composition solution is chosen.

## Feedback Requested

Both options are technically viable. Neither is committed to — we are seeking input before deciding which to build.

**Which hook model should we build?**

Both options require the same new infrastructure that does not yet exist: synchronous hook invocation, an inline workflow executor, and the `ai.pii` / `transform.pii_restore` step types. That shared base is the bulk of the work.

- **Option 1 (before/after)** — two paired workflows. Multi-workflow composition works out of the box on the shared base. Main downside: two workflows must be kept in sync operationally.  
- **Option 2 (aroundCompletion)** — single workflow, co-located pre/post logic, better admin experience. Requires the `call_site.proceed` suspend/resume mechanism and additional engine work to handle multi-workflow composition cleanly, on top of the shared base. Streaming proceed has been validated as feasible.

**Specific questions:**

1. Is the single-workflow admin experience of Option 2 a meaningful differentiator for the customers we are targeting, or is managing two paired workflows acceptable?  
2. Do we expect other teams to register workflows on `aroundCompletion` (telemetry, guards, custom transforms) in the same spaces where anonymization runs? If yes, how important is clean composition to us?  
3. Of the three composition solutions for Option 2, does any align naturally with the workflow engine roadmap already in flight?

## What We Are Not Building

* **Field-level Allow/Anonymize/Deny** — ESQL lineage limitations make per-field anonymization unreliable for Agent Builder tool outputs. Text-level scanning via hooks sidesteps this entirely.  
* **Persistent token mappings** — No `.kibana-anonymization-replacements` index. Token maps are call-scoped, in-memory, and discarded when `chatComplete` returns. There is no persistence infrastructure.  
* **Anonymization profiles in Stack Management** — No dedicated profiles page. Configuration lives in the workflow definition, enabled per space.  
* **Cross-session token continuity** — Tokens are scoped to a `sessionId`. A new conversation with a different session ID will produce different tokens for the same values. This is intentional: no persistent PII linkage across conversations.  
* **Anonymization for stored artifacts** — Chat messages, case attachments, and Knowledge Base entries are stored with original values. Only LLM-bound data is anonymized. The goal is to protect data that leaves the system, not data at rest.  
* **Per-agent anonymization configuration** — Anonymization is configured per space, not per agent. All agents in a space share the same anonymization workflow(s).   
* **NER-based detection** — Named entity recognition is deferred to Phase 2\. Phase 1 covers structured PII (IPs, emails, hostnames, usernames, custom regex patterns).

## Other Technical Options We Explored {#other-technical-options-we-explored}

### Use the existing prepareAnonymization() approach (already in the inference plugin)

The inference plugin already has a full anonymization implementation (`chat_complete/anonymization/`) using regex workers and optional Elasticsearch-backed NER, with streaming de-anonymization via an RxJS operator.

**Pros**

- Already built and running today \- no new engine work required  
- Handles streaming natively (per-chunk RxJS operator)  
- Optional encrypted ES index for cross-turn replacement persistence  
- Supports NER (ML-based entity detection) out of the box  
- No workflow engine dependency \- simpler operational surface

**Cons**

- No per-space configuration \- a single global Kibana advanced setting applies to all spaces; you cannot enable anonymization for one space and disable it for another  
- Not visible to space admins \- configured via advanced settings under Observability; space admins across Search and Security have no path to enabling or customizing it for their space  
- Configurable but not composable \- admins can adjust regex rules and enable NER via advanced settings without a code deployment, but are limited to what the settings schema exposes; they cannot chain custom logic or integrate with other workflow behaviors  
- Parallel system to the workflow engine \- two separate anonymization surfaces to maintain long-term as workflows become the configuration model for AI features  
- NER calls hit Elasticsearch on the hot path \- additional latency risk under load, this risk is the same if we add NER support to option 1 or 2\.

## References

* Lifecycle Hooks epic: [\#16700](https://github.com/elastic/security-team/issues/16700) (One Workflow, milestone 9.5)  
* Architecture proposal: [workflows-aop](https://github.com/talboren/workflows-aop/blob/main/README.md)  
* Agent Builder hook spec: [workflows-aop/agent-builder.md](https://github.com/talboren/workflows-aop/blob/main/agent-builder.md)  
* Security migration issue: [\#14441](https://github.com/elastic/security-team/issues/14441) (Anonymization Support)  
* Guardrails PR: [\#255848](https://github.com/elastic/kibana/pull/255848) (existing `ai.guardrails` step)  
* Pierre's ESQL lineage concern \+ team discussion: [Slack thread, Jan 27](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)  
* Shay's feedback on bare-bones direction: [Slack thread, March 31](https://elastic.slack.com/archives/C08U04SUN49/p1774387290094889)

[image1]: <data:image/png;base64,>

[image2]: <data:image/png;base64,>

[image3]: <data:image/png;base64,>