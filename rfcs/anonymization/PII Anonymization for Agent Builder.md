# PII Anonymization for Agent Builder

## 

| Reviewer | Comment | Status |
| :---- | :---- | :---- |
| [James Spiteri](mailto:james.spiteri@elastic.co) |  | In progress |
| [Yuliia Naumenko](mailto:yuliia.naumenko@elastic.co) |  | Not started |
| [Tinsae Erkailo](mailto:tin@elastic.co) |  | Not started |
| [Snehal Adlinge](mailto:snehal.adlinge@elastic.co) |  | Not started |

## User problems

As an analyst triaging alerts,  
the data I send through my AI agent contains employee names, IP addresses, email addresses, and hostnames from my environment. That data reaches an external LLM, and I have no way to prevent it. My investigation just became a compliance event.

As an analyst in a regulated industry,  
my compliance team does not permit AI-assisted investigation for any workflow involving PII. This means the workflows where I need AI most like alert triage, incident summarization, threat hunting across user activity are exactly the ones I cannot use it for.

As an analyst, my options are:  
use my AI agent with no PII protection, or don't use it at all. There is no middle ground where I can use AI on sensitive data with confidence that PII is handled.

## Concept

Today, every prompt an SOC analyst sends through Agent Builder carries the raw contents of their security data — usernames, IP addresses, email addresses, hostnames tied to real employees/customers. When that data flows to an external LLM, the analyst's investigation becomes a compliance liability. Enterprise customers in regulated industries like financial services, healthcare, government — require that PII never reaches an external model. Agent Builder has no anonymization capability today.

## Solution: Inference-Layer Lifecycle Hooks

Agent Builder (and every other Kibana LLM consumer) is protected through **lifecycle hooks at the `inference` plugin's `chatComplete` boundary** — the single function every LLM call in Kibana passes through. A `beforeCompletion` hook scans the full prompt for PII using configurable regex patterns, replaces every match with a deterministic HMAC token (e.g., `IP_a1b2c3d4`), and appends a short anonymization context note to the system prompt. The LLM reasons over tokens instead of real data — and because the tokens are deterministic within a session, it can still correlate entities across events ("this IP appeared in all five alerts"). After the model responds, an `afterCompletion` hook restores original values so the analyst sees real names, real IPs, and real hostnames in the chat.

The token map lives in-memory for the duration of a single `chatComplete` call and is discarded when the call returns. No PII is persisted. No new indices. No encryption infrastructure. An admin enables anonymization for a space by toggling on the seeded default workflow in the Workflow Management UI, and can optionally add custom regex patterns for organization-specific identifiers. This is the "bare bones" approach: solve the compliance problem for LLM-bound data, nothing more.

Because every LLM consumer in Kibana — Agent Builder, Observability AI Assistant, Security AI, Attack Discovery, AI Rule Creation, Automatic Import — must call `chatComplete`, adding anonymization once here covers all of them without touching any of their code.

Regex-based detection is the first phase as it covers structured PII patterns (IPs, emails, hostnames, usernames, custom identifiers) reliably and with sub-100ms latency. The second phase adds NER (Named Entity Recognition) using an ML model to catch natural language PII that regex cannot like names, locations, and organizations embedded in free text.

## Why Hooks at the Inference Layer, Not Per-Consumer

Three previous anonymization efforts preceded this approach. The Observability AI Assistant shipped a content-scanning approach using regex and NER rules, configured via an advanced setting (`ai:anonymizationSettings`). It is text-level — operating on prompt content rather than fields — which is why it works correctly with ESQL. It is opt-in, and has seen low adoption (one cluster). Security AI shipped a separate field-level implementation (per-ECS-field Allow/Anonymize/Deny) matching its use case of structured alert context with known field lineage. A subsequent effort then attempted to merge both into a single global solution covering regex, NER, and field-level rules for all consumers, with two system indices (`.kibana-anonymization-profiles`, `.kibana-anonymization-replacements`), encrypted saved objects for per-space salt, a full CRUD API, and a dedicated Stack Management UI. That merged implementation never reached production. It is disabled in the codebase (`ANONYMIZATION_FEATURE_ACTIVE = false`) and is marked for removal.

