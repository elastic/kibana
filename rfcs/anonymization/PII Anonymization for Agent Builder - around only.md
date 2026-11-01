# One Pager

Anonymization — One Pager

## The Approach: `aroundCompletion` hook

PII anonymization is wired into the **inference pipeline** through a single synchronous lifecycle hook at the `inference` plugin's `chatComplete` boundary — the one function every LLM call in Kibana passes through. A single YAML workflow owns the full pipeline: it anonymizes the prompt, triggers the LLM call via a `call_site.proceed` step, and restores tokens in the response. Pre- and post-LLM logic co-locate in one workflow definition, and post steps can reference pre step outputs via template expressions.

**Pros**

- Streaming with inline TTFT — chunks are de-anonymized and forwarded to the caller immediately via a sliding hold-buffer; no full-response buffering
- Per-space configuration — each space independently enables, disables, and customizes detection rules
- Fail-closed by default — if the hook errors or times out, the call is blocked rather than leaking PII; admins can opt into fail-open (`allow_unsafe`) per deployment
- Text-level, ESQL-safe — the hook operates on the assembled prompt text; no field lineage required
- Single workflow — single unit to deploy, enable, and reason about; pre- and post-LLM logic co-located

**Cons**

- Run synchronously on the LLM call path — workflow complexity directly increases user-perceived latency
- Phase 1 is regex-only (IPs, emails, hostnames, usernames, custom patterns); NER is a Phase 2 addition
- Exactly one workflow may match per invocation in Phase 1 — true multi-workflow composition is deferred

**Multi-workflow composition — deferred**

Phase 1 enforces exactly one matching workflow per `aroundCompletion` invocation. This is a deliberate simplification. Three composition strategies exist for future phases — first-call-wins proceed-result caching, phased pre/proceed/post execution, and sequential result forwarding — but none are implemented in Phase 1. Administrators who need per-agent differentiation can author mutually exclusive trigger guards on separate workflows within the same space.

---

# User Problems

# PII Anonymization for Agent Builder

| Reviewer | Comment | Status |
| :---- | :---- | :---- |
| [James Spiteri](mailto:james.spiteri@elastic.co) |  | Approved |
| [Yuliia Naumenko](mailto:yuliia.naumenko@elastic.co) |  | Approved |
| [Anish Mathur](mailto:anish.mathur@elastic.co) |  | Approved |
| [Tinsae Erkailo](mailto:tin@elastic.co) |  | Not started |

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

## Inference-Layer Lifecycle Hook

Anonymization protects Agent Builder (and every other Kibana LLM consumer) through a **synchronous `inference.aroundCompletion` lifecycle hook at the `inference` plugin's `chatComplete` boundary** — the single function every LLM call in Kibana passes through today. PII in the prompt is replaced with deterministic HMAC tokens (e.g., `IP_a1b2c3d4`) before the LLM sees the data; the LLM reasons over tokens and can still correlate entities across events ("this IP appeared in all five alerts"); original values are restored in the response before the analyst sees them.

The token map lives in-memory for the duration of a single `chatComplete` call and is discarded when the call returns. No PII is persisted. No new indices. No encryption infrastructure. Admins enable anonymization for a space by activating the seeded default workflow in the Workflows UI, which is triggered synchronously by the hook rather than by asynchronous background events. Admins can also add custom regex patterns for organization-specific identifiers via the workflow YAML. This is the "bare bones" approach: solve the compliance problem for LLM-bound data, nothing more.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, Attack Discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

Regex-based detection is the first phase as it covers structured PII patterns (IPs, emails, hostnames, usernames, custom identifiers) reliably and with sub-100ms latency. The second phase adds NER (Named Entity Recognition) using an ML model to catch natural language PII that regex cannot — names, locations, and organizations embedded in free text.

## Why Hooks at the Inference Layer, Not Per-Consumer

