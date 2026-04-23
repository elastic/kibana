# RFC: Managed (System) Workflows

**Status:** Draft
**Authors:** Workflows Engine Team
**Date:** 2026-04-19

---

## Problem Statement

Solution teams across Security, Observability, and Search are building product functionality powered by workflows: AI-driven alert analysis, background data pipelines, plugin-distributed automation. These workflows are defined by solution teams, not by end users. They run on the same engine as user-authored workflows but are owned and maintained by the teams that create them.

Today, none of this is first-class. Teams are building ad-hoc provisioning and reconciliation workarounds (e.g., Security Insights' `WorkflowInitializationService` with tag lookup, YAML diffing, cache, retry/backoff), and users can break product features by editing or deleting the workflows that power them.

### What's Needed

A first-class **managed workflow** concept where plugins can declare bundled workflows that are:

- Auto-provisioned per space
- Kept in sync on upgrades
- Protected from user mutation
- Still visible, executable, and clonable by users

### Consumers

| Team | Use Case | Status |
|------|----------|--------|
| **Security — Attack Discovery** | 4 bundled YAML workflows + 4 custom steps for alert analysis | In production, ad-hoc provisioning |
| **Security — Entity Analytics** | Background entity maintenance (relationships, behavioral, watchlists) | Exploring (#15382) |
| **Security — Agent Builder** | Heartbeat workflows, potentially dynamic registration | POC (#16393) |
| **O11y — Streams** | Significant Events: feature detection, description generation, insights discovery | Evaluating as Task Manager replacement (streams-program#1001) |
| **Search** | Plugin-distributed workflows for Agent Builder | Planned (search-team#13253) |

---

## Requirements

### Must Have

#### Core

| # | Requirement | Details |
|---|-------------|---------|
| **R1** | **Distinguish managed from user-defined** | The platform must be able to distinguish managed workflows from user-defined ones. The designation is not user-settable. How this is achieved (a flag on the same index, a separate index, or other mechanism) is discussed in the [Storage](#1-storage) section of the technical design. |
| **R2** | **Server-side read-only enforcement** | Mutation APIs (`updateWorkflow`, `deleteWorkflows`, and their REST routes) reject updates and deletions of managed workflows. The only permitted user mutation is the enable/disable toggle, which requires a `--force` flag to ensure intentionality (see R3). For any other changes, the user must clone the workflow into a user-owned copy and edit the clone. Enforcement is server-side — UI-only restrictions are insufficient since API callers can still mutate. |
| **R3** | **Enabled by default, with opt-out** | Registered managed workflows are active by default (`management.defaultEnabled: true`). The registration contract supports `management.defaultEnabled: false` for opt-in patterns where a product feature activates the workflow on the user's behalf. On reconciliation (new version), the platform's behavior depends on `management.enablement`: `'restorable'` (default) preserves the user's current enabled state; `'enforced'` resets to `management.defaultEnabled`. |
| **R4** | **Ownership metadata** | Every managed workflow identifies its owning plugin, team, or feature. Visible when inspecting the workflow. |
| **R5** | **Registration mechanism** | A way for solution teams to register managed workflows with the platform, including the workflow definition and ownership metadata. The workflow plugin handles installation and activation. See [Registration](#3-registration) in the technical design. |
| **R6** | **Caller-provided workflow ID with uniqueness guarantee** | Plugins can specify stable, deterministic IDs instead of auto-generated IDs. IDs must be globally unique so all existing APIs continue to serve both managed and user-defined workflows unambiguously. See [Open Questions > Registration #3](#id-uniqueness) for enforcement approaches. |
| **R7** | **Custom triggers and custom steps** | Managed workflows support custom step types and custom triggers registered via `workflows_extensions`. Same engine, same capabilities. |
| **R8** | **Existing guardrails apply** | All existing concurrency strategies, execution limits, and guardrails apply to managed workflows. |
| **R9** | **Enterprise tier gating** | License tier gating. The workflow engine and managed workflow support are available on Enterprise tier (ECH), Complete tier (Serverless Security and Observability), and all Elasticsearch/Search project tiers. Features registering managed workflows must be available at these tiers. On tiers where the engine is unavailable, managed workflows are not installed or executed. This is a platform-level gate, not a per-workflow decision. |
| **R10** | **Metering and billing** | Managed workflow executions are metered internally for capacity planning and operational visibility. By default, managed workflow executions are not counted toward the customer's workflow execution meter (billable: false). The registering team may declare a managed workflow as billable (billable: true), in which case executions count toward the customer's meter. Billable managed workflows are expected to be opt-in (user explicitly enables the functionality through a product surface) and deliver standalone value beyond the feature they belong to. Only user-authored workflow executions and billable managed workflow executions are included in active billing. |

#### Lifecycle

| # | Requirement | Details |
|---|-------------|---------|
| **R11** | **Auto-provisioning across spaces** | At startup, managed workflows are provisioned into all existing spaces and into newly created spaces, without requiring the consuming plugin to trigger provisioning via request-scoped logic. See [Lifecycle](#5-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R12** | **Privileged update path** | The platform supports updating managed workflows on plugin upgrades (system update) while still blocking user edits. Without this, read-only enforcement prevents plugins from evolving their workflows. Pattern: create-if-absent, update-if-changed. See [Lifecycle](#5-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R13** | **Cleanup on plugin uninstall** | When a plugin is uninstalled, all managed workflows it owns (identified by `managedBy`) are removed from all spaces. See [Lifecycle](#5-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R14** | **Cleanup on unregistration** | When a managed workflow is no longer registered in code (i.e., the plugin removes the registration in a new release), the platform removes it from all spaces during startup reconciliation. See [Lifecycle](#5-lifecycle-provisioning-updates-cleanup) in the technical design. |

#### UI

| # | Requirement | Details |
|---|-------------|---------|
| **R15** | **Hidden by default** | Managed workflows do not appear in workflow management or execution views by default. |
| **R16** | **Opt-in visibility toggle** | A lightweight, consistent mechanism reveals managed workflows across management and execution surfaces. When visible, they are clearly distinguished from user workflows (badge, icon, label). |
| **R17** | **Read-only when visible** | Users can view the full definition. Edit, delete, and disable controls are not available. |
| **R18** | **Execution view filtering** | Managed workflow executions are hidden by default. The same toggle mechanism reveals them. |
| **R19** | **UI enforcement + visual indication** | Managed workflows are visually indicated (badge/icon) in list and detail views. Edit, delete, and bulk-delete actions are disabled/hidden. |
| **R20** | **Clone into user-owned copy** | Users can clone a managed workflow into an editable copy. See [Open Questions > Cloning #11](#cloning) for behavior details. |

### Should Have

| # | Requirement | Details | Requested By |
|---|-------------|---------|--------------|
| **S1** | **Version/hash tracking** | Track a content hash so the platform can determine if updates are needed without fetching and string-comparing full YAML. Also drives the reconciliation lifecycle (create-if-absent, update-if-changed, skip-if-matching) — see [Lifecycle](#5-lifecycle-provisioning-updates-cleanup). | Security (andrew-goldstein) |
| **S2** | **Caller-provided execution ID** | Support a caller-specified unique execution ID for correlation and deduplication. | O11y (ruflin, cesco-f) |
| **S3** | **Caller-provided execution metadata** | Allow callers to attach arbitrary metadata to an execution for debugging and correlation. | — |
| **S4** | **Plugin-controlled install decision** | Achieved out of the box with the imperative `install()` API — the consuming plugin explicitly decides whether to call `install()` based on any condition (license tier, deployment type, feature flags, space, etc.). No separate `shouldInstall` hook is needed; the plugin owns the decision logic and only calls `install()` when its conditions are met. | Security AB (KDKHD) |

### Nice to Have / Deferred

| # | Requirement | Details | Requested By |
|---|-------------|---------|--------------|
| **N1** | **Post-start / dynamic registration** | Support registration after plugin `start()`, not just `setup()`. Enables user-action-triggered managed workflows. Creation and deletion are straightforward (plugin calls an API). See [Registration > §3.2](#3-registration) and [Lifecycle > §5.2](#5-lifecycle-provisioning-updates-cleanup). | Security AB (KDKHD) |
| **N3** | **Registration health / introspection** | Registry view: what's registered, what's installed per space, version/hash. | Security AB (KDKHD) |
| **N4** | **Standardized gating + rollout controls** | Feature flags for progressive enablement of managed workflows. Achievable via S4 — the consuming plugin gates its `install()` call on any condition (feature flags, space, deployment type, etc.) without a separate rollout mechanism. | Security AB (KDKHD) |
| **N5** | **Out-of-band updates** | Update managed workflow definitions outside of Kibana release cycles. Related to integration-based distribution (N7). | Security AB (KDKHD) |
| **N6** | **Type safety for code-defined workflows** | The centralized `@kbn/workflows/managed` package exports typed ID constants and `ManagedWorkflowDefinition` objects. Consumers import typed IDs and pass them to `managedWorkflows.install(id)` — unknown IDs are compile-time errors. See [Registration > §3.1](#3-registration). | Security AB (KDKHD) |
| **N7** | **Integration-based distribution** | Ship managed workflows as part of integrations. Registration happens through the integration lifecycle (install/uninstall). | O11y (ruflin), Search (pgayvallet) |
| **N8** | **Partial user editability** | Allow the registering plugin to declare specific properties as user-editable while keeping the rest read-only. See [Open Questions > Mutability #4](#mutability) for the full design discussion, upgrade conflict analysis, and the recommended first-phase approach. | — |

### Telemetry

- Count of managed workflows registered (by owning team/feature)
- Count of managed workflow executions (for internal capacity planning, not billing)
- Managed workflow executions as a percentage of total executions
- Count of blocked modification attempts against managed workflows
- Count of clone operations from managed workflows
- How often users opt in to seeing managed workflows
- How often users open a managed workflow definition

---

## Related Initiatives

These are capabilities that interact with or are prerequisites for managed workflows but are tracked separately.

| Initiative | Issue | Relationship |
|------------|-------|--------------|
| **Configurable Execution Identity** | [#15718](https://github.com/elastic/security-team/issues/15718) | **Highest risk dependency.** Who does a managed workflow run as? Triggering user doesn't work for scheduled/background cases. Kibana system user is too restrictive (only `.kibana*`). Service accounts are the target but depend on this epic. Every consumer team has raised this. |
| **Workflow-Defined Priority** | [#258538](https://github.com/elastic/kibana/issues/258538) | Allow workflows to declare execution priority. Useful when system workflows are not time-sensitive and can be delayed under load, so they don't compete with other important workflows (system or user-defined). Requested by ruflin (O11y). |
| **Parallel Execution of Sub-Workflows** | [#16372](https://github.com/elastic/security-team/issues/16372) | O11y (miltonhultgren) needs parallel onboarding tasks across streams. Not supported today. |
| **Workflow Versioning** | [#15776](https://github.com/elastic/security-team/issues/15776) | First-class versioning for workflow definitions. Managed workflows currently use a SHA-256 hash for change detection (see [Lifecycle](#5-lifecycle-provisioning-updates-cleanup)); once versioning lands, managed workflows should adopt it. |
| **Workflow Template Library** | [#15748](https://github.com/elastic/security-team/issues/15748) | Pre-built workflow definitions that users install and own — free to edit after installation. Distinct from managed workflows (see [Open Questions > Scope #12](#scope)): templates are not reconciled or version-synced by the platform. Separate initiative, but the boundary between managed workflows and templates must be clear to avoid confusion. |

---

## Clarifications

### Managed workflow vs. workflow template

A managed workflow and a workflow template both ship a pre-built definition, but they differ in ownership after installation:

| | **Managed workflow** | **Workflow template** |
|---|---|---|
| **Definition ownership** | Platform keeps it in sync with what the product team ships. | User owns the definition after installation — free to edit. |
| **Reconciliation** | Create-if-absent, update-if-changed, orphan cleanup on every startup. | Installed once. No ongoing sync — the user's edits are authoritative. |
| **Versioning** | New versions shipped by the team automatically replace the previous version (preserving user's enabled state). | New template versions may be offered as an upgrade, but the user decides whether to apply. |
| **Read-only** | Yes (server-side enforced). Users clone to customize. | No — the installed instance is a regular user-owned workflow. |
| **Litmus test** | Does the platform keep the definition in sync with what the product team ships? **Yes.** | **No** — the user owns it after installation. |

This RFC covers managed workflows only. Templates are a separate initiative (see [Related Initiatives > Workflow Template Library](#related-initiatives)) and out of scope. A managed workflow that ships disabled and requires user enablement is still a managed workflow — it remains reconciled, versioned, and protected. The distinction matters because teams may be tempted to use managed workflows as templates; this table clarifies which pattern to use.

---

## Open Questions

### Registration

1. **~~Where does the registration API live?~~** — **Resolved.**
   Two-part answer: **definitions** live in a centralized package (`@kbn/workflows/managed`) owned by the workflows team via CODEOWNERS. **The imperative API** (`install` / `uninstall` / `enable` / `disable`) lives on the `workflows_extensions` start contract, following the same pattern as `emitEvent` for triggers — plugins interact by ID, without touching definitions. `workflows_extensions` delegates to `workflows_management` for storage and CRUD. This keeps the dependency graph unchanged (consuming plugins already depend on `workflows_extensions`), eliminates the approval-gate file (CODEOWNERS on the package replaces it), and provides a single source of truth for all managed workflow definitions. See [Registration > §3.1–§3.2](#3-registration) for the full design.

2. **~~Post-start registration — what are the use cases and how should it work?~~** — **Resolved.**
   Post-start registration is a first-class pattern via `management.lifecycle: 'dynamic'`. The workflow definition lives in `@kbn/workflows/managed` (known to the platform at startup), and the consuming plugin calls `managedWorkflows.install(id)` at any point post-start — on user action, entity creation, feature activation, etc. Cleanup is the plugin's responsibility via `managedWorkflows.uninstall(id)`. See [Registration > §3.2](#3-registration) and [Lifecycle > §5.2](#5-lifecycle-provisioning-updates-cleanup) for reconciliation behavior. Install-time dynamic values (e.g., connector IDs, entity IDs) via `yamlTemplate` are a future extension contingent on [Mutability #4](#mutability).

3. **~~How to prevent ID collisions between managed and user-defined workflows?~~** — **Resolved.**
   Reserved prefix (e.g., `system:`). `createWorkflow` rejects user-defined workflows with the reserved prefix — IDs are globally unique by construction. All read APIs (get, list, execute) work exactly the same for both managed and user-defined workflows, no changes needed. The `managed` flag on the document provides an additional layer of identification on the storage side. For mutations (enable/disable toggle), the update endpoint requires a `--force` flag to ensure user intentionality (see R2). The prefix is not used to determine whether a workflow is managed — it only guarantees collision-free coexistence.

### <a id="mutability"></a>Mutability

4. **Is there an actual need to modify parts of a managed workflow definition? What are the use cases?**
   The current position is "fully read-only" with clone-to-customize. Before investing in partial editability, we need concrete use cases that cannot be solved by cloning or by the overrides/constants mechanism. Two dimensions:

   - **User-driven:** Does any team need users to change the scheduling interval, connector ID, or trigger filters of a managed workflow without cloning? If so, which fields and why can't clone-to-customize work?
   - **Product-driven:** Does any team need the same managed workflow definition with parts modified in different scenarios, abstracted for the user (e.g., different rule ID, different scheduling intervals based on user action)?

   Note: partial editability with ongoing updates is effectively a hybrid between managed workflows and workflow templates (see [Clarifications > Managed workflow vs. workflow template](#managed-workflow-vs-workflow-template)) — the platform keeps the definition in sync, but the user or team also owns parts of it. This blurs the boundary and introduces the upgrade conflict problem below.

   **How it could work:** The registering plugin declares which properties are user-editable (an allowlist). The platform enforces the allowlist at the service layer — user mutations that touch non-allowlisted fields are rejected, allowlisted field changes are persisted.

   **The upgrade conflict problem:** If a user edits an allowlisted field (e.g., changes the scheduling interval from 10m to 1h), and a new Kibana release ships an updated version of the same managed workflow, should the platform:
   - **Overwrite user edits?** Simple, but the user loses their customization silently.
   - **Preserve user edits and merge?** Apply the new definition but keep the user's values for allowlisted fields. Complex — requires field-level merge logic, and the new definition may not be compatible with the old user values.
   - **Skip the update?** Leave the user's version in place. The workflow drifts from what the plugin intended. Risky.

   None of these options are clean. This is the core reason partial editability is deferred — it requires solving the managed/template hybrid problem, which is out of scope for the first delivery.

   **Overrides mechanism (alternative to full editability):** Two layers handle dynamic configuration without breaking the lifecycle:

   1. **Runtime values via `constants` or `inputs`.** For **scheduled runs**, `constants` can be stored as a separate field on the workflow document (merged with YAML-defined constants, document field takes precedence). For **manual runs**, the caller supplies values via workflow `inputs` at execution time. Neither affects `definitionHash` — reconciliation works normally, and existing constants are preserved across version upgrades.

   2. **`overrides` field (creation-time values).** Some values are needed at creation time, not just runtime — triggers (scheduling interval, trigger filters), tags, name, and description are all stored on the workflow document when it's provisioned. These can't be deferred to runtime. An `overrides` field on the document stores these creation-time customizations. When the workflow is provisioned, overrides are applied to the document fields before writing. The `definitionHash` is computed from the template YAML (not the overridden values), so it remains unaffected. When a new version is delivered, the platform reads the existing overrides and re-applies them to the new version before storing — the hash tracks the latest template version.

   Both are orthogonal to versioning — the lifecycle process is preserved since the workflow version is identified based on the hash.

   **Recommended first-phase approach:** For any other customization, the user should:
   1. Clone the managed workflow into a user-owned copy.
   2. Edit whatever is needed on the clone.
   3. Disable the original managed workflow.
   4. When a new version ships, the platform updates the definition but preserves the user's enabled state (the original stays disabled). The user can re-enable the updated original, clone and edit again if needed.

   This keeps the managed workflow definition clean (no merge conflicts), gives users full editing power on the clone, and the user stays in control of the enabled state across upgrades.

5. **~~Should managed workflows support being registered as disabled by default?~~** — **Resolved.**
   Yes. The `ManagedWorkflowRegistration` contract includes `management.defaultEnabled` (default `true`, settable to `false`). This covers both always-on patterns and opt-in patterns where a product feature activates the workflow on the user's behalf. The enable/disable toggle is a user-permitted mutation — not gated behind `--force`. On reconciliation, the platform's behavior depends on `management.enablement`: `'restorable'` (default) preserves the user's current enabled state; `'enforced'` resets to `management.defaultEnabled` (e.g., a critical fix that must be active). See R3.

6. **~~Should a `--force` flag allow overriding read-only?~~** — **Resolved.**
   The primary user path is: disable the managed workflow, clone it into a user-owned copy, and edit the clone freely. The platform preserves the user's enabled state across upgrades unless the registering team forces a reset (e.g., a critical fix that must be active). A `--force` flag on mutation APIs remains available as an operational escape hatch (API-only, not UI, logged) for testing, recovery, and urgent fixes — see the [Force Override](#21-force-override) technical design section.

### Lifecycle

6. **~~What happens if a workflow references a step or trigger from an unavailable plugin?~~** — **Resolved.**
   Cross-solution workflows are against Kibana best practices, and products are available/not based on tiering, so the consuming plugin gates its `install()` call accordingly (combined with the platform tier gate in R9) — a managed workflow should only be installed where its dependencies are available.

### Space Behavior

9. **How should managed workflows behave across spaces?**
   The product requirement is that managed workflows are space-aware and behave consistently in every space. Several product-level questions need stakeholder input before the implementation approach can be decided (see [Technical Design > Space Provisioning](#4-space-provisioning) for how these answers affect implementation):

   - **Global vs. per-space execution:** Is there a scenario where a system workflow should run once globally, not per space? E.g., a scheduled system workflow — should it execute once (globally) or once per space? Do all known use cases need space-scoped resources (connectors, rules, alerts, cases)?
   - **Per-space enablement:** When a user disables a managed workflow, should it be disabled across all spaces or only in the space where the action was taken?
   - **Scheduled execution context:** For user-action-driven runs, the space context comes from the request. For scheduled workflows, which space context do they run with?

### Execution

10. **How do teams know when a managed workflow finishes?**
   Options: polling via `getWorkflowExecutionById`, callback/hook provided at registration, event bus. ruflin: "event bus ideal, polling ok for now." KDKHD: "must be able to detect/get notified about status."

### Cloning

11. **~~When a managed workflow is cloned, what happens to the original?~~** - **Resolved.**
    The managed workflow remains unchanged. The clone is a fully independent user-owned workflow. UX should make clear that the user now has two workflows with the same logic. The user can disable the original if they want only the clone to run.

---

## Prior Art

Kibana already has a `managed` concept for saved objects. A root-level `managed` boolean exists on every saved object document (dashboards, visualizations, index patterns, etc.). Fleet uses it to mark assets installed by integrations. However, enforcement is **UI-only** — individual apps (Dashboard, Lens, Discover) disable edit/delete actions in the UI when `managed === true`, but core saved object APIs (`update`, `delete`) do not reject mutations server-side. Workflows are not saved objects and do not inherit this field, but the UX conventions (badge, disabled actions, clone-instead-of-edit) are worth reusing for consistency.

---

## Technical Design

### Current Architecture (Context)

The workflow platform consists of three plugins and a shared package:

| Component | Responsibility |
|-----------|---------------|
| **`workflows_extensions`** | Registry for custom step types, trigger types, and managed workflow operations. Plugins call `registerStepDefinition()` / `registerTriggerDefinition()` during `setup()`. At `start()`, exposes `managedWorkflows` API (`install` / `uninstall` / `enable` / `disable`) and `emitEvent` for event-driven triggers. |
| **`workflows_management`** | All REST API routes (`/api/workflows/*`), workflow CRUD via `WorkflowsManagementApi`, Task Manager scheduling, connector integration. Exposes `management: WorkflowsManagementApi` on setup contract. |
| **`workflows_execution_engine`** | Execution loop, Task Manager task types (`workflow:run`, `workflow:resume`, `workflow:scheduled`), metering, logs. Exposes `executeWorkflow`, `scheduleWorkflow`, etc. on start contract. Empty setup contract today. |
| **`@kbn/workflows`** | Shared types (`EsWorkflow`, `EsWorkflowExecution`), Zod schemas, YAML/JSON helpers. |

**Current indices:**

| Index | Content |
|-------|---------|
| `.workflows-workflows` | Workflow definitions (YAML, parsed definition, metadata, `spaceId`) |
| `.workflows-executions` | One document per execution run (status, context, definition snapshot) |
| `.workflows-step-executions` | Per-step execution records |
| `.workflows-execution-data-stream-logs` | Structured execution logs (data stream) |
| `.workflows-events` | Trigger event dispatch audit (data stream) |

**Current `WorkflowProperties`** (what's stored in `.workflows-workflows`):

```
interface WorkflowProperties {
  name: string;
  description?: string;
  enabled: boolean;
  tags: string[];
  triggerTypes: string[];
  yaml: string;
  definition: WorkflowYaml | null;
  createdBy: string;
  lastUpdatedBy: string;
  spaceId: string;
  deleted_at: Date | null;
  valid: boolean;
  created_at: string;
  updated_at: string;
}
```

No `managed` field, no ownership metadata, no version/hash.

---

### 1. Storage

Managed workflow **definitions** must live somewhere durable, queryable, and reconcilable. Execution-related indices (`.workflows-executions`, `.workflows-step-executions`, logs data stream) remain unchanged in both options — the execution engine is agnostic to whether a workflow is managed. An optional denormalized `managed` flag on execution documents may be useful for metering/UI filtering.

#### Option A — Dedicated index for managed definitions

User-authored workflow definitions remain in `.workflows-workflows`; managed definitions are stored in a **separate** system index (e.g., `.workflows-workflows-managed`).

- **Writes:** Only provisioning / reconciliation (internal callers) write the managed index; ordinary user CRUD continues to target the user index.
- **Reads:**
  - **Single document get** can hit one index if routing is unambiguous (e.g., known managed ID prefix, registry lookup, or "try managed index first").
  - **Unified list or search** ("all workflows in this space") requires **both** indices: two queries merged, one search against an index alias that spans both, or equivalent federation.
- **Elasticsearch isolation:** Per-document immutability is not a first-class ES feature, but a dedicated index allows **narrower index privileges** (only the internal workflow writer role may `write` on the managed index) as defense-in-depth. End-user read-only is still enforced in Kibana (service + routes).
- **Tradeoffs:** Stronger operational isolation and optional stricter ES roles; more plumbing (routing, dual reads or alias, two mappings/migrations, more failure modes if routing is wrong).

#### Option B — Same index + `managed` flag

Extend the existing `.workflows-workflows` index and document model with new fields:

| Field | Type | Description |
|-------|------|-------------|
| `managed` | `boolean` | `true` for managed workflows, `false` (default) for user workflows. Not user-settable. |
| `managedBy` | `string \| null` | Plugin ID that owns this workflow (e.g., `securityInsights`, `streams`). `null` for user workflows. Used for ownership tracking, reconciliation, and cleanup. |
| `definitionHash` | `string \| null` | SHA-256 of the YAML definition. Used for reconciliation (create-if-absent, update-if-changed). `null` for user workflows. |
| `originSystemWorkflowId` | `string \| null` | The registered system workflow ID this instance was created from. For workflows provisioned at startup with a deterministic ID, this equals the workflow's own ID. For post-start workflows that may be created multiple times with caller-provided or generated IDs (see [Open Questions > Post-start #2](#post-start)), this field links the instance back to the registered definition. Used together with `definitionHash` to detect version changes and apply reconciliation (updates, cleanup) across all instances of the same system workflow. `null` for user workflows. |
| `lifecycle` | `'static' \| 'dynamic' \| null` | Persisted copy of the `management.lifecycle` value from the registration. Required for orphan cleanup — the platform needs to know whether to auto-orphan a workflow even when the owning plugin is no longer present (uninstall scenario). `null` for user workflows. See [Lifecycle](#5-lifecycle-provisioning-updates-cleanup) for behavior per lifecycle type. |

The `management` policy fields (`lifecycle`, `versionStrategy`, `enablement`, `defaultEnabled`) are **not** stored on the workflow document — they live in the in-memory registration only. During reconciliation, the platform reads these values from the registered workflow definition and acts accordingly. This keeps the storage model lean and avoids persisting registration-time metadata that may change between releases.

The one exception is `lifecycle`: it is stored on the document as well (see mapping below) so that the platform can distinguish static from dynamic workflows during orphan cleanup, even for workflows whose owning plugin is no longer present (uninstall scenario).

New mapping additions (in `workflow_storage.ts`):

```typescript
managed: types.boolean({}),
managedBy: types.keyword({}),
definitionHash: types.keyword({ index: false }),
originSystemWorkflowId: types.keyword({}),
lifecycle: types.keyword({}), // 'static' | 'dynamic' — persisted for orphan cleanup when owning plugin is absent
```

- **Reads:** One index; list/detail APIs filter or label using `managed` (e.g., hide managed by default).
- **Writes:** User-originated mutations are rejected in the service layer when `managed === true`; internal reconciliation still updates the same documents on upgrade.
- **Elasticsearch isolation:** No extra boundary between user and managed docs at the index level; protection is application + route privileges, not separate indices.
- **Tradeoffs:** Simplest query and migration story, single code path for search/list; less ES-level isolation than a separate index.

#### Consideration: future partial user control (enable/disable, allowlisted fields)

If product later allows users to enable/disable managed workflows or edit only certain fields (e.g., `allowlisted` YAML keys, schedules, or support `--force` updates - which have already been requested), those flows are still user-originated mutations on managed documents. The right place to enforce that is one service layer — field-level validation, `managed` + policy flags, merge rules with platform-owned fields — not a physical split in Elasticsearch.

In that scenario, **Option A loses much of its appeal:**

- The same authorization and merge logic must exist in Kibana anyway; ES cannot express "user may patch `enabled` but not `steps`" per document.
- Narrow index privileges on a managed-only index are weaker: end-user requests still need to write to managed docs for those allowlisted changes, so the boundary is no longer "only internal jobs write here."
- Dual-index routing and federated list/search remain cost without compensating benefit.

**Option B scales more naturally** to "managed but partially user-editable" because it is already one document, one code path, with explicit rules for what the user vs. the platform may change.

**When Option A might still be justified:** unrelated requirements (compliance, retention, backup, or operational ownership of a separate index) — not user-edit semantics alone.

#### ES-level "read-only" note

Elasticsearch does not provide a per-document "immutable" flag. Index-wide read-only blocks would also block platform upgrades that must update managed definitions. **Primary enforcement remains Kibana service + authorization** in both options; Option A adds optional stricter index privileges as defense-in-depth.

#### Read-only enforcement (applies to both options)

Enforcement happens in `WorkflowsManagementService` (server-side), not in the UI:

- **`updateWorkflow`**: Before applying the update, load the existing document. If `managed === true` and the request does not carry a `force` flag (see section 2.1), reject with `403 Forbidden` and a descriptive error.
- **`deleteWorkflows`**: Same check per workflow ID. Reject deletion of any managed workflow unless `force` is set.
- **`enabled` toggle**: `updateWorkflow` already handles enable/disable. The managed check covers this — no separate guard needed.
- **Bulk operations**: The bulk delete route (`DELETE /api/workflows`) filters by IDs. The service checks each ID and rejects the entire batch if any target is managed (or rejects only the managed ones and succeeds on the rest — TBD).

The UI additionally disables edit/delete/disable controls for managed workflows (R13), but server-side enforcement is the source of truth.

---

### 2. API

**Where each capability lives:**

| Capability | Plugin | Rationale |
|------------|--------|-----------|
| **Definitions** (`@kbn/workflows/managed`) | Centralized package | All managed workflow definitions (YAML + management policy) in one package, owned by workflows team via CODEOWNERS. Loaded into in-memory registry at startup. |
| **Install / Uninstall API** (`managedWorkflows.*`) | `workflows_extensions` (start contract) | Thin imperative surface — plugins call `install(id)` / `uninstall(id)` by typed ID. Delegates to `workflows_management` for storage. Same pattern as `emitEvent` for triggers. |
| **Read-only enforcement** | `workflows_management` (service layer) | All mutation routes live in management. The guards go in `WorkflowsManagementService.updateWorkflow` / `deleteWorkflows`. |
| **Execution** (`executeWorkflow`, `scheduleWorkflow`) | `workflows_execution_engine` (start contract) | No changes needed. The engine executes workflow definitions by ID or inline — it doesn't care if the workflow is managed. |
| **Provisioning** (startup reconciliation, new space hook) | `workflows_management` (internal) | Management owns the workflow index and CRUD. Provisioning is a write path. |
| **Visibility filtering** | `workflows_management` (REST routes + UI) | List/search routes add a `managed` filter. UI reads the flag and applies toggle behavior. |

**Existing routes that need changes:**

| Route | Change |
|-------|--------|
| `GET /api/workflows` | Add `includeManaged` query param (default `false`). When `false`, add `term: { managed: false }` to the ES query. |
| `PUT /api/workflows/workflow/{id}` | Load document, check `managed`. If `true`, only the `enabled` field is editable (requires `force` flag). All other mutations are rejected `403` unconditionally — `force` does not override. |
| `DELETE /api/workflows/workflow/{id}` | If `managed`, reject `403` unconditionally. Managed workflows cannot be deleted by users. |
| `DELETE /api/workflows` (bulk) | Check each ID. Reject any managed workflow in the batch. |
| `POST /api/workflows/workflow/{id}/clone` | Set `managed: false`, `managedBy: null`, `definitionHash: null` on the clone. Allow even if source is managed. |
| `GET /api/workflows/workflow/{workflowId}/executions` | Add `includeManaged` filter (executions reference `workflowId`, so filter by joining on the workflow's `managed` flag or denormalizing `managed` onto execution docs). |

**New routes:**

None required for the first delivery. Registration is a server-side plugin contract, not an HTTP API. Provisioning is internal. The existing CRUD routes with managed guards are sufficient.

#### 2.1 Force Override

The `--force` flag is scoped to the **enable/disable toggle only**. Updates and deletions of managed workflows are not permitted — the user must clone the workflow for any changes beyond enablement.

**Exposed as:** A `force` query parameter on the update route, scoped to the `enabled` field.

- `PUT /api/workflows/workflow/{id}?force=true` with `{ enabled: true/false }` — toggles the enabled state of a managed workflow.

**Behavior:**
- The operation is logged (audit trail) with the requesting user.
- The `force` flag ensures the user is acting with full intention — without it, the API rejects changes to managed workflows.
- The platform preserves the user's enabled state across version upgrades when `management.enablement` is `'restorable'` (default). When the registering team sets `management.enablement: 'enforced'`, a new version resets `enabled` to `management.defaultEnabled`.
- The force flag is **API-only** — the UI may expose the toggle through a product-specific surface (e.g., Detection Engine UI) that calls the API with `force=true` on behalf of the user.

---

### 3. Registration

Registration is split into two concerns: **where managed workflow definitions live** (a centralized package) and **how consuming plugins interact with them** (an imperative API on `workflows_extensions`). This mirrors the existing pattern for event-driven triggers: workflows definitions are declared in a package, and plugins install them by ID via the `workflows_extensions` contract without touching the definition directly.

#### 3.1 The centralized package: `@kbn/workflows/managed`

A new package (or subpath of `@kbn/workflows`) owned by the workflows team via CODEOWNERS. Contains one file per managed workflow, exporting:

- A typed ID constant.
- A definition object with the YAML, owning plugin, and `management` policy.

An index file aggregates all exports for the platform's internal registry.

**Example file:**

```typescript
// packages/kbn-workflows/managed/attack_discovery_maintenance.ts
export const ATTACK_DISCOVERY_MAINTENANCE_WORKFLOW_ID =
  'system-attack_discovery_maintenance_workflow';

export const ATTACK_DISCOVERY_MAINTENANCE_WORKFLOW: ManagedWorkflowDefinition = {
  id: ATTACK_DISCOVERY_MAINTENANCE_WORKFLOW_ID,
  pluginId: 'securityInsights',
  yaml: `
name: Attack Discovery Maintenance
triggers:
  - type: schedule
    with:
      every: 10m
steps:
  ...
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
    defaultEnabled: true,
  },
};
```

**Future extension — `yamlTemplate` (deferred, contingent on [Mutability #4](#mutability)):**

> **Not part of v1.** All v1 managed workflows use static `yaml` only. The `yamlTemplate` mechanism below will be supported only if the [Mutability discussion (#4)](#mutability) concludes that install-time dynamic values are needed. It is documented here so the design is forward-compatible.

If adopted, each managed workflow would declare **either** `yaml` **or** `yamlTemplate`, not both:

| Field | Use case |
|---|---|
| `yaml: string` | Definition is fully static. No install-time variation. |
| `yamlTemplate: (vars: T) => string` | Definition needs values only known at install time (e.g., a connector ID, a rule ID, an entity ID). Rendered at install time, not runtime. |

Example template definition:

```typescript
// packages/kbn-workflows/managed/entity_monitor.ts
export const ENTITY_MONITOR_WORKFLOW_ID = 'system-entity_monitor';

export const ENTITY_MONITOR_WORKFLOW: ManagedWorkflowDefinition = {
  id: ENTITY_MONITOR_WORKFLOW_ID,
  pluginId: 'entityAnalytics',
  yamlTemplate: (vars: { entityId: string }) => `
name: Entity Monitor - ${vars.entityId}
triggers:
  - type: schedule
    with:
      every: 5m
steps:
  - name: check_entity
    type: entity-analytics.checkEntity
    with:
      entityId: ${vars.entityId}
`,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'on_adopt',
    enablement: 'restorable',
    defaultEnabled: true,
  },
};
```

Templating would be rendered at install time, not at runtime. The plugin calls `install(ID, { values })`, the platform invokes `yamlTemplate(values)` and stores the rendered YAML. The `definitionHash` is computed from the **raw template YAML** (before variable substitution), not from the rendered output — this ensures version detection is deterministic regardless of what values were supplied. The `values` are persisted on the workflow document as `overrides`, so when a new template version ships, the platform can re-apply the existing overrides against the new version automatically. This aligns with the `overrides` mechanism described in [Mutability #4](#mutability).

**Definition type:**

```typescript
interface ManagedWorkflowDefinition {
  /** Stable, deterministic workflow ID (e.g., 'system-attack_discovery_maintenance'). */
  id: string;
  /** Plugin ID that owns this workflow. Used for ownership tracking and cleanup. */
  pluginId: string;
  /** The workflow YAML definition. Required in v1. */
  yaml: string;
  // Future (contingent on Mutability #4):
  // yamlTemplate?: (vars: any) => string;  — mutually exclusive with yaml
  /**
   * Platform-level behavioral policy for this managed workflow.
   * Controls how the platform handles lifecycle, versioning, and enablement.
   * Extensible — new fields can be added in future releases without
   * breaking existing registrations (all fields have sensible defaults).
   */
  management: ManagedWorkflowManagement;
}
```

**`ManagedWorkflowManagement` interface:**

```typescript
/**
 * Platform-level behavioral policy for a managed workflow.
 * Groups all knobs that control how the platform treats the workflow
 * during reconciliation, provisioning, and enforcement — separate from
 * the workflow's content (YAML) and identity (ID, pluginId).
 *
 * Every field has a sensible default so existing registrations remain
 * valid when new fields are added.
 */
interface ManagedWorkflowManagement {
  /**
   * Lifecycle determines when the workflow is installed and how the platform
   * handles cleanup.
   *
   * 'static' (default):
   *   The owning plugin calls install() during setup() or start().
   *   The full set of static workflows is known once all plugins finish start().
   *   The platform auto-orphans static workflows that are no longer asserted:
   *   - First sweep (startup where install() was not called): workflow is disabled.
   *   - Second sweep (next startup, still unasserted): workflow is deleted.
   *   This protects against transient regressions — a one-time bug in a plugin's
   *   start() disables the workflow but doesn't destroy it. The next healthy
   *   startup re-asserts and re-enables it.
   *
   * 'dynamic':
   *   The owning plugin calls install() and uninstall() explicitly, at any
   *   point in the plugin's lifetime (post-start, on user action, on entity
   *   creation, etc.). The platform makes no assumption about which dynamic
   *   workflows should exist and never auto-orphans them.
   *   Cleanup is the plugin's responsibility via explicit uninstall() calls.
   *   If the plugin forgets to uninstall a workflow whose owning resource is
   *   gone, the workflow persists — an observable bug, not silent data loss.
   *
   * @default 'static'
   */
  lifecycle?: 'static' | 'dynamic';

  /**
   * How the platform applies a new definition version to an existing document.
   *
   * 'auto' (default):
   *   On hash mismatch, the platform overwrites the stored YAML with the new
   *   version immediately during reconciliation. This is the standard behavior
   *   for always-on system workflows where the owning team wants every Kibana
   *   upgrade to push the latest definition.
   *
   * 'on_adopt':
   *   On hash mismatch, the platform stores the new version as available but
   *   does not apply it to the active document until the owning plugin explicitly
   *   re-issues install(). This is useful for workflows where the plugin
   *   wants to control when a new version takes effect (e.g., gradual rollout,
   *   coordinated upgrade across multiple workflows).
   *
   * @default 'auto'
   */
  versionStrategy?: 'auto' | 'on_adopt';

  /**
   * How the platform handles the workflow's enabled/disabled state across
   * reconciliation and user interactions.
   *
   * 'restorable' (default):
   *   The platform preserves the user's current enabled state across version
   *   upgrades and reconciliation. The owning plugin can still call enable()
   *   or disable() to change the state programmatically, but user toggles
   *   are respected. Use for "recommended but optional" workflows where the
   *   user should have control over enablement.
   *
   * 'enforced':
   *   The platform resets the enabled state to the declared default on every
   *   reconciliation. User toggles are overridden. Use for critical system
   *   workflows that must always be active (or always inactive until the
   *   plugin explicitly enables them).
   *
   * @default 'restorable'
   */
  enablement?: 'enforced' | 'restorable';

  /**
   * Initial enabled state when the workflow is first provisioned.
   * Defaults to true (active immediately). Set to false for opt-in patterns
   * where a product feature activates the workflow on the user's behalf.
   *
   * @default true
   */
  defaultEnabled?: boolean;
}
```

The **package** is owned by the workflows team via CODEOWNERS, and owns **the artifact and the ID**. The plugin owns **the policy and the lifecycle decision** (when to install, whether to install, when to uninstall).

#### 3.2 Plugin contract: `install` / `uninstall` / `enable` / `disable`

Consuming plugins interact with managed workflows through an imperative API on the `workflows_extensions` start contract. This follows the same pattern as event-driven triggers, plugins call `install(workflowId)` by ID without touching the YAML definition.

**Why `workflows_extensions`:**

- `workflows_extensions` is already the plugin that consuming plugins depend on for contributing steps, triggers, and emitting events. Adding `managedWorkflows` keeps the dependency graph unchanged.
- The `managedWorkflows` API is a thin imperative surface (install/uninstall by ID). The heavy lifting (CRUD, storage, reconciliation) remains in `workflows_management`, which consumes the package registry internally.
- `workflows_extensions` already has a request-scoped client pattern (`getClient(request)`) for `emitEvent`. The same pattern works for `install`/`uninstall` when a request context is available, and a setup/start-time API works for static lifecycle workflows.

**Contract on `WorkflowsExtensionsServerPluginStart`:**

```typescript
interface WorkflowsExtensionsServerPluginStart {
  // ... existing methods (getClient, emitEvent, etc.) ...

  /**
   * Managed workflow operations. All methods reference workflows by ID —
   * the YAML is resolved from the in-memory registry built from
   * @kbn/workflows/managed at platform startup.
   *
   * Calling any method with an unknown ID throws — typed ID constants
   * from the package make this a compile-time error in well-typed consumers.
   */
  managedWorkflows: ManagedWorkflowsApi;
}

interface ManagedWorkflowsApi {
  /**
   * Install (or re-assert) a managed workflow.
   * - Idempotent: calling repeatedly is a no-op after the first reconciliation.
   * - The platform resolves the YAML from the in-memory registry by ID.
   *
   * Static workflows: call during setup() or start().
   * Dynamic workflows: call at any time post-start.
   *
   * Future (contingent on Mutability #4): for yamlTemplate definitions,
   * options.values will supply template variables at install time.
   */
  install<TId extends ManagedWorkflowId>(
    id: TId,
    options?: { values?: ValuesFor<TId>; spaceId?: string }
  ): Promise<void>;

  /** Disable a managed workflow without removing it. */
  disable(id: string, options?: { spaceId?: string }): Promise<void>;

  /** Re-enable a previously disabled managed workflow. */
  enable(id: string, options?: { spaceId?: string }): Promise<void>;

  /** Remove a managed workflow document. Primarily for dynamic lifecycle workflows. */
  uninstall(id: string, options?: { spaceId?: string }): Promise<void>;
}
```

Notes:
- `spaceId` is accepted but its semantics depend on the space-provisioning model adopted from §4.
- `install` for an unknown ID throws. Typed ID constants from `@kbn/workflows/managed` make this a compile-time error in well-typed consumers.
- The API does not expose the YAML or management policy — consumers only work with IDs. The platform resolves definitions from the in-memory registry.

**Request-scoped client (post-start, with request context):**

For dynamic workflows installed in response to user actions or from route handlers, the `getClient(request)` pattern provides a request-scoped managed workflows client:

```typescript
// In a route handler — same pattern as emitting events
const workflowsClient = await plugins.workflowsExtensions.getClient(request);

// v1: static yaml, install by ID only
await workflowsClient.managedWorkflows.install(ENTITY_MONITOR_WORKFLOW_ID);

// Future (contingent on Mutability #4): yamlTemplate with install-time values
// await workflowsClient.managedWorkflows.install(ENTITY_MONITOR_WORKFLOW_ID, {
//   values: { entityId: 'entity-123' },
// });

// Later, on entity deletion
await workflowsClient.managedWorkflows.uninstall(ENTITY_MONITOR_WORKFLOW_ID);
```

**Setup/start-time usage (static workflows):**

For static workflows asserted during plugin lifecycle, the plugin uses the start contract directly:

```typescript
// In plugin start()
const { managedWorkflows } = plugins.workflowsExtensions;
await managedWorkflows.install(ATTACK_DISCOVERY_MAINTENANCE_WORKFLOW_ID);
```

#### 3.3 Registration flow

```
                    @kbn/workflows/managed (package)
                              │
                              │  exports: { id, pluginId, yaml, management }
                              │  CODEOWNERS: workflows team
                              │
                              ▼
                    workflows_extensions setup()
                              │
                              ├─ Loads all managed workflow definitions from package
                              │  into in-memory registry: { id → definition }
                              │
                              ├─ registerStepDefinition()  ◄── Plugin setup()
                              ├─ registerTriggerDefinition() ◄── Plugin setup()
                              │
                              ▼
                    workflows_extensions start()
                              │
                              ├─ Exposes managedWorkflows API (install/uninstall/enable/disable)
                              │  Delegates to workflows_management for storage/CRUD
                              │
                              ▼
                    workflows_management start()
                              │
                              ├─ For each static workflow in registry:
                              │    ├─ Load existing document by ID
                              │    ├─ If not found → create (managed: true, definitionHash, lifecycle)
                              │    ├─ If found, hash differs → apply per versionStrategy
                              │    └─ If found, hash matches → skip (or reset enabled per enablement)
                              │
                              ├─ Orphan cleanup for static workflows (disable-then-delete)
                              │
                              ▼
                    Plugin setup() / start()
                              │
                              ├─ Static: managedWorkflows.install(ID)
                              │    (asserts the workflow; platform reconciles)
                              │
                              ├─ Dynamic: managedWorkflows.install(ID)
                              │    (creates or updates the workflow on demand)
                              │
                              └─ Dynamic: managedWorkflows.uninstall(ID)
                                   (removes the workflow when no longer needed)
```

**What about integrations?**

Integrations (Fleet packages) are a future distribution channel (N7). The integration would call the same `managedWorkflows.install(id)` API during its install lifecycle. The API contract is the same — the only difference is *who* calls it. This is deferred but the design does not preclude it.

---

### 4. Space Provisioning

The product requirement is that managed workflows are space-aware and behave consistently in every space — users in any space should be able to see them and interact with them the same way. Two fundamental approaches exist:

**Approach 1: Sentinel space ID (e.g., `_global`)**

Store the workflow once with a special `spaceId` (e.g., `_global`) instead of provisioning per space. All query paths change from `spaceId = currentSpace` to `spaceId = currentSpace OR spaceId = '_global'`. No per-space provisioning needed — the workflow exists once and is visible everywhere.

This avoids the new-space problem entirely (no provisioning needed). The execution context works as follows:

- **User-driven runs (manual invocations, event-driven):** Always space-aware — the request carries a space context, so the workflow runs in that space even though the document's `spaceId` is `_global`.
- **Scheduled runs:** No inherent space context. Two patterns:
  - **Global-run:** The workflow is designed to run in a global context (e.g., cluster-level operations, external HTTP calls). Runs once globally.
  - **Per-space iteration:** The workflow's first step fetches all spaces, then iterates them with a `foreach` step. Each iteration runs in the target space's context. This gives granularity — one scheduled run covers all spaces.
- **Post-start registered workflows:** The caller can provide a `spaceId` at provisioning time. If provided, the workflow runs in that space context only. If not, it behaves as a `_global` workflow.

**Limitation:** The enablement toggle is global — disabling affects all spaces. Per-space enablement is not supported with this approach. This is acceptable if system workflows are treated as globally managed entities.

**Approach 2: Provision into every space (current model)**

Each space gets its own copy of the workflow document. Execution context is unambiguous — the workflow runs in the space it belongs to, with access to that space's resources. The startup reconciliation loop handles existing spaces. The challenge is **newly created spaces**.

Today, the Spaces plugin has no public `onSpaceCreated` hook or event system. Space creation goes through `SpacesClient.create()` → saved object write → return. The only post-create logic is hard-coded in the route handler (not an extension point). Options for provisioning into new spaces:

- **Option A: `onSpaceCreated` hook on the Spaces plugin** — Propose a callback registry on `SpacesPluginSetup` (e.g., `spaces.onSpaceCreated(callback)`). The workflows plugin registers a listener at setup; when a space is created, it provisions all managed workflows. This is the only approach that fully satisfies R11 and requires cross-team collaboration with the Spaces team.
- **Option B: Periodic reconciliation** — A Task Manager task that periodically scans all spaces and provisions missing workflows. Robust, no Spaces plugin dependency, but adds delay (up to one reconciliation interval) and background load.

The remaining product-level questions are captured in [Open Questions > Space Behavior #9](#space-behavior).

---

### 5. Lifecycle (Provisioning, Updates, Cleanup)

On startup, the platform reconciles the in-memory registry (what plugins declared) against storage (what's persisted per space). This covers R11 (auto-provisioning), R12 (privileged updates), R13 (plugin uninstall cleanup), and R14 (unregistration cleanup).

Reconciliation behavior is driven by the `management` property declared on each managed workflow registration. The three relevant fields are:

- **`management.lifecycle`** (`'static'` | `'dynamic'`) — determines when the platform expects `install()` calls and how it handles cleanup.
- **`management.versionStrategy`** (`'auto'` | `'on_adopt'`) — determines how new definition versions are applied to existing documents.
- **`management.enablement`** (`'enforced'` | `'restorable'`) — determines how the enabled/disabled state is handled across reconciliation.

See the [Registration > `ManagedWorkflowManagement`](#3-registration) interface for the full field documentation.

**Change detection** uses a SHA-256 hash of the YAML definition, stored in `definitionHash`. Today, `WorkflowProperties` has no version or hash field — updates are full document overwrites with no change detection. Once workflow versioning lands (#15776), managed workflows should adopt it. Until then:

**Hash computation:**

```typescript
import { createHash } from 'crypto';

function computeDefinitionHash(yaml: string): string {
  return createHash('sha256').update(yaml.trim()).digest('hex');
}
```

#### 5.1 Reconciliation for `lifecycle: 'static'` workflows

Static workflows are expected to be asserted via `install()` during the owning plugin's `setup()` or `start()` phase. The platform waits for all plugins to finish `start()` before running the reconciliation pass — this is a natural completion barrier, not a heuristic timer.

**Reconciliation on startup (in `workflows_management` `start()`):**

For each registered **static** managed workflow, for each space:

1. Query `.workflows-workflows` by `id` + `spaceId`.
2. If not found → **create** with `managed: true`, `managedBy: pluginId`, `definitionHash: hash`, `enabled: management.defaultEnabled ?? true`.
3. If found and `definitionHash` matches → **skip** (no I/O). Exception: if `management.enablement` is `'enforced'`, reset `enabled` to `management.defaultEnabled` even when the hash matches.
4. If found and `definitionHash` differs → apply based on `management.versionStrategy`:
   - **`'auto'`** (default): **update** the `yaml`, `definition`, `definitionHash`, `lastUpdatedBy: 'system'` immediately.
   - **`'on_adopt'`**: store the new hash and YAML as `pendingVersion` on the document but do **not** replace the active definition. The owning plugin must re-issue `install()` to adopt.
   For the `enabled` field on update: read `management.enablement` from the registration.
   - **`'enforced'`**: reset `enabled` to `management.defaultEnabled`.
   - **`'restorable'`** (default): preserve the existing document's `enabled` value (user's choice survives).
5. If found but `managed: false` → ID collision between user workflow and managed workflow. Log a warning and skip.

**Cleanup — disable-then-delete for static workflows (R14):**

After provisioning, a second pass handles orphans — static workflows that exist in storage but were **not** asserted via `install()` during this startup:

1. For each space, query `.workflows-workflows` for documents where `managed: true` and the workflow's registered lifecycle is `'static'`.
2. For each result, check if the `id` was asserted via `install()` in this startup cycle.
3. If **not asserted** and currently enabled → **disable** the workflow (set `enabled: false`). Do not delete. This protects against transient regressions — a one-time bug in a plugin's `start()` that skips `install()` for a workflow that should exist. The workflow is silenced (no triggers fire) but the document survives.
4. If **not asserted** and already disabled from a previous sweep → **delete** the orphaned workflow. Permanent removal happens only when the plugin has stopped asserting the workflow across multiple healthy startups — the correct signal that the workflow is genuinely gone.

This two-phase approach (disable → delete) replaces immediate deletion of unregistered workflows. It handles R14 (unregistration cleanup) with stronger safety against transient bugs.

#### 5.2 Reconciliation for `lifecycle: 'dynamic'` workflows

Dynamic workflows are **never** auto-orphaned. The platform makes no assumption about which dynamic workflows should exist — only the owning plugin can enumerate them.

**On startup:**
- Dynamic workflow documents are loaded from storage and remain in their stored state (enabled or disabled). No reconciliation sweep runs against them.
- If a dynamic workflow's `definitionHash` differs from the current package version and `management.versionStrategy` is `'auto'`, the platform updates the stored definition. If `'on_adopt'`, the new version is stored as pending.

**At runtime:**
- The owning plugin calls `install(id)` to create or update dynamic workflows at any point post-start.
- The owning plugin calls `uninstall(id)` to explicitly remove a dynamic workflow.
- Hash-based change detection still applies: if the definition in the package changes (new Kibana version), re-installing the workflow detects the hash mismatch and updates the document.

**Failure mode:** If a plugin forgets to call `uninstall()` for a workflow whose owning resource is gone, the workflow persists indefinitely. This is a bug to investigate, not silent data loss — and it is observably different from the alternative (platform guesses wrong and deletes a workflow the plugin needs).

#### 5.3 Summary: lifecycle × versionStrategy × enablement

| Dimension | `lifecycle: 'static'` | `lifecycle: 'dynamic'` |
|---|---|---|
| **When `install()` is called** | During `setup()` / `start()` | Any time, post-start |
| **Platform auto-orphans** | Yes (disable on first sweep, delete on second) | Never |
| **Cleanup mechanism** | Plugin stops calling `install()` → eventually deleted | Plugin calls `uninstall()` explicitly |
| **Failure if plugin misbehaves** | Workflow temporarily disabled, self-heals on next healthy start | Workflow lingers indefinitely (observable bug) |
| **Use cases** | Always-on system workflows (Attack Discovery, Streams Significant Events) | Per-entity workflows (Entity Analytics monitoring), feature-activated workflows |

| Dimension | `versionStrategy: 'auto'` | `versionStrategy: 'on_adopt'` |
|---|---|---|
| **On hash mismatch** | Overwrite stored YAML immediately | Store new version as pending; plugin re-issues `install()` to adopt |
| **Use cases** | Always-current definitions (security maintenance) | Controlled rollout, coordinated upgrades |

| Dimension | `enablement: 'enforced'` | `enablement: 'restorable'` |
|---|---|---|
| **On reconciliation** | Reset to `defaultEnabled` | Preserve user's current enabled state |
| **User toggle** | Overridden on next reconciliation | Respected indefinitely |
| **Use cases** | Critical workflows that must always be active | Recommended-but-optional workflows |

**Cleanup on plugin uninstall (R13):**

When a plugin is uninstalled (removed from the Kibana deployment), it no longer calls `install()` at `setup()`. For static workflows, this triggers the disable-then-delete orphan cleanup described above. For dynamic workflows, the `managedBy` field identifies which workflows belonged to the removed plugin — the platform can run a one-time cleanup pass on plugin uninstall to remove all dynamic workflows owned by the uninstalled plugin.

---

### 6. Execution Identity

**Interim approach: User identity for on-demand, Task Manager API key for scheduled.**

Today, the execution engine resolves identity via `getAuthenticatedUser(request, security, clusterClient)` in `workflows_execution_engine/server/lib/get_user.ts`. All execution paths flow through a `fakeRequest` created by Task Manager from the stored API key:

- **Manual run**: User clicks "Run" → `POST /api/workflows/workflow/{id}/run` → Task Manager schedules `workflow:run` with the user's request → `fakeRequest` carries the user's API key.
- **Scheduled**: User enables a scheduled trigger → `WorkflowTaskScheduler.schedule(taskInstance, { request })` stores the user's API key → `workflow:scheduled` runs with that API key.
- **Event-driven**: Trigger fires → the triggering user's context flows through.

**For managed workflows, the problem is:** who is "the user" when the workflow is registered by a plugin at startup?

**Proposed interim model:**

| Trigger | Identity | How |
|---------|----------|-----|
| **On-demand** (another plugin calls `executeWorkflow`) | The calling user | The plugin passes the current `KibanaRequest` to `executeWorkflow`. The engine extracts the user's API key as it does today. No change needed. |
| **Scheduled** | The user who last triggered provisioning | During reconciliation, the provisioning code runs with an internal request. Task Manager stores that request's API key. **Problem:** the internal request may have limited permissions (Kibana system user only has `.kibana*`). |
| **Event-driven** | The event source's identity | Same as today — flows through the trigger handler. |

**The scheduled case is the gap.** Options:

| Option | How | Tradeoff |
|--------|-----|----------|
| **A: Internal user with elevated permissions** | Create a scoped API key at provisioning time with the specific index permissions the workflow needs. Store it with the Task Manager task. | Requires knowing what indices the workflow accesses at registration time. Fragile if the workflow changes. |
| **B: Require an `apiKey` in registration** | The registering plugin provides an API key (or the means to create one) as part of `ManagedWorkflowRegistration`. | Pushes the burden to consumers. Each plugin must manage API key lifecycle. |
| **C: Defer scheduled managed workflows** | For the first delivery, managed workflows only support on-demand and event-driven execution (where a user context exists). Scheduled execution waits for the Execution Identity epic (#15718). | Limits use cases (Entity Analytics needs scheduling). But gets the core platform shipped. |
| **D: Ship scheduled workflows disabled, use enabler's identity** | Scheduled managed workflows are provisioned as disabled by default. When a user enables the workflow (via the product UI or API with `--force`), the platform captures the enabling user's API key and stores it with the Task Manager task. The workflow runs with that user's privileges. | Simple, no new identity system needed. But the workflow's permissions are tied to a specific user — if the user is deactivated or loses permissions, the workflow breaks. Also requires the enabling user to have all necessary privileges. |
| **E: Privileged background user** | Create a dedicated "power background" user with broad permissions that all managed workflow scheduled executions run as. The platform provisions and manages this user. | Simplest approach — no per-workflow identity management, no dependency on user enablement. But unclear whether this aligns with Kibana security best practices (principle of least privilege), and a single over-privileged user is a wider blast radius if compromised. Needs validation with the platform security team. |

**Recommendation:** Option D is a pragmatic interim approach — it reuses existing mechanisms (API key capture on enablement, Task Manager storage) and gives the user explicit control over which identity the workflow runs with. Option E is the simplest operationally but needs validation against Kibana security best practices before adoption. Option C remains the safest fallback if the identity-tied-to-user limitation is unacceptable. All are superseded by #15718 (service accounts) once available.

**Known issue:** When a workflow step patches a detection rule, the rule's execution identity changes to whoever ran the step (the alerting framework regenerates the API key from the updater). In autonomous mode with no human approver, the identity used by the apply step becomes the rule's permanent identity. This cascading side effect needs resolution as part of #15718.

**Future state:** A dedicated service account with scoped permissions, decoupled from any individual user. The workflow author assigns it; the platform enforces it across all execution modes.

---

## References

| Issue | Title |
|-------|-------|
| [#16661](https://github.com/elastic/security-team/issues/16661) | [Epic] System Workflows |
| [#16662](https://github.com/elastic/security-team/issues/16662) | System workflow designation and registration |
| [#16663](https://github.com/elastic/security-team/issues/16663) | System workflow visibility and filtering |
| [#16664](https://github.com/elastic/security-team/issues/16664) | [Design] System workflow UX |
| [#16665](https://github.com/elastic/security-team/issues/16665) | System workflow licensing and metering |
| [#14191](https://github.com/elastic/security-team/issues/14191) | [Discussion] System Workflows (cross-team requirements) |
| [#15718](https://github.com/elastic/security-team/issues/15718) | [Epic] Configurable Workflow Execution Identity |
| [#15382](https://github.com/elastic/security-team/issues/15382) | Entity Analytics system workflow use cases |
| [streams-program#1001](https://github.com/elastic/streams-program/issues/1001) | Streams: Evaluate Workflows as Task Manager replacement |
| [search-team#13253](https://github.com/elastic/search-team/issues/13253) | Search: Plugin workflow distribution |