The fundamental problem the global solution ran into was that field-level anonymization breaks down with Agent Builder. Tools are defined in ESQL, and ESQL operators like `EVAL`, `STATS`, and renames produce derived columns whose lineage back to source fields is unrecoverable — making field-level rules unreliable for any tool that uses ESQL ([discussion](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)). Building a field lineage utility would be tightly coupled to ESQL syntax and fragile to maintain as new operators are added. The text-level approach the Observability team already validated — operating on the serialized prompt rather than on fields — sidesteps this problem entirely. The practical path forward is text-level content redaction using regex and NER, delivered as workflow steps on lifecycle hooks at the `chatComplete` boundary, covering all consumers in one place.

Lifecycle hooks at the inference layer fix both problems:

* **One integration point covers everything.** Any Kibana feature that uses the inference plugin today or in the future gets anonymization automatically. Agent Builder, Observability AI Assistant, Security AI, Attack Discovery — all covered without per-consumer wiring.  
* **Text-level, not field-level.** Hooks operate on the serialized prompt text after all tool outputs have been assembled. Regex and NER scan the full text regardless of which fields or ESQL transformations produced it. The ESQL lineage problem disappears.  
* **No infrastructure.** The token map is call-scoped in-memory state. No indices, no encrypted saved objects, no CRUD APIs.  
* **Admin-customizable.** Configuration is workflow YAML, not code. Admins add custom patterns, enable or disable rules, and adjust per-space without a code deployment.  
* **Extensible.** Any team can subscribe custom anonymization logic via workflow steps. The contribution model means Cases, Dashboards, and future features can add anonymization without the platform team doing the work.

## How It Works

### Two Hook Points (potential future third)

Two synchronous lifecycle hooks sit at the `inference.chatComplete` boundary. Every LLM call in Kibana passes through both.

| Hook | Purpose | Failure Policy | Timeout |
| :---- | :---- | :---- | :---- |
| inference.beforeCompletion | Anonymization: scan prompt for PII, replace with deterministic tokens, inject anonymization context into system prompt | Fail-closed by default (admin-configurable to fail-open) | 15s |
| inference.afterCompletion | De-anonymization: restore original values in the LLM response | Fail-closed by default (admin-configurable to fail-open) | 15s |
| inference.aroundCompletion (potential future hook) | Any custom logic that needs to run both before and after completion, with access to the full prompt and response | TBD | TBD |



### Deterministic Tokenization

Tokens are generated using HMAC-SHA256 with a salt derived from a stable Kibana keystore value and the caller-supplied session identifier. The same input value always produces the same token within a session — and across sessions that share the same session ID:

* `john.doe@acme.com` becomes `EMAIL_7f3a...` every time it appears in the same session  
* The LLM sees consistent tokens and can reason about entity relationships: "this email appeared in all five alerts"  
* Tokens are prefixed with entity class (`EMAIL_`, `IP_`, `HOST_NAME_`, `USER_NAME_`) so the LLM understands the type without seeing the value
* Cross-turn consistency holds across Kibana restarts and across any node in the cluster — no session affinity required

Because the salt is derived from stable inputs (server secret + session ID), the same PII value always produces the same token. Callers that want cross-turn consistency must pass a stable `sessionId` in `chatComplete`'s metadata. Agent Builder uses its `conversationId` for this purpose.

### Token Map Lifecycle

The `AnonymizationContext` is created at the start of each `chatComplete` call and discarded when the call returns. It is never written to disk.