Three previous anonymization efforts preceded this approach. The Observability AI Assistant shipped a content-scanning approach using regex and NER rules, configured via an advanced setting (`ai:anonymizationSettings`). It is text-level — operating on prompt content rather than fields — which is why it works correctly with ESQL. It is opt-in, and has seen low adoption (one cluster). Security AI shipped a separate field-level implementation (per-ECS-field Allow/Anonymize/Deny) matching its use case of structured alert context with known field lineage. A subsequent effort then attempted to merge both into a single global solution covering regex, NER, and field-level rules for all consumers, with two system indices, encrypted saved objects for per-space salt, a full CRUD API, and a dedicated Stack Management UI. That merged implementation never reached production. It is disabled in the codebase and is marked for removal.

The fundamental problem the global solution ran into was that field-level anonymization breaks down with Agent Builder. Tools are defined in ESQL, and ESQL operators like `EVAL`, `STATS`, and renames produce derived columns whose lineage back to source fields is unrecoverable — making field-level rules unreliable for any tool that uses ESQL ([discussion](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)). Building a field lineage utility would be tightly coupled to ESQL syntax and fragile to maintain as new operators are added. The O11y approach validates the right technical direction — text-level scanning over the serialized prompt, no field lineage required, works correctly with ESQL — but it cannot be the platform answer. It is a single global setting with Observability ownership and Observability UX; in its current form it cannot cater for Search and Security users. A lifecycle hook at the inference layer takes the same text-level approach and delivers it at the platform level:

* **One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. Agent Builder, Observability AI Assistant, Security AI, Attack Discovery — all covered without per-consumer wiring.
* **Text-level, not field-level.** The hook operates on the serialized prompt text after all tool outputs have been assembled. Regex and NER scan the full text regardless of which fields or ESQL transformations produced it. The ESQL lineage problem disappears.
* **No infrastructure.** The token map is call-scoped in-memory state. No indices, no encrypted saved objects, no CRUD APIs.
* **Admin-customizable.** Configuration is workflow YAML, not code. Admins add custom patterns, enable or disable rules, and adjust per-space without a code deployment.
* **Extensible.** Any team can subscribe custom anonymization logic via workflow steps. While any LLM traffic from other plugins is automatically protected by this inference-layer integration, adding specialized lifecycle hooks to those plugins' internal operations is out of scope for this phase.

The existing O11y implementation already establishes one key technical pattern this proposal builds on: a **Piscina worker pool** for off-event-loop regex execution, ensuring regex scanning never blocks the Node.js event loop. The `ai.pii` workflow step will use the same pattern. The proposed solution extends this foundation — making it per-space, workflow-configurable, and available to all solutions — rather than reinventing it.

## How It Works

### Hook Model

| Hook | Purpose | Failure Policy | Timeout |
| :---- | :---- | :---- | :---- |
| `inference.aroundCompletion` | Full pipeline: anonymize prompt, trigger LLM call via `call_site.proceed`, restore tokens in response | Fail-closed by default (operator-configurable to fail-open) | 30s |

A single YAML workflow owns the complete anonymization pipeline. It anonymizes the prompt with the `ai.pii` step, then triggers the LLM call via `call_site.proceed`. The inference plugin de-anonymizes chunks in real time as they arrive and forwards them to the caller via a sliding hold-buffer, so streaming TTFT is preserved. After `call_site.proceed` completes, the workflow continues with `transform.pii_restore` to restore original values in the final assembled response.

### Compatibility Switch and Rollout

The new pipeline is gated behind an opt-in configuration flag (`xpack.inference.anonymization.experimental_workflow_driven`), which defaults to off. Existing deployments are unaffected — the current `chatComplete` anonymization path (detect → connector → restore) remains active until an operator explicitly enables the new mode. A separate `failureMode` setting controls whether hook failures block the call (the default, `block`) or fall through to the caller (`allow_unsafe`).

Workflow engine availability is checked once during inference plugin startup, not on every `chatComplete` call. If the flag is on but the workflow engine does not expose synchronous execution support — for example because a stacked dependency is absent — the plugin logs a high-signal configuration error and retains legacy anonymization for that process. A call is never allowed to proceed unprotected because of a missing dependency.

### Space Resolution

Each `aroundCompletion` invocation is scoped to the space of the originating request, derived from the same namespace already established when the inference client is constructed. Workflow selection is purely space-local: enabling a workflow in space A has no effect on space B, and no cross-space lookup is performed. Requestless inference clients — those constructed without an HTTP request context — do not gain workflow anonymization implicitly and retain their existing behavior.

