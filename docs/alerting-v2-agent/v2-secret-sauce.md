# Alerting v2 — What Makes It Special

> Reference for ensuring agent features and M2 demo accentuate what v2 does that v1 physically cannot.

---

## The seven architectural shifts

### 1. Declarative ES|QL rules (rules are data, not code)

**V1:** Each solution registers a `RuleType` with a custom executor function, custom params schema, and custom action groups via `alerting.registerType()`. Detection logic is opaque code scattered across dozens of plugins. No external system can reason about what a rule *does* — you'd have to read the executor source.

**V2:** Rules are declarative ES|QL configurations — a query, a schedule, recovery settings, grouping, no-data behavior. The detection logic lives in the query string, not in compiled code. Every rule has the same shape.

**Why it matters for the agent:**
- The agent can *read*, *understand*, and *generate* rules because they're structured data
- Simulation and replay are possible — run the ES|QL against a historical window to predict alert volume
- Rule comparison and deduplication become structural operations, not guesswork
- Intent-to-rule translation is a natural fit: natural language → ES|QL + config defaults

**V1 can't do this:** An agent would need to understand every solution's custom executor to reason about rules. There's no uniform structure to analyze or generate.

---

### 2. Independent recovery queries (detection ≠ recovery)

**V1:** Recovery is always the inverse of detection. If the executor calls `scheduleActions()` this cycle, the alert is active; if it doesn't, the alert recovers. There's no way to define separate "what triggers this?" and "what resolves this?" logic. The `autoRecoverAlerts` flag and `recoveryActionGroup` exist, but recovery is simply "the condition stopped being true."

**V2:** Rules have a first-class `recovery_policy` with two modes:

| Mode | Behavior |
|------|----------|
| `no_breach` (default) | Recover when the evaluation query stops matching — similar to v1 |
| `query` | A **completely separate ES\|QL query** determines recovery independently |

When `type: 'query'`, the `CreateRecoveryEventsStep` executes the recovery query against Elasticsearch as a distinct operation from the evaluation query. The recovery query has its own `base` ES|QL and optional `condition`, and its results are compared against currently active group hashes to build recovery events.

This means detection and recovery can query different indices, different time windows, or different conditions entirely. For example:
- **Evaluation:** `FROM metrics-* | WHERE cpu_usage > 90` (detect high CPU)
- **Recovery:** `FROM deployments-* | WHERE status == "scaled_up"` (recover when autoscaler has responded)

**Why it matters for the agent:**
- The agent can propose recovery logic that reflects real-world resolution, not just "the symptom went away"
- Intent-to-rule becomes richer: "alert when CPU spikes, recover when the deployment scales" is a single rule, not a workaround
- Simulation can independently model detection and recovery rates, showing users how recovery query choice affects episode duration and noise
- The agent can detect rules where `no_breach` recovery is inappropriate and suggest a query-based alternative: "this rule fires on transient spikes that self-resolve in seconds — a recovery query checking sustained normal state would reduce noise"

**V1 can't do this:** Recovery is hardwired to "the detection condition is no longer true." You can't express "resolve this alert when a different condition is met" — you'd need a second rule and manual correlation.

---

### 3. Episodes — a real alert lifecycle

**V1:** Alert "instances" are loosely tracked in Task Manager state (`alertInstances` / `alertRecoveredInstances`). They're binary: active or recovered. Flapping detection is bolted on. There's no durable identity for "this alert went active, stayed active for 3 cycles, then recovered."

**V2:** The **Director** manages **episodes** — a complete lifecycle with explicit states:

```
inactive → pending → active → recovering → inactive
```

Episodes have:
- Real UUIDs that persist across execution cycles
- Status counts (how many cycles in current state)
- Pluggable **transition strategies** (basic, count-timeframe, custom)
- Persistent storage in data streams (not ephemeral task state)

**Why it matters for the agent:**
- Recommendations are lifecycle-aware: "this episode has been pending for 5 cycles — consider lowering your threshold" vs. "this episode is active and escalating — route to on-call"
- Episode history enables trend analysis: "this rule generates short-lived episodes that recover within one cycle — it may be too sensitive"

**V1 can't do this:** Alert instances have no lifecycle states, no transition strategies, and no persistent history. You can't ask "how long has this been pending?" because "pending" doesn't exist.

---

### 4. Customizable state transitions (tunable signal quality)