| Phase | What happens |
| :---- | :---- |
| `chatComplete` is called | Inference plugin creates `AnonymizationContext { salt, tokenMap: new Map() }` |
| `beforeCompletion` hook runs | `ai.pii` step detects PII, replaces with tokens, writes `token → original` into `tokenMap` |
| Instruction injection | If `tokenMap.size > 0`, inference plugin appends `[Anonymization context]` block to the system prompt; omitted on pass-through |
| Connector call | LLM sees only tokens and the anonymization instruction |
| `afterCompletion` hook runs | `transform.pii_restore` step reads `tokenMap`, restores originals in response |
| `chatComplete` returns | `AnonymizationContext` is discarded; `tokenMap` is garbage-collected |

### Failure Behavior

Anonymization hooks **default to fail-closed** and are **admin-configurable** per space:

* **Default (fail-closed)**: if the anonymization workflow times out or errors, the prompt is blocked and the analyst sees a clear message. Customers who enabled anonymization did so for compliance reasons; leaking PII because a workflow hiccupped violates that contract.  
* **Opt-in fail-open**: admins can configure `failureMode: 'allow_unsafe'` if operational speed matters more than strict PII protection. All failures are logged regardless of policy.

### Tool Call Coverage

Because the hooks sit at the `chatComplete` boundary, tool outputs are covered by induction: any PII that a tool returns enters the *next* `chatComplete` call's serialized prompt, where the `beforeCompletion` hook anonymizes the full text — tool output included. There is no need for separate anonymization hooks on tool execution.

Tools that make their own LLM calls through the inference plugin (e.g., a summarization sub-call) get their own `beforeCompletion`/`afterCompletion` pair. Because HMAC determinism means the same PII produces the same token, the parent agent call sees consistent tokens even when tool-internal calls processed the same data.

Tools that need real values to function (entity lookups, LDAP queries) operate on unmasked data — they execute against Elasticsearch with real values and their results enter the next `chatComplete` prompt, where they are anonymized before the LLM sees them.

──────────────────────────────────────────────────

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

──────────────────────────────────────────────────

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

* **Model dependency**: NER requires a deployed ML model. For air-gapped environments, the model must be bundled or pre-installed.  
* **Latency**: NER inference adds 1-5 seconds depending on text length and model. The 15-second hook timeout accommodates this, but multi-step agent interactions with many tool outputs could approach the cap.  
* **False positives**: NER models occasionally misclassify common words as entities. The entity class prefix in tokens (`PERSON_NAME_...`) helps the LLM understand what was masked, but over-anonymization can reduce response quality.  
* **Optional**: NER is admin-enabled separately from regex. Customers who only need structured pattern matching can skip NER entirely.

### Why Phase 2, Not Phase 1

The initial scope focuses on the minimum viable capability. Regex covers the structured PII that regulated customers cite in escalations (IPs, emails, hostnames, usernames). NER is additive — same hooks, same token format, same admin controls — but introduces ML model dependency and latency that should be validated with customers before committing.

──────────────────────────────────────────────────

## Admin Experience

### Enabling Anonymization

Two things must be true for anonymization to activate:

1. **`xpack.inference.anonymization.experimental_workflow_driven: true`** in `kibana.yml` — off by default so the new code does not affect existing deployments. Removed once stable.  
2. **Enable the seeded workflow** in the Workflow Management UI for the relevant space. Two default workflows are seeded on startup with `enabled: false`. Toggling them on activates protection for all LLM calls in that space.

### Progressive Disclosure

Three layers of configuration:

* **Simple toggle**: Admin enables the default workflow for a space. Default regex patterns (IP, EMAIL, HOST\_NAME) activate immediately. No workflow knowledge required.  
* **Entity configuration**: Admin edits the default workflow YAML to add custom regex patterns for org-specific identifiers (employee IDs, account numbers). Still no workflow authoring expertise needed.  
* **Custom workflow**: Advanced users who want full control can clone the default workflow and modify it, or author entirely separate workflows that subscribe to the same `inference.beforeCompletion` / `inference.afterCompletion` triggers.

### Space Scoping

Each workflow belongs to exactly one space. Enabling a workflow in space A has no effect on space B. There is no cross-space configuration.

## Dependencies