### Phase 1 Composition — Exactly One Match

In Phase 1, exactly one workflow may match the `aroundCompletion` trigger per invocation. The evaluation logic is:

- **Zero matches**: inference proceeds directly with no anonymization applied.
- **Exactly one match**: the workflow is validated (it must contain exactly one `call_site.proceed` step) and executed.
- **More than one match**: configuration failure — no connector call is made.
- **Zero or multiple proceed steps in the matched workflow**: configuration failure.

Administrators who need different anonymization behavior for different agents within the same space can achieve this by authoring mutually exclusive trigger guards (for example, filtering on `agentId`). Runtime detection prevents unsafe overlap. True multi-workflow composition — running multiple workflows sequentially on the same trigger — is deferred to a future phase.

### Deterministic Tokenization

Tokens are generated using HMAC-SHA256 keyed by a salt derived from a stable Kibana keystore value and the session identifier. The same input value always produces the same token within a session — and across sessions that share the same session ID:

* `john.doe@acme.com` becomes `EMAIL_7f3a...` every time it appears in the same session
* The LLM sees consistent tokens and can reason about entity relationships: "this email appeared in all five alerts"
* Tokens are prefixed with entity class (`EMAIL_`, `IP_`, `HOST_NAME_`, `USER_NAME_`) so the LLM understands the type without seeing the value
* Cross-turn consistency holds across Kibana restarts and across any node in the cluster — no session affinity required

Callers that want cross-turn consistency must pass a stable `sessionId` in `chatComplete`'s metadata. Agent Builder maps its `conversationId` to this field. The token is derived from the session (not the agent), so a sub-agent processing the same PII value within the same conversation produces the same token — the LLM can correlate entities across tool calls.

### Token Map Lifecycle

The token map is call-scoped in-memory state, built inside the workflow execution and discarded when the call returns. It is never written to disk.

| Phase | What happens |
| :---- | :---- |
| `chatComplete` is called | Inference plugin resolves the space namespace and checks for a matching workflow |
| `inference.aroundCompletion` hook fires | The workflow begins; `ai.pii` detects PII, replaces values with HMAC tokens, and produces a token map |
| Instruction injection | If the token map is non-empty, an `[Anonymization context]` block is appended to the system prompt |
| `call_site.proceed` executes | The workflow passes the anonymized system and messages to the inference plugin, which calls the connector |
| Streaming | The inference plugin restores tokens in each chunk via a sliding hold-buffer and relays them to the caller immediately |
| `transform.pii_restore` executes | The workflow receives the raw assembled response and performs final restoration of response content |
| `chatComplete` returns | Token map is released; no PII is persisted |

### Token Map Transport

All anonymization state moves as plain JSON-serializable values through the workflow's step inputs and outputs — no hidden object references, no shared singletons. The salt (used for HMAC token generation) is derived from server key material and the execution scope inside the inference plugin; it is never exposed to workflow YAML expressions or serialized into the event. The `ai.pii` step receives its detection context and rules as inputs, performs detection and tokenization, and returns the anonymized content with the token map as step output. Subsequent steps in the same workflow reference the token map via template expressions.

When `call_site.proceed` is invoked, it receives the workflow-transformed system prompt, messages, and the current token map as its inputs. The token map is used for inline chunk restoration during streaming, then handed to `transform.pii_restore` for final assembled-response restoration. At no point does the map leave the in-memory execution context.

### Failure Behavior

The `aroundCompletion` hook **defaults to fail-closed**, controlled by operator configuration:

* **Default (`block`)**: if the anonymization workflow times out or errors, the prompt is blocked and the user sees a clear message. Customers who enabled anonymization did so for compliance reasons; leaking PII because a workflow hiccupped violates that contract.
* **Opt-in fail-open (`allow_unsafe`)**: the original direct-inference path may be used only when a failure occurs before the connector is invoked. Once streaming has started, no second call is ever attempted. All failures are logged and emit an audit event and metric regardless of policy.

### Streaming and Closure State

The proceed step and the outbound stream share request-local closure state. This means the workflow starts lazily — execution does not begin until the response stream has a subscriber — and the streaming relay and workflow execution run concurrently through this shared context. The proceed step:

1. Calls the connector with streaming enabled using the workflow-provided inputs.
2. Restores tokens in each chunk via the sliding hold-buffer and relays them to the caller immediately.
3. Suppresses the final assembled terminal message from the relay (to avoid emitting it twice).
4. Returns the raw assembled response content to the workflow for `transform.pii_restore`.

After `transform.pii_restore` runs, the workflow emits the restored terminal message through the around$ stream. Structured tool-call arguments in the terminal message are recursively de-anonymized before the event reaches the tool executor.

Cancellation propagates to both the connector stream and the workflow execution.

### Tool Call Coverage

Because the hook sits at the `chatComplete` boundary, tool outputs are covered by induction: any PII that a tool returns enters the *next* `chatComplete` call's serialized prompt, where the hook anonymizes the full text — tool output included. No separate anonymization hooks on tool execution are needed.

**Tool call arguments** — when the LLM emits a message containing tool calls, the proceed step restores any tokens found in the arguments recursively (including nested objects, arrays, and JSON-string representations) before the result reaches the tool executor. The tool executor always receives real values.

**Tools that make their own LLM calls** through the inference plugin get their own `aroundCompletion` invocation. Because HMAC determinism means the same PII produces the same token for the same session, the parent agent call sees consistent tokens even when tool-internal calls processed the same data independently.

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

Regex scanning adds latency to every prompt. Based on the existing regex worker implementation, a small rule set (10–20 patterns) is expected to complete well under 100ms; formal benchmarks have not yet been run. The hook timeout provides a hard cap. Regex execution is always delegated to a worker pool so it does not block the Node.js event loop.

## Phase 2: NER-Based Detection \[TBD\]

The second phase adds Named Entity Recognition to catch PII that regex cannot — personal names, organization names, and locations embedded in natural language.

### How It Works