**V1:** An alert is either active or recovered. There's a bolted-on flapping heuristic, but no user-facing control over *when* an alert becomes "real" or *when* recovery is confirmed. Every threshold breach immediately fires. Every non-breach immediately recovers.

**V2:** The `state_transition` configuration on each rule lets users control exactly how the Director moves episodes between lifecycle states:

| Setting | What it controls |
|---------|-----------------|
| `pending_count` | How many consecutive breaches before `pending → active` (e.g., "3 breaches in a row") |
| `pending_timeframe` | How long breaches must persist before `pending → active` (e.g., "breaching for 10m") |
| `pending_operator` | `AND` or `OR` — require both count and timeframe, or either |
| `recovering_count` | How many consecutive recoveries before `recovering → inactive` |
| `recovering_timeframe` | How long recovery must persist before confirming |
| `recovering_operator` | `AND` or `OR` for recovery thresholds |

This means a rule can express: "don't alert until CPU has been above 90% for 3 consecutive checks AND at least 5 minutes" — and separately: "don't consider it recovered until it's been below 90% for 2 consecutive checks OR at least 10 minutes."

The `CountTimeframeStrategy` in the Director evaluates these thresholds at every cycle, gating the `pending → active` and `recovering → inactive` transitions. The `BasicTransitionStrategy` ignores them (single-breach = active, single-recovery = recovered) and serves as the default fallback.

**Why it matters for the agent:**
- Flapping prevention is a configuration problem, not a heuristic — the agent can tune `pending_count` and `recovering_count` based on observed episode patterns
- The agent can reason about signal quality tradeoffs: "increasing `pending_count` from 1 to 3 would eliminate 80% of your sub-minute false alarms, but adds ~2 minutes of detection latency"
- Simulation becomes richer: replay historical data with different transition settings to show how alert volume and quality change
- The agent can detect over-sensitive rules ("this rule averages 2-second episodes — adding a `pending_count: 2` would filter the noise") and under-sensitive rules ("episodes are averaging 45 minutes — your `pending_count: 5` might be too conservative")

**V1 can't do this:** There's no pending state, no recovering state, and no user-configurable transition thresholds. An alert either fires or doesn't — the only knob is the detection condition itself.

---

### 5. Notification policies — decoupled from rules

**V1:** Notifications are *embedded in the rule saved object* — an `actions[]` array with connector IDs, Mustache templates, throttle settings, and alert filters. Changing who gets notified means editing the rule. Reusing notification config across rules means copy-pasting. The rule SO and its notification config share the same encrypted AAD envelope.

**V2:** **Notification policies** are separate first-class saved objects with their own CRUD API:

| Field | Purpose |
|-------|---------|
| `matcher` | KQL expression evaluated against episode + rule context (labels, severity, status) |
| `destinations` | Workflow references (not connector IDs) |
| `groupBy` | How to batch episodes into notification groups |
| `throttle` | Minimum interval between notifications for the same group |
| `snoozedUntil` | Policy-level snooze |

**The key insight:** Policies match episodes *dynamically* via KQL. One policy can cover hundreds of rules. Rules never reference policies — the match is evaluated at dispatch time by the Dispatcher.

**Why it matters for the agent:**
- "Change how production alerts notify" becomes a single policy edit, not 50 rule edits
- The agent can suggest policies based on intent: "notify the SRE team when any production rule fires a critical episode" → one policy with `matcher: 'rule.labels: "production" AND episode_status: "active"'`
- Policy consolidation: the agent can analyze existing notification patterns and propose fewer, smarter policies
- Cross-rule notification observability: "these 12 rules all match policy X"

**V1 can't do this:** Notification config is locked inside each rule. There's no cross-rule routing, no dynamic matching, no reusable policies.

---

### 6. The Dispatcher — notification as a separate pipeline

**V1:** Notifications run *inline during rule execution*. After the executor finishes, `ActionScheduler` runs three sub-schedulers (summary, system, per-alert) and enqueues connector executions. Notification logic is interleaved with detection logic in the same task.

**V2:** The **Dispatcher** is a completely separate Task Manager pipeline:

```
FetchEpisodes → FetchSuppressions → ApplySuppression → FetchRules → FetchPolicies
→ EvaluateMatchers → BuildGroups → ApplyThrottling → Dispatch → StoreActions
```

