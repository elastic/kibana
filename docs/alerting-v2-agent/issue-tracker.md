# Alerting v2 — Agent Features: Issue Tracker

> Parent epic: [elastic/rna-program#307](https://github.com/elastic/rna-program/issues/307)

## Created issues

> Hierarchy: epic [rna-program#307](https://github.com/elastic/rna-program/issues/307) → skill meta → tool meta → sub-issues

| Title | Kibana Issue | Parent |
|-------|-------------|--------|
| [Alerting V2] [Agent] [Meta] Rule authoring skill — natural language intent to rule draft | [#261378](https://github.com/elastic/kibana/issues/261378) | rna-program#307 |
| [Alerting V2] [Agent] [Meta] Implement get_rule_context tool for v2 rule authoring | [#261371](https://github.com/elastic/kibana/issues/261371) | #261378 ⚠️ re-parent manually |
| [Alerting V2] [Agent] Fetch and validate user privileges | [#261372](https://github.com/elastic/kibana/issues/261372) | #261371 |
| [Alerting V2] [Agent] Set up evaluation suite boilerplate | [#261376](https://github.com/elastic/kibana/issues/261376) | #261371 |
| [Alerting V2] [Agent] Implement draft_rule tool for v2 rule authoring | [#261390](https://github.com/elastic/kibana/issues/261390) | #261378 |
| [Alerting V2] [Agent] Implement propose_rule tool for v2 rule authoring | [#261399](https://github.com/elastic/kibana/issues/261399) | #261378 |
| [Alerting V2] [Agent] Implement create_rule tool for v2 rule authoring | [#261402](https://github.com/elastic/kibana/issues/261402) | #261378 |
| [Alerting V2] [Agent] [Meta] Implement get_notification_policy_context tool for v2 rule authoring | [#261411](https://github.com/elastic/kibana/issues/261411) | #261378 |
| [Alerting V2] [Agent] Implement draft_notification_policy tool for v2 rule authoring | [#261412](https://github.com/elastic/kibana/issues/261412) | #261378 |
| [Alerting V2] [Agent] Implement propose_notification_policy tool for v2 rule authoring | [#261416](https://github.com/elastic/kibana/issues/261416) | #261378 |
| [Alerting V2] [Agent] Implement create_notification_policy tool for v2 rule authoring | [#261419](https://github.com/elastic/kibana/issues/261419) | #261378 |

---

## Issues to create

### M1 — Security & Authorization Foundation
- [ ] S1 — [Agent] Enforce user RBAC for all alerting agent actions
- [ ] S1a — [Agent] Prevent alerting tools from using internal ES client for data operations
- [ ] S2 — [Agent] Implement least-privilege context retrieval for alerting agent sessions
- [ ] S3 — [Agent] Require explicit user confirmation before agent executes any alerting action
- [ ] S4 — [Agent] Retain compliance log for all alerting agent actions
- [ ] S5 — [Agent] Standardize permission-denied response pattern for alerting agent flows
- [ ] S6 — [Agent] Define and implement unified agent action log schema

### M1.5 — Rule Authoring & Management
- [ ] A1 — [Agent] Convert natural language intent to ES|QL rule draft
- [ ] A2 — [Agent] Propose recovery logic and flapping settings during rule authoring
- [ ] A3 — [Agent] Simulate expected alert volume and quality tradeoffs before rule save
- [ ] A3-infra — [Agent] Simulation/replay engine for historical window evaluation
- [ ] A4 — [Agent] Detect stale, noisy, and duplicate rules and propose consolidation
- [ ] A5 — [Agent] Draft multi-rule bulk edits with user approval and audit trail

### M1.5 — Alert Management
- [ ] M1 — [Agent] Generate "what needs action now" active alert summary
- [ ] M2 — [Agent] Recommend acknowledge/assign/snooze/escalate actions for active alerts