NER uses an ML model (deployed via Elasticsearch's inference API) to identify entity spans in text. The model classifies each span as a person, organization, location, or miscellaneous entity. Detected spans are tokenized using the same HMAC mechanism as regex matches, and the token map is extended with the NER-detected entries.

NER runs alongside regex in the same workflow — the `ai.pii` step first runs regex patterns (fast, precise), then runs NER over the remaining text (slower, broader coverage). Overlapping detections are resolved: if regex already tokenized a span, NER skips it.

### Entity Classes

| NER Class | Maps To | Examples |
| :---- | :---- | :---- |
| PER | PERSON\_NAME | "John Smith", "Dr. Alice Chen" |
| ORG | ORG\_NAME | "Acme Corp", "Deutsche Telekom" |
| LOC | LOCATION | "Berlin office", "US-East-1" |
| MISC | MISC\_ENTITY | Context-dependent entities |

### Considerations

* **Model dependency**: NER requires a deployed ML model. For air-gapped environments, the model must be bundled or pre-installed. This adds operational complexity.
* **Latency**: NER inference adds 1–5 seconds depending on text length and model. The hook timeout accommodates this, but multi-step agent interactions with many tool outputs could approach the cap.
* **False positives**: NER models occasionally misclassify common words as entities. The entity class prefix in tokens (`PERSON_NAME_...`) helps the LLM understand what was masked, but over-anonymization can reduce response quality.
* **Optional**: NER is admin-enabled separately from regex. Customers who only need structured pattern matching can skip NER entirely.

### Why Phase 2, Not Phase 1

The initial scope focuses on the minimum viable capability. Regex covers the structured PII that regulated customers cite in escalations (IPs, emails, hostnames, usernames). NER is additive — same hook, same token format, same admin controls — but introduces ML model dependency and latency that should be validated with customers before committing.

## Admin Experience

### Enabling Anonymization

Two things must be true for workflow-driven anonymization to activate:

1. **`xpack.inference.anonymization.experimental_workflow_driven: true`** in `kibana.yml` — off by default so the new code does not affect existing deployments. Removed once stable.
2. **Enable the seeded workflow** in the Workflow Management UI for the relevant space. A default workflow is seeded on startup per space with a sensible set of regex rules for email, IP, hostname, and username. It starts enabled by default. Toggling it off deactivates protection for all LLM calls in that space.

### Progressive Disclosure

Three layers of configuration, matching the lifecycle hooks design spec ([\#16705](https://github.com/elastic/security-team/issues/16705)):

* **Simple toggle**: Admin enables anonymization for a space. Default regex patterns activate. No workflow knowledge required.
* **Entity configuration**: Admin selects which entity types to protect (IPs, emails, hostnames, custom). Adds custom regex patterns for org-specific identifiers. Still no workflow authoring.
* **Custom workflow**: Advanced users who want full control can view the underlying managed workflow ("View workflow" link), clone it, and customize the YAML. A custom workflow starts disabled; the admin disables the managed default and enables the clone to make it active.

### Space Scoping

Each workflow belongs to exactly one space. Enabling a workflow in space A has no effect on space B. There is no cross-space configuration.

### Managed Workflow

A default anonymization workflow is provisioned per space by the platform as a managed (read-only, auto-reconciled) workflow. It is:

- Enabled by default, covering email, IP, hostname, and username patterns
- Non-editable in place — admins who want custom logic must clone it into a user-owned workflow
- Automatically restored if deleted

Clones are user-owned, editable, and start disabled. A typical customization flow is: reveal the managed workflow → clone → edit rules or add agent guards → disable the managed default → enable the clone.

### Legacy Settings Migration

On first startup after upgrade, a one-shot migration checks whether the admin previously configured custom regex rules in the Observability AI Assistant settings (`ai:anonymizationSettings`). Because this is a single global setting (not per-space), the migration runs once and targets the default space:

1. If no custom enabled regex rules exist, no action is taken.
2. If custom rules are found, the managed anonymization workflow is cloned into a user-owned, disabled workflow in the default space, with the custom patterns inserted.
3. An idempotency record is stored so the migration does not repeat on subsequent startups with the same rule set.
4. The original advanced setting and global profile are not modified or deleted.
5. The administrator is notified that the clone requires review before enabling.

The managed default workflow remains enabled and unchanged throughout. Admins who want the custom rules active must review the clone, disable the managed default in the default space, and enable the clone manually. Admins who want the rules in additional spaces must clone manually.

NER rules are not converted in Phase 1. If enabled NER rules are found, the migration records an explicit `needs_ner_review` state and emits a high-signal operator warning.

## Agent Builder Integration

Agent Builder threads two metadata fields through to `chatComplete` without making any policy or persistence changes:

- **Session identity**: the active `conversationId` is mapped to `metadata.anonymization.sessionId`, enabling conversation-stable token determinism.
- **Agent identity**: the active run-context agent ID is passed as `metadata.anonymization.agentId`, making it available as a trigger guard for per-agent workflow selection.

Root calls use the root agent ID; sub-agent and nested/tool calls use the active sub-agent ID. Both fields are inert while workflow mode is disabled.

Agent identity is policy metadata only — it is used to match workflow trigger guards, not to change the tokenization scope. Because the token HMAC is scoped to the session (conversation), a sub-agent processing the same PII value within the same conversation produces the same token, allowing the LLM to correlate entities across tool calls.

## Dependencies

| Dependency | Owner | Status | Impact |
| :---- | :---- | :---- | :---- |
| Lifecycle hooks infrastructure (`invokeHook`) | One Workflow (\#16701) | Open, milestone 9.5 | Blocking — nothing works without sync workflow execution |
| Synchronous workflow execution mode | One Workflow | Proposed | Blocking — required for in-process, synchronous step execution |
| Default workflow seeding per space | One Workflow | Proposed | Required for zero-config admin onboarding |
| `inference.aroundCompletion` hook registration | Inference + One Workflow | Open | Blocking — hook must be registered before workflows can subscribe |
| `chatComplete` hook invocation | Inference | Open | Blocking — wires the hook into every LLM call |
| `ai.pii` workflow step | One Workflow | Proposed | Blocking for P1 — the regex/HMAC detection step |
| `call_site.proceed` workflow step | One Workflow | Proposed | Blocking — the suspend/resume step that triggers the LLM call |
| `transform.pii_restore` workflow step | One Workflow | Proposed | Blocking for P1 — the de-anonymization step |
| Workflow availability startup check | Inference | Open | Required — must detect sync support once and retain legacy path if absent |
| Legacy settings migration | One Workflow | Open | Needed for Observability AI Assistant upgrade path |
| Hook outcome surfacing | One Workflow (\#16704) | Open | Needed for fail-open indicator (anonymization unavailable notice) |
| Design for hooks UX | Design (\#16705) | Open | Needed for admin toggle, entity configuration, centralized management |
| Removal of existing anonymization implementation | Security / Inference | Disabled in codebase (`ANONYMIZATION_FEATURE_ACTIVE = false`) | Should be removed to avoid confusion and dead code |
| NER model deployment | ML team | Existing (.ner\_model\_1) | Phase 2 only — must be available via inference API |

## What We Are Not Building

* **Field-level Allow/Anonymize/Deny** — ESQL lineage limitations make per-field anonymization unreliable for Agent Builder tool outputs. Text-level scanning via the hook sidesteps this entirely.
* **Persistent token mappings** — No `.kibana-anonymization-replacements` index. Token maps are call-scoped, in-memory, and discarded when `chatComplete` returns. There is no persistence infrastructure.
* **Anonymization profiles in Stack Management** — No dedicated profiles page. Configuration lives in the workflow definition, enabled per space.
* **Cross-session token continuity** — Tokens are scoped to a `sessionId`. A new conversation with a different session ID will produce different tokens for the same values. This is intentional: no persistent PII linkage across conversations.
* **Anonymization for stored artifacts** — Chat messages, case attachments, and Knowledge Base entries are stored with original values. Only LLM-bound data is anonymized. The goal is to protect data that leaves the system, not data at rest.
* **Per-agent anonymization configuration** — Anonymization is configured per space, not per agent. All agents in a space share the same anonymization workflow(s). Per-agent differentiation is achievable via mutually exclusive trigger guards on separate workflows within the same space.
* **NER-based detection** — Named entity recognition is deferred to Phase 2. Phase 1 covers structured PII (IPs, emails, hostnames, usernames, custom regex patterns).
* **True multi-workflow composition** — Phase 1 enforces exactly one matching workflow per `aroundCompletion` invocation. Strategies for running multiple workflows sequentially on the same trigger are defined but deferred.

## Other Technical Options We Explored

### Use the existing prepareAnonymization() approach (already in the inference plugin)

The inference plugin already has a full anonymization implementation using regex workers and optional Elasticsearch-backed NER, with streaming de-anonymization via an RxJS operator.

**Pros**

- Already built and running today — no new engine work required
- Handles streaming natively (per-chunk RxJS operator)
- Optional encrypted ES index for cross-turn replacement persistence
- Supports NER (ML-based entity detection) out of the box
- No workflow engine dependency — simpler operational surface

**Cons**

- No per-space configuration — a single global Kibana advanced setting applies to all spaces; you cannot enable anonymization for one space and disable it for another
- Not visible to space admins — configured via advanced settings under Observability; space admins across Search and Security have no path to enabling or customizing it for their space
- Configurable but not composable — admins can adjust regex rules and enable NER via advanced settings without a code deployment, but are limited to what the settings schema exposes; they cannot chain custom logic or integrate with other workflow behaviors
- Parallel system to the workflow engine — two separate anonymization surfaces to maintain long-term as workflows become the configuration model for AI features
- NER calls hit Elasticsearch on the hot path — additional latency risk under load

## References

* Lifecycle Hooks epic: [\#16700](https://github.com/elastic/security-team/issues/16700) (One Workflow, milestone 9.5)
* Architecture proposal: [workflows-aop](https://github.com/talboren/workflows-aop/blob/main/README.md)
* Agent Builder hook spec: [workflows-aop/agent-builder.md](https://github.com/talboren/workflows-aop/blob/main/agent-builder.md)
* Security migration issue: [\#14441](https://github.com/elastic/security-team/issues/14441) (Anonymization Support)
* Guardrails PR: [\#255848](https://github.com/elastic/kibana/pull/255848) (existing `ai.guardrails` step)
* Pierre's ESQL lineage concern + team discussion: [Slack thread, Jan 27](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)
* Shay's feedback on bare-bones direction: [Slack thread, March 31](https://elastic.slack.com/archives/C08U04SUN49/p1774387290094889)
