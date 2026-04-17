# Alerting v2 — Agent Features: M1 Security & Authorization Foundation

> These requirements must be complete before any agent feature ships to users.

---

## Requirements

| # | Category | Requirement | Notes |
|---|----------|-------------|-------|
| S1 | Permissions | Enforce existing rule/alert RBAC before showing or taking any actions | Agent never bypasses RBAC |
| S2 | Data minimization | Use least-privilege context retrieval per user/session | Avoid broad data pull by default |
| S3 | Action gating | All actions require explicit user confirmation, including bulk operations | |
| S4 | Compliance | Retain logs for all actions performed by agents | |

---

## Open Questions

### S1 — Permissions

**Code findings:** The agent builder already enforces user RBAC implicitly by design. Both `ToolHandlerContext` and `AgentHandlerContext` provide clients scoped to the current user:
- `esClient: elasticsearch.client.asScoped(request)` — all ES operations run as the requesting user
- `savedObjectsClient: savedObjects.getScopedClient(request)` — all SO reads/writes run as the requesting user

The `KibanaRequest` is threaded through the full execution chain (`run_agent.ts` → `run_tool.ts` → `createToolHandlerContext`), so any Kibana service a tool uses will inherit the user's RBAC automatically. This matches the standard Kibana pattern for authorization.

**Caveat:** This is implicit, not enforced at the agent layer. Two gaps exist:
1. A tool could explicitly call `elasticsearch.client.asInternalUser` to bypass user scoping. The `persistedProviderFn` in `tools_service.ts` already does this for fetching tool definitions (acceptable), but there is no guard preventing alerting tools from doing it for data access (not acceptable).
2. `isAvailable()` in the tool registry receives the `request` and can gate tool visibility per user, but this is per-tool opt-in with no centralized enforcement.

**Open questions:**
- How are permission errors surfaced to users? The requirement enforces RBAC but does not define what the agent communicates when an action is blocked.
- Should there be a standardized agent permission-denied response pattern (message + reason + suggested alternative)?
- Does this apply to read actions (showing data) as well as write actions, or write-only?
- Should alerting agent tools be explicitly prohibited from using `asInternalUser` for data operations? If so, this needs a lint rule or architectural constraint, not just a convention.

### S2 — Data minimization
- What is the defined scope of "context"? Is least-privilege enforced per-flow, per-request, or per-session?
- Who defines what constitutes "broad" vs. "minimal" data pull for each agent flow?
- How does this interact with the simulation/replay engine (needed by M1.5 A3), which may need to pull historical data?

### S3 — Action gating
- What is the confirmation UX pattern — modal, inline, step-by-step wizard?
- Is there a distinction between single-action confirmation and bulk confirmation UX?
- Does "explicit confirmation" mean a user must type/click, or is a preview + proceed sufficient?

### S4 — Compliance / Audit log
- This requirement overlaps with the M1.5 bulk edit audit trail (A5) and the Migration governance requirement (GA). Should these all write to one unified agent action log, or are they separate?
- What is the retention policy and storage location for logs?
- What fields are required per log entry (actor, action type, target, timestamp, outcome, context snapshot)?
- Does this log need to be user-visible (e.g., rule history panel), admin-visible only, or both?

---

## Proposed Additions

The following gaps were identified during review. Each should be confirmed or rejected before M1 scope is locked.

| # | Proposed Requirement | Rationale |
|---|----------------------|-----------|
| S5 | Define a standardized agent permission-denied response pattern | S1 enforces RBAC but no requirement covers the UX when access is denied. Without this, each flow will handle it differently. |
| S6 | Define the unified agent action log schema | S4, A5, and Migration governance all imply logging. Defining the schema at M1 prevents three divergent implementations later. |