Key properties:
- Runs independently of rule execution (detection and notification are decoupled in time)
- Queries dispatchable episodes *across all rules* in a single pass
- Applies user-driven suppressions (ack, snooze, deactivate) before matching
- Evaluates KQL matchers to pair episodes with policies
- Builds notification groups with configurable grouping
- Applies throttling per notification group
- Dispatches to **workflows** (not connectors directly)
- **Records every decision** to an `alert_actions` data stream: `fire`, `suppress`, `throttle`, `unmatched`

**Why it matters for the agent:**
- "Why wasn't I notified?" is answerable — the audit trail captures every routing decision
- The agent can surface unmatched episodes ("these 5 episodes had no matching policy — want me to create one?")
- Suppression reasoning is explicit (snoozed, acknowledged, deactivated)
- Notification observability is built into the architecture, not bolted on

**V1 can't do this:** Notification decisions are scattered across per-rule task runs with no centralized audit. There's no way to ask "what happened to this alert's notification?" after the fact.

---

### 7. Workflows as notification destinations

**V1:** Actions execute **connectors** — Slack, email, PagerDuty, webhook. Each is a simple send-and-forget operation with Mustache-templated params.

**V2:** Notification policies dispatch to **workflows** via `workflowsManagement.scheduleWorkflow()`. Workflows are programmable multi-step definitions, not single-shot connectors.

**Why it matters for the agent:**
- Notification destinations can include conditional logic, multi-step orchestration, and branching
- The agent can help author workflow definitions that go beyond "send a message"
- Future potential: agent-assisted incident response workflows triggered by notification policies

---

## Agent feature opportunities that only v2 enables

| Opportunity | V2 mechanism | V1 equivalent |
|-------------|-------------|---------------|
| "Convert my intent into a rule" | Declarative ES\|QL — agent generates structured config | Impossible — would need to generate custom executor code per solution |
| "Simulate this rule before saving" | Run the ES\|QL against historical data | Impossible — executor is opaque code |
| "Recover when the fix lands, not when the symptom stops" | Independent recovery query (`recovery_policy.type: 'query'`) with its own ES\|QL | Impossible — recovery is always the inverse of detection |
| "Find redundant rules" | Structural comparison of uniform rule shapes | Would need solution-specific heuristics per rule type |
| "Route all prod alerts to SRE Slack" | One notification policy with KQL matcher | Edit every production rule individually |
| "Why wasn't I notified about X?" | Query `alert_actions` data stream for suppress/throttle/unmatched records | No audit trail exists |
| "This alert keeps flapping — tune it" | Adjust `state_transition` settings (pending/recovering count, timeframe, AND/OR) | No user-facing transition controls — flapping is a heuristic you can't configure |
| "Show me what happens if I require 3 consecutive breaches" | Replay historical data with different `pending_count` values | Impossible — no pending state exists |
| "What needs action right now?" | Query episodes by lifecycle state (`active`, `pending`, `recovering`) | Query alert instances with no lifecycle granularity |
| "Suggest smarter notification grouping" | Modify policy `groupBy` and `throttle` — affects all matched rules | Per-rule throttle/frequency config with two overlapping models |
| "Consolidate notification config" | Analyze and merge notification policies (separate objects) | Would mean rewriting actions[] on dozens of rule SOs |

---

## Framing guidance for issues and demos

When writing issues or demo narratives, emphasize:

1. **"One policy, many rules"** — any feature that shows a single notification policy covering multiple rules is a v2-only capability
2. **"Because it's ES|QL, the agent can..."** — simulation, comparison, generation, and explanation are enabled by rules being data
3. **"Episode-aware"** — any recommendation or summary that uses lifecycle state (pending, active, recovering) or transition strategies is v2-only
4. **"The system tells you why"** — the dispatcher audit trail (fire/suppress/throttle/unmatched) gives v2 built-in explainability that v1 lacks
5. **"Rules don't know about notifications"** — the decoupling itself is the feature; show workflows where you change notification behavior without touching any rule
6. **"Detection and recovery are different questions"** — independent recovery queries let rules model real-world resolution (the fix was deployed, the ticket was closed, the scaling completed) instead of just "the symptom stopped"
7. **"Tune signal quality, not just thresholds"** — state transition settings let users (and the agent) control how many breaches or how much time before an alert is confirmed, and how many recoveries before it's closed — flapping prevention as a first-class configuration, not a heuristic
