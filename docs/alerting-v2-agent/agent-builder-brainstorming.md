# Agent builder — brainstorming

Catalog of agent builder skills, flows, and workflows that leverage Alerting v2's declarative rules, episodes, and notification policies to help users author, migrate, debug, tune, triage, and analyze their alerting setup.

| Type | Meaning |
|------|---------|
| **Skill** | Invoked through the agent builder chat interface |
| **Flow** | Embedded in the application UI (wizard, inline assistant, contextual nudge) |
| **Workflow** | Multi-step orchestration triggered by an event (e.g. alert fires → investigate → create case) |

---

## Rule authoring

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| Intent to rule | Skill | Map user intent → full v2 rule (ES\|QL, schedule, grouping, no-data, recovery policy, transitions). | Single rule type makes intent mapping more straightforward for the agent, leading to better results. ES\|QL, custom field indexing, and richer state transition config allow more user intent to be expressed than v1 ever could. |
| Intent to notification policy | Skill | Map user intent → notification config: connectors, channels, severity routing, throttle/dedupe, quiet hours, escalation, breach vs. recovery vs. no-data. | Notification policies are first-class in v2 and can span multiple rules — vs. v1 where actions are wired per-rule. A single policy covering many rules means less repetitive config and richer routing and escalation options. |
| Rule coverage | Skill | Given a service, index, or set of indices, identify alerting blind spots — what is monitored, what isn't — and suggest rules to fill the gaps. | |
| Rules on existing signals | Skill | Compose a new rule on top of existing signal rules — rather than raw source data. Agent identifies available signal rules, drafts alerting rules on top of them. | ES\|QL makes signal-on-signal composition natural — no special executor needed. Single rule type makes it easier for the agent to evaluate existing signal rules and signal data in the system. Streams and OTel content packs ship known signal indices with well-defined schemas. Signal rule type allows finding meaning from noise. |
| Rule management | Skill | Read, update, delete, enable, disable, and snooze rules via natural language — single or bulk. "Disable all rules targeting metrics-*", "change the schedule on my CPU rules to 5m", "delete all rules tagged staging". | |

---

## V1 rule migration

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| V1 intent to v2 rule | Skill | Intercepts a request framed around a v1 rule type (e.g. "create a threshold rule") and translates it into a v2 equivalent, explaining the differences. If successful, offers to convert more of the user's existing v1 rules. | Allows users to hook into episode history tracking, custom alert fields, and reusable notification policy and workflow logic — none of which are available in v1. |
| Migrate v1 rule to v2 | Skill | Take a v1 rule (type, params, schedule, actions) and produce a draft v2 rule plus a parity report: ES\|QL detection, mapped recovery/episode settings, notification wiring, and explicit gaps where v1 behavior cannot be matched. | Allows users to hook into episode history tracking, custom alert fields, and reusable notification policy and workflow logic — none of which are available in v1. |
| V1 conversion wizard | Flow | Surfaced on the v1 rule list and rule detail page. One click starts a guided conversion experience that prepares a proposed v2 migration for review. If multiple v1 rules exist, offer batch conversion. | Allows users to hook into episode history tracking, custom alert fields, and reusable notification policy and workflow logic — none of which are available in v1. |

---

## Rule debugging

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| Why is this rule firing? | Skill | Given an active or recently fired rule, explain what triggered it — which ES\|QL condition matched, what data drove it, which groups are affected, how long the episode has been active. | Episode context gives full visibility into how long the alert has been active, its current state, and the complete execution history — not possible with v1's ephemeral alert instances. |
| Why is this rule not firing? | Skill | Given a rule the user expects to fire, diagnose likely causes — no results, threshold not met, no-data handling, schedule lag, rule disabled/erroring — and suggest fixes. | |
| Rule enrichment | Skill + Flow | Detect rules that lack runbooks or associated dashboards and offer to generate them. For runbooks: draft investigation steps, likely causes, and resolution actions based on the rule's query and context. For dashboards: propose relevant visualizations and create them linked to the rule. | Declarative ES\|QL means the agent can read and understand what a rule does to draft a relevant runbook — vs. v1 where logic is opaque executor code. |