| Dependency | Owner | Status | Impact |
| :---- | :---- | :---- | :---- |
| Lifecycle hooks infrastructure (`invokeHook`) | One Workflow (\#16701) | Open, milestone 9.5 | Blocking — nothing works without sync workflow execution |
| Inline workflow executor | One Workflow | Proposed in workflows-aop | Blocking — required for in-process, synchronous step execution |
| Default workflow seeding | One Workflow | Proposed in workflows-aop | Required for zero-config admin onboarding |
| `inference.beforeCompletion` / `afterCompletion` hook registration | Inference \+ One Workflow | Open | Blocking — hooks must be registered before workflows can subscribe |
| `chatComplete` hook invocation | Inference | Open | Blocking — wires hooks into every LLM call |
| `ai.pii` workflow step | One Workflow | Proposed in workflows-aop | Blocking for P1 — the regex/HMAC detection step |
| `transform.pii_restore` workflow step | One Workflow | Proposed in workflows-aop | Blocking for P1 — the de-anonymization step |
| Legacy settings migration | One Workflow | Open | Needed for Observability AI Assistant upgrade path |
| Hook outcome surfacing | One Workflow (\#16704) | Open | Needed for fail-open indicator (anonymization unavailable notice) |
| Design for hooks UX | Design (\#16705) | Open, assigned to @r4zr32d3k1l | Needed for admin toggle, entity configuration, centralized management |
| Removal of existing anonymization implementation | Security / Inference | Disabled in codebase (`ANONYMIZATION_FEATURE_ACTIVE = false`) | Should be removed to avoid confusion and dead code |
| NER model deployment | ML team | Existing (.ner\_model\_1) | Phase 2 only — must be available via inference API |

──────────────────────────────────────────────────

## What We Are Not Building

* **Field-level Allow/Anonymize/Deny** — ESQL lineage limitations make per-field anonymization unreliable for Agent Builder tool outputs. Text-level scanning via hooks sidesteps this entirely.  
* **Persistent token mappings** — No `.kibana-anonymization-replacements` index. Token maps are call-scoped, in-memory, and discarded when `chatComplete` returns. There is no persistence infrastructure.  
* **Anonymization profiles in Stack Management** — No dedicated profiles page. Configuration lives in the workflow definition, enabled per space.  
* **Cross-session token continuity** — Tokens are scoped to a `sessionId`. A new conversation with a different session ID will produce different tokens for the same values. This is intentional: no persistent PII linkage across conversations.  
* **Anonymization for stored artifacts** — Chat messages, case attachments, and Knowledge Base entries are stored with original values. Only LLM-bound data is anonymized. The goal is to protect data that leaves the system, not data at rest.  
* **Per-agent anonymization configuration** — Anonymization is configured per space, not per agent. All agents in a space share the same anonymization workflow(s). Per-agent differentiation can be achieved by placing agents in separate spaces, alternatively we could thread an agent identifier through `chatComplete` metadata and add conditional guards in the workflow YAML if needed.
* **NER-based detection (Phase 1)** — Named entity recognition is deferred to Phase 2. Phase 1 covers structured PII (IPs, emails, hostnames, usernames, custom regex patterns).

──────────────────────────────────────────────────

## References

* Lifecycle Hooks epic: [\#16700](https://github.com/elastic/security-team/issues/16700) (One Workflow, milestone 9.5)  
* Architecture proposal: [workflows-aop](https://github.com/talboren/workflows-aop/blob/main/README.md)  
* Security migration issue: [\#14441](https://github.com/elastic/security-team/issues/14441) (Anonymization Support)  
* Guardrails PR: [\#255848](https://github.com/elastic/kibana/pull/255848) (existing `ai.guardrails` step)  
* Pierre's ESQL lineage concern + team discussion: [Slack thread, Jan 27](https://elastic.slack.com/archives/C08RSJUPCC8/p1769531326077459)  
* Shay's feedback on bare-bones direction: [Slack thread, March 31](https://elastic.slack.com/archives/C08U04SUN49/p1774387290094889)