---

## Rule tuning

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| Tune a noisy rule | Flow | Highlight rules firing above a threshold (e.g. N times/day) in the rule list. Click opens a tuning wizard that analyzes episode history and walks through threshold, condition, transition, and recovery policy options with before/after firing estimates. | Episode history and configurable state transitions give the agent concrete data to reason about rule behavior over time and suggest meaningful changes — not possible with v1's ephemeral alert state. |
| Tune a quiet rule | Flow | Surface silent rules (never fired, or no results in X days) in the rule list. Click opens a tuning wizard that diagnoses the likely cause and proposes changes — lower thresholds, loosen filters, broaden time window, fix index pattern, adjust no-data behavior. | |
| Comparative visualization | Flow | Side-by-side replay of two rule configurations against the same historical window, surfaced as a step in the tuning wizard to show how a proposed change would have shifted episode counts, duration, or recovery speed. | |
| What-if replay | Flow | Re-run a historical episode against a modified rule config to show how the outcome would have differed. Surfaced as a step in the tuning wizard; user adjusts params inline and sees a before/after timeline. | |
---

## Alert and incident triage

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| Explain and replay an alert | Skill | Summarize an active alert in plain language — what fired, which group, how long it's been active, and what the data looks like — then walk through the episode execution-by-execution: data per cycle, state transitions (pending → active → recovering → inactive), and what drove recovery or prolonged the alert. | |
| Visualize an episode | Skill + Flow | Render a timeline of an episode — metric value per cycle overlaid with state transitions. Agent resolves original field types via `_field_caps` on the source index and applies ES\|QL type coercion (`TO_LONG()`, `TO_DOUBLE()`, `TO_DATETIME()`); falls back gracefully if the source index is unavailable. | |
| Save to dashboard | Skill + Flow | After generating any visualization, offer to add it to an existing dashboard or create a new one pre-populated with the generated charts, associated with the rule and reachable from the rule detail page. | |
| Prioritize active alerts | Skill + Flow | Rank or group a set of active alerts by severity, episode duration, affected group size, or recurrence pattern, and explain the ordering. Surfaced inline on the alert list as a ranked view the agent can populate on demand. | |
| Suggested next action | Skill + Flow | Based on alert context (rule type, episode state, data), suggest a next step — investigate, escalate, snooze, or update the rule. Suggestions are contextual: informed by known issues surfaced from the data, past episode patterns, and relevant runbooks. Can also propose off-Kibana solutions such as external escalation paths, remediation playbooks, or infrastructure actions. Surfaced inline on the alert detail page or alert list row. | |
| Automatic agent analysis | Flow | Toggle on a rule or notification policy to enable agent analysis on every alert without authoring a workflow step. When an alert fires, the agent automatically evaluates context — correlated alerts, recent episode patterns, source data — and produces a natural language summary. Results are persisted to a dedicated index, building up a historical knowledge base of alert context over time (similar to how Streams accumulates knowledge indicators about data). Users can opt in per rule or per notification policy. Provides the core value of a custom incident evaluation workflow without the setup cost. | |
| Custom incident evaluation | Workflow | Triggered when an alert fires; runs a user-defined investigation sequence — querying logs, traces, correlated alerts, and episode data — then synthesizes findings, determines severity, and creates a case with the results attached. Users author the workflow steps; the agent provides the intelligence at each step. Notification policies can span multiple rules, so a single policy can aggregate alerts from several rules and trigger the workflow once with all of them as input — allowing the agent to evaluate the full picture rather than each alert in isolation. | |

---

## Alerting analytics

| Name | Type | Description | v2 benefit |
|------|------|-------------|------------|
| Natural language analytics | Skill | Answer questions about alerting health and history in plain language — "which rules fired most last month?", "has my alert volume changed since the last deployment?", "what's my average episode duration by service?" Agent translates intent into ES\|QL over episode and execution data and summarizes the result. | |

