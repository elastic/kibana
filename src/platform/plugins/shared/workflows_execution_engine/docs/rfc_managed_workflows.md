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
| **R3** | **Enabled by default, with opt-out** | Registered managed workflows are active by default (`enabled: true`). The registration contract supports `enabled: false` for opt-in patterns where a product feature activates the workflow on the user's behalf. On reconciliation (new version), the platform preserves the user's current enabled state unless the registering team explicitly forces a reset. |
| **R4** | **Ownership metadata** | Every managed workflow identifies its owning plugin, team, or feature. Visible when inspecting the workflow. |
| **R5** | **Registration mechanism** | A way for solution teams to register managed workflows with the platform, including the workflow definition and ownership metadata. The workflow plugin handles installation and activation. How this is exposed (plugin contract, file-based convention, or other mechanism) is an implementation detail discussed in the [Registration](#3-registration) section of the technical design. |
| **R6** | **Caller-provided workflow ID with uniqueness guarantee** | Plugins can specify stable, deterministic IDs instead of auto-generated IDs. IDs must be globally unique so all existing APIs continue to serve both managed and user-defined workflows unambiguously. See [Open Questions > Registration #3](#id-uniqueness) for enforcement approaches. |
| **R7** | **Custom triggers and custom steps** | Managed workflows support custom step types and custom triggers registered via `workflows_extensions`. Same engine, same capabilities. |
| **R8** | **Existing guardrails apply** | All existing concurrency strategies, execution limits, and guardrails apply to managed workflows. |
| **R9** | **Enterprise tier gating** | License tier gating. The workflow engine and managed workflow support are available on Enterprise tier (ECH), Complete tier (Serverless Security and Observability), and all Elasticsearch/Search project tiers. Features registering managed workflows must be available at these tiers. On tiers where the engine is unavailable, managed workflows are not installed or executed. This is a platform-level gate, not a per-workflow decision. |
| **R10** | **Metering and billing** | Managed workflow executions are metered internally for capacity planning and operational visibility. By default, managed workflow executions are not counted toward the customer's workflow execution meter (billable: false). The registering team may declare a managed workflow as billable (billable: true), in which case executions count toward the customer's meter. Billable managed workflows are expected to be opt-in (user explicitly enables the functionality through a product surface) and deliver standalone value beyond the feature they belong to. Only user-authored workflow executions and billable managed workflow executions are included in active billing. |

#### Lifecycle

| # | Requirement | Details |
|---|-------------|---------|
| **R11** | **Auto-provisioning across spaces** | At startup, managed workflows are provisioned into all existing spaces and into newly created spaces, without requiring the consuming plugin to trigger provisioning via request-scoped logic. See [Lifecycle](#4-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R12** | **Privileged update path** | The platform supports updating managed workflows on plugin upgrades (system update) while still blocking user edits. Without this, read-only enforcement prevents plugins from evolving their workflows. Pattern: create-if-absent, update-if-changed. See [Lifecycle](#4-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R13** | **Cleanup on plugin uninstall** | When a plugin is uninstalled, all managed workflows it owns (identified by `managedBy`) are removed from all spaces. See [Lifecycle](#4-lifecycle-provisioning-updates-cleanup) in the technical design. |
| **R14** | **Cleanup on unregistration** | When a managed workflow is no longer registered in code (i.e., the plugin removes the registration in a new release), the platform removes it from all spaces during startup reconciliation. See [Lifecycle](#4-lifecycle-provisioning-updates-cleanup) in the technical design. |

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
| **S1** | **Version/hash tracking** | Track a content hash so the platform can determine if updates are needed without fetching and string-comparing full YAML. Also drives the reconciliation lifecycle (create-if-absent, update-if-changed, skip-if-matching) — see [Lifecycle](#4-lifecycle-provisioning-updates-cleanup). | Security (andrew-goldstein) |
| **S2** | **Caller-provided execution ID** | Support a caller-specified unique execution ID for correlation and deduplication. | O11y (ruflin, cesco-f) |
| **S3** | **Caller-provided execution metadata** | Allow callers to attach arbitrary metadata to an execution for debugging and correlation. | — |
| **S4** | **Plugin-controlled install decision** | `shouldInstall(ctx)` hook called during provisioning with the full context (space, license tier, deployment type, feature flags, etc.). The registering plugin decides whether to install the workflow based on any condition. Enables per-space decisions, tier gating, deployment-type filtering, and progressive rollout without separate mechanisms. | Security AB (KDKHD) |

### Nice to Have / Deferred

| # | Requirement | Details | Requested By |
|---|-------------|---------|--------------|
| **N1** | **Post-start / dynamic registration** | Support registration after plugin `start()`, not just `setup()`. Enables user-action-triggered managed workflows. Creation and deletion are straightforward (plugin calls an API; cleanup uses `managedBy` on uninstall). Updates are harder — see [Open Questions > Post-start lifecycle](#post-start-lifecycle) for approaches. | Security AB (KDKHD) |
| **N3** | **Registration health / introspection** | Registry view: what's registered, what's installed per space, version/hash. | Security AB (KDKHD) |
| **N4** | **Standardized gating + rollout controls** | Feature flags for progressive enablement of managed workflows. Achievable via S4 — the `shouldInstall` hook receives the full provisioning context (feature flags, space, deployment type, etc.), so the registering plugin can gate installation on any condition without a separate rollout mechanism. | Security AB (KDKHD) |
| **N5** | **Out-of-band updates** | Update managed workflow definitions outside of Kibana release cycles. Related to integration-based distribution (N7). | Security AB (KDKHD) |
| **N6** | **Type safety for code-defined workflows** | TypeScript types for workflow definitions in code. For the first delivery, workflow registration validates the YAML at startup, and the approval gate's Scout tests provide compile-time coverage. | Security AB (KDKHD) |
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
| **Workflow Versioning** | [#15776](https://github.com/elastic/security-team/issues/15776) | First-class versioning for workflow definitions. Managed workflows currently use a SHA-256 hash for change detection (see [Lifecycle](#4-lifecycle-provisioning-updates-cleanup)); once versioning lands, managed workflows should adopt it. |
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

1. **Where does the registration API live?**
   The existing `workflows_extensions` registers step *types*. Managed workflow registration covers full workflow *lifecycle* (definition, provisioning, updates, removal). These are distinct concerns that coexist rather than being alternatives. The question is which plugin (or package) exposes the registration API:
   - **`workflows_management`** — Natural home since it owns CRUD and storage. But this adds a setup dependency on `workflows_management` for every plugin that registers a managed workflow, which may be problematic for plugins that currently only depend on `workflows_extensions`.
   - **`workflows_extensions`** — Already depended on by consuming plugins. Lighter dependency. But it has no access to Elasticsearch, no CRUD capabilities, and no space awareness — adding lifecycle management would bloat its responsibility.
   - **Dedicated package** — A new lightweight package (e.g., `@kbn/workflows-registration`) that holds only the registration contract and in-memory registry. Plugins depend on the package (no plugin dependency at all). `workflows_management` consumes the registry at `start()` for provisioning. Cleanest dependency graph, but adds a new package.

2. **Post-start registration — what are the use cases and how should it work?**
   Post-start registration means installing a managed workflow on demand (e.g., user action, feature activation) rather than at plugin startup. Two distinct use cases exist:

   - **On-demand registration of a constant, read-only workflow.** The workflow YAML is predefined and immutable — the only question is *when* to install it, not *what* to install. Example: a feature that activates a managed workflow when the user enables it from the product UI. The workflow itself doesn't change.
   - **Registration with a customized YAML.** The workflow structure is predefined, but some configuration values (e.g., connector ID, rule ID, scheduling intercal) are only known at creation. This is a Mutability concern — see [question #4](#mutability) for the overrides mechanism that addresses this without requiring full partial editability.

   For the first use case (constant workflows), the workflow can still be read-only, based on a predefined YAML, just installed on demand instead of at `setup()`.

   **Two approaches for read-only post-start workflows:**

   - **Option A: Register disabled at startup, enable on demand.** The workflow is registered at `setup()` like any other managed workflow (known to the platform, reconciled on startup), but with `enabled: false` (see R3). The solution team enables it post-start when needed. This keeps the workflow in the standard lifecycle — hash-based reconciliation works, the approval gate applies — and only the enablement is dynamic. Simplest approach, no new mechanisms needed.

   - **Option B: Deferred provisioning via `provisionOnStart: false`.** A new field on `ManagedWorkflowRegistration` (default `true`). When `false`, the workflow is registered in the in-memory registry at `setup()` (known to the platform, approval gate applies) but not provisioned to storage on startup. The team triggers provisioning post-start by calling a `registerManagedWorkflow(id)` API. Once provisioned, all future reconciliation (updates, cleanup) works normally via the standard hash-based lifecycle. This avoids creating a disabled workflow document that sits unused, while keeping the workflow known and reconcilable.

   **ID generation for post-start workflows:** Post-start provisioning introduces an ID uniqueness challenge — the same workflow could be created multiple times (e.g., per entity). For workflows registered at `setup()`, the deterministic ID from the registration handles this (create-if-absent). For post-start, two options:
   - **Caller-provided ID** — The caller provides a unique ID that must start with the system workflow prefix (e.g., `system:attack-discovery-generation:space-x`). The platform validates uniqueness before creation.
   - **Platform-generated ID** — If no ID is provided, the platform generates one using the registered workflow ID as a base (e.g., `system:<registered-id>:<spaceId>` or a UUID). This avoids duplicates but makes the ID less predictable for the caller.

   The first delivery should at minimum be designed to not preclude these approaches.

3. **~~How to prevent ID collisions between managed and user-defined workflows?~~** — **Resolved.**
   Reserved prefix (e.g., `system:`). `createWorkflow` rejects user-defined workflows with the reserved prefix — IDs are globally unique by construction. All read APIs (get, list, execute) work exactly the same for both managed and user-defined workflows, no changes needed. The `managed` flag on the document provides an additional layer of identification on the storage side. For mutations (enable/disable toggle), the update endpoint requires a `--force` flag to ensure user intentionality (see R2). The prefix is not used to determine whether a workflow is managed — it only guarantees collision-free coexistence.

### <a id="mutability"></a>Mutability

4. **Can users modify any part of the definition?**
   E.g., the scheduling interval, connector ID, etc. The current position is "fully read-only," but partial mutability is a realistic future need. Note: partial editability with ongoing updates is effectively a hybrid between managed workflows and workflow templates (see [Clarifications > Managed workflow vs. workflow template](#managed-workflow-vs-workflow-template)) — the platform keeps the definition in sync, but the user also owns parts of it. This blurs the boundary and introduces the upgrade conflict problem below.

   **How it could work:** The registering plugin declares which properties are user-editable (an allowlist). The platform enforces the allowlist at the service layer — user mutations that touch non-allowlisted fields are rejected, allowlisted field changes are persisted.

   **The upgrade conflict problem:** If a user edits an allowlisted field (e.g., changes the scheduling interval from 10m to 1h), and a new Kibana release ships an updated version of the same managed workflow, should the platform:
   - **Overwrite user edits?** Simple, but the user loses their customization silently.
   - **Preserve user edits and merge?** Apply the new definition but keep the user's values for allowlisted fields. Complex — requires field-level merge logic, and the new definition may not be compatible with the old user values.
   - **Skip the update?** Leave the user's version in place. The workflow drifts from what the plugin intended. Risky.

   None of these options are clean. This is the core reason partial editability is deferred — it requires solving the managed/template hybrid problem, which is out of scope for the first delivery.

   **Overrides mechanism (alternative to full editability):** Two layers handle dynamic configuration without breaking the lifecycle:

   1. **Workflow `constants` (runtime values).** The workflow engine already supports `constants` defined in the YAML, rendered at execution time. For managed workflows, constants can also be provided as a separate field on the workflow document (merged with YAML-defined constants, with the document field taking precedence). This handles values only needed at runtime (e.g., a connector ID used by a step). Since constants are rendered at execution time, not stored in the YAML, the `definitionHash` is unaffected — lifecycle reconciliation works normally. When a new version is delivered, the platform preserves the existing constants and renders them into the new version at runtime.

   2. **`overrides` field (creation-time values).** Some values are needed at creation time, not just runtime — triggers (scheduling interval, trigger filters), tags, name, and description are all stored on the workflow document when it's provisioned. These can't be deferred to runtime. An `overrides` field on the document stores these creation-time customizations. When the workflow is provisioned, overrides are applied to the document fields before writing. The `definitionHash` is computed from the template YAML (not the overridden values), so it remains unaffected. When a new version is delivered, the platform reads the existing overrides and re-applies them to the new version before storing — the hash tracks the latest template version.

   Both are orthogonal to versioning — the lifecycle process is preserved since the workflow version is identified based on the hash.

   **Recommended first-phase approach:** For any other customization, the user should:
   1. Clone the managed workflow into a user-owned copy.
   2. Edit whatever is needed on the clone.
   3. Disable the original managed workflow.
   4. When a new version ships, the platform updates the definition but preserves the user's enabled state (the original stays disabled). The user can re-enable the updated original, clone and edit again if needed.

   This keeps the managed workflow definition clean (no merge conflicts), gives users full editing power on the clone, and the user stays in control of the enabled state across upgrades.

5. **~~Should managed workflows support being registered as disabled by default?~~** — **Resolved.**
   Yes. The `ManagedWorkflowRegistration` contract includes an `enabled` option (default `true`, settable to `false`). This covers both always-on patterns and opt-in patterns where a product feature activates the workflow on the user's behalf. The enable/disable toggle is a user-permitted mutation — not gated behind `--force`. On reconciliation, the platform preserves the user's current enabled state unless the registering team forces a reset (e.g., a critical fix that must be active). See R3.

6. **~~Should a `--force` flag allow overriding read-only?~~** — **Resolved.**
   The primary user path is: disable the managed workflow, clone it into a user-owned copy, and edit the clone freely. The platform preserves the user's enabled state across upgrades unless the registering team forces a reset (e.g., a critical fix that must be active). A `--force` flag on mutation APIs remains available as an operational escape hatch (API-only, not UI, logged) for testing, recovery, and urgent fixes — see the [Force Override](#21-force-override) technical design section.

### Lifecycle

6. **~~What happens if a workflow references a step or trigger from an unavailable plugin?~~** — **Resolved.**
   Cross-solution workflows are against Kibana best practices, and products are available/not based on tiering, so filtering at registration time (via `shouldInstall` or the platform tier gate in R9) is sufficient — a managed workflow should only be installed where its dependencies are available.

### Execution

9. **How do teams know when a managed workflow finishes?**
   Options: polling via `getWorkflowExecutionById`, callback/hook provided at registration, event bus. ruflin: "event bus ideal, polling ok for now." KDKHD: "must be able to detect/get notified about status."

### Cloning

10. **~~When a managed workflow is cloned, what happens to the original?~~** - **Resolved.**
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
| **`workflows_extensions`** | Registry for custom step types and trigger types. Plugins call `registerStepDefinition()` / `registerTriggerDefinition()` during `setup()`. Frozen at `start()`. |
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
| `defaultEnabled` | `boolean` | The enabled state declared at registration time (`true` by default). Stored on the document so reconciliation knows the registering team's intent. |
| `preserveEnabledState` | `boolean` | Whether to preserve the user's current `enabled` value when a new version is reconciled. `true` (default) means the user's choice survives upgrades. `false` means reconciliation resets `enabled` to `defaultEnabled` on every update — used for critical fixes that must be active. |

New mapping additions (in `workflow_storage.ts`):

```typescript
managed: types.boolean({}),
managedBy: types.keyword({}),
definitionHash: types.keyword({ index: false }),
defaultEnabled: types.boolean({}),
preserveEnabledState: types.boolean({}),
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
| **Registration API** (`registerManagedWorkflow`) | TBD — see [Open Questions > Registration #1](#registration) | Three candidates: `workflows_management`, `workflows_extensions`, or a dedicated package. Each has different dependency and responsibility tradeoffs. |
| **Read-only enforcement** | `workflows_management` (service layer) | All mutation routes live in management. The guards go in `WorkflowsManagementService.updateWorkflow` / `deleteWorkflows`. |
| **Execution** (`executeWorkflow`, `scheduleWorkflow`) | `workflows_execution_engine` (start contract) | No changes needed. The engine executes workflow definitions by ID or inline — it doesn't care if the workflow is managed. |
| **Provisioning** (startup reconciliation, new space hook) | `workflows_management` (internal) | Management owns the workflow index and CRUD. Provisioning is a write path. |
| **Visibility filtering** | `workflows_management` (REST routes + UI) | List/search routes add a `managed` filter. UI reads the flag and applies toggle behavior. |

**Existing routes that need changes:**

| Route | Change |
|-------|--------|
| `GET /api/workflows` | Add `includeManaged` query param (default `false`). When `false`, add `term: { managed: false }` to the ES query. |
| `PUT /api/workflows/workflow/{id}` | Load document, check `managed`. If `true` and no `force`, reject `403`. |
| `DELETE /api/workflows/workflow/{id}` | Same managed check. |
| `DELETE /api/workflows` (bulk) | Check each ID. |
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
- The platform preserves the user's enabled state across version upgrades (see `preserveEnabledState` in the [Registration](#3-registration) contract). When the registering team sets `preserveEnabledState: false`, a new version resets `enabled` to the registered default.
- The force flag is **API-only** — the UI may expose the toggle through a product-specific surface (e.g., Detection Engine UI) that calls the API with `force=true` on behalf of the user.

---

### 3. Registration

**New `registerManagedWorkflow` API.** The hosting plugin/package is an open question — see [Open Questions > Registration #1](#registration). The contract and lifecycle are the same regardless of where the API lives.

This is distinct from `workflows_extensions.registerStepDefinition()`:

| | `workflows_extensions` | `workflows_management` |
|---|---|---|
| **What it registers** | Step types, trigger types (code handlers) | Full workflow definitions (YAML + metadata) |
| **When** | `setup()` | `setup()` |
| **Storage** | In-memory registry, no persistence | Persisted to `.workflows-workflows` on start |
| **Scope** | Global (step types are not space-scoped) | Per-space (each workflow is provisioned per space) |

**Contract on `WorkflowsServerPluginSetup.management`:**

```typescript
interface WorkflowsManagementApi {
  // ... existing methods ...

  /**
   * Register a managed workflow definition. The platform handles per-space
   * provisioning (create-if-absent, update-if-changed) and sets managed=true.
   * Call during plugin setup().
   */
  registerManagedWorkflow(registration: ManagedWorkflowRegistration): void;
}

interface ManagedWorkflowRegistration {
  /** Stable, deterministic workflow ID (e.g., 'attack-discovery-generation'). */
  id: string;
  /** Plugin ID that owns this workflow. Used for ownership tracking and cleanup. */
  pluginId: string;
  /** The workflow YAML definition. */
  yaml: string;
  /** Initial enabled state. Defaults to true (active immediately). Set to false for opt-in patterns. */
  enabled?: boolean;
  /**
   * Whether to preserve the user's current enabled state when a new version is reconciled.
   * Defaults to true — the user's choice survives upgrades.
   * Set to false to force-reset enabled to the registered default on every update
   * (e.g., a critical fix that must be active).
   */
  preserveEnabledState?: boolean;
  /**
   * Optional pre-install hook called per space during provisioning.
   * Receives the full provisioning context (space, license, deployment info, etc.).
   * Return true to install, false to skip. When omitted, the workflow is
   * installed in all spaces unconditionally.
   *
   * Examples: gate on license tier, deployment type, feature flag, or
   * space-specific conditions.
   */
  shouldInstall?: (ctx: ManagedWorkflowInstallContext) => boolean | Promise<boolean>;
}

interface ManagedWorkflowInstallContext {
  spaceId: string;
  license: { type: string; isActive: boolean };
  deploymentType: 'ech' | 'serverless';
  // Extensible — add fields as consumer needs emerge.
}
```

**Approval gate (follows the custom steps pattern):**

Custom steps already use an approval mechanism: an `approved_step_definitions.ts` file listing each step's ID and handler hash, owned by the workflow team via CODEOWNERS. A Scout API test fails CI if a step is registered but not in the approved list, or if the handler hash has drifted. The workflow team must review and approve every new step or handler change via PR.

Managed workflows follow the same pattern. Solution teams store the YAML definition in their own plugin directory. An approved list file in the workflows plugin (e.g., `approved_managed_workflows.ts`) records each workflow's ID, owning plugin, and YAML definition hash:

```typescript
// src/platform/plugins/shared/workflows_management/test/scout/api/fixtures/approved_managed_workflows.ts
export const APPROVED_MANAGED_WORKFLOWS: Array<{ id: string; pluginId: string; definitionHash: string }> = [
  {
    id: 'attack-discovery-generation',
    pluginId: 'securityInsights',
    definitionHash: 'a1b2c3d4...', // SHA-256 of the YAML
  },
  {
    id: 'streams-description-generation',
    pluginId: 'streams',
    definitionHash: 'e5f6g7h8...',
  },
];
```

A corresponding Scout test validates at CI time that:
1. Every registered managed workflow has a matching entry in the approved list.
2. The hash of the provided YAML matches the approved hash.
3. No approved entries exist without a corresponding registration (stale entries).

When a solution team adds or modifies a managed workflow, their PR touches:
- Their own plugin (YAML definition + `registerManagedWorkflow()` call) — they own this.
- The approved list file in the workflows plugin — CODEOWNERS requires workflow team review.

This ensures the workflow team reviews every managed workflow before it ships, without owning the YAML definitions themselves.

**Why `workflows_management` and not `workflows_extensions`:**

- `workflows_extensions` is a lightweight registry for code-level definitions (step handlers, trigger handlers). It has no access to Elasticsearch, no CRUD capabilities, and no space awareness. Adding full workflow lifecycle management would bloat its responsibility.
- `workflows_management` already owns the workflow index, CRUD operations, and scheduling. It has the `WorkflowsManagementService` which handles create/update/delete. Registration is a natural extension.
- Plugins that register managed workflows already depend on `workflows_management` for execution (via `runWorkflow`). Adding a setup dependency is not a new coupling.

**Registration flow:**

```
Plugin setup()                    workflows_management setup()
     │                                      │
     ├─ registerStepDefinition()  ──►  workflows_extensions (step registry)
     │                                      │
     ├─ registerManagedWorkflow() ──►  workflows_management (managed registry)
     │                                      │    - stores in-memory: { id, pluginId, yaml, hash }
     │                                      │
     ▼                                      ▼
                              workflows_management start()
                                      │
                                      ├─ For each registered managed workflow:
                                      │    ├─ Load existing workflow by ID (spaceId = '_global')
                                      │    ├─ If not found → create with spaceId = '_global'
                                      │    ├─ If found, hash differs → update
                                      │    └─ If found, hash matches → skip
                                      │
                                      └─ Orphan cleanup (see Lifecycle section)
```

**Space-agnostic workflows:**

Two fundamental approaches exist for managed workflows that should be available across all spaces:

**Approach 1: Sentinel space ID (e.g., `_global`)**

Store the workflow once with a special `spaceId` (e.g., `_global`) instead of provisioning per space. All query paths change from `spaceId = currentSpace` to `spaceId = currentSpace OR spaceId = '_global'`. No per-space provisioning needed — the workflow exists once and is visible everywhere.

This avoids the new-space problem entirely (no provisioning needed), but raises a hard question: **execution context**. When a `_global` workflow runs, which space's resources does it use? Two sub-options:
- **Caller provides space at execution time** — The trigger or schedule specifies a space. The workflow definition is global, but each execution is space-scoped. This works for scheduled workflows (the schedule includes a target space) and API-triggered runs (the request carries a space).
- **Truly spaceless execution** — The workflow only uses space-agnostic resources (cluster-level APIs, external HTTP calls). This limits which steps can be used and is only viable for a narrow set of use cases.

**Approach 2: Provision into every space (current model)**

Each space gets its own copy of the workflow document. Execution context is unambiguous — the workflow runs in the space it belongs to, with access to that space's resources. The startup reconciliation loop handles existing spaces. The challenge is **newly created spaces**.

Today, the Spaces plugin has no public `onSpaceCreated` hook or event system. Space creation goes through `SpacesClient.create()` → saved object write → return. The only post-create logic is hard-coded in the route handler (not an extension point). Options for provisioning into new spaces:

- **Option A: `onSpaceCreated` hook on the Spaces plugin** — Propose a callback registry on `SpacesPluginSetup` (e.g., `spaces.onSpaceCreated(callback)`). The workflows plugin registers a listener at setup; when a space is created, it provisions all managed workflows. This is the only approach that fully satisfies R11 and requires cross-team collaboration with the Spaces team.
- **Option B: Lazy provisioning on first access** — When any workflow API is called in a space, check if managed workflows are provisioned. Cache the result per space. No dependency on the Spaces plugin, but workflows are missing until first use (does not fully meet R11).
- **Option C: Periodic reconciliation** — A Task Manager task that periodically scans all spaces and provisions missing workflows. Robust, no Spaces plugin dependency, but adds delay (up to one reconciliation interval) and background load.

**Recommendation:** Approach 1 (sentinel space ID). A single `_global` document eliminates the new-space provisioning problem entirely — no hooks, no lazy checks, no periodic tasks. The execution context question is addressed by the "caller provides space at execution time" sub-option: the workflow definition is stored once, but every execution is space-scoped (the trigger, schedule, or API request carries the target space). This keeps space-scoped resource access (connectors, rules, alerts) well-defined without duplicating the definition across spaces. Approach 2 remains a viable fallback if the sentinel pattern proves problematic with existing query paths.

**What about integrations?**

Integrations (Fleet packages) are a future distribution channel. The integration would call the same `registerManagedWorkflow` API during its install lifecycle. The API contract is the same — the only difference is *who* calls it (plugin `setup()` vs. integration install handler). This is deferred (N7) but the API design does not preclude it.

---

### 4. Lifecycle (Provisioning, Updates, Cleanup)

On startup, the platform reconciles the in-memory registry (what plugins declared) against storage (what's persisted per space). This covers R11 (auto-provisioning), R12 (privileged updates), R13 (plugin uninstall cleanup), and R14 (unregistration cleanup).

**Change detection** uses a SHA-256 hash of the YAML definition, stored in `definitionHash`. Today, `WorkflowProperties` has no version or hash field — updates are full document overwrites with no change detection. Once workflow versioning lands (#15776), managed workflows should adopt it. Until then:

**Hash computation:**

```typescript
import { createHash } from 'crypto';

function computeDefinitionHash(yaml: string): string {
  return createHash('sha256').update(yaml.trim()).digest('hex');
}
```

**Reconciliation on startup (in `workflows_management` `start()`):**

For each registered managed workflow, for each space:

1. Query `.workflows-workflows` by `id` + `spaceId`.
2. If not found → **create** with `managed: true`, `managedBy: pluginId`, `definitionHash: hash`, `enabled: registration.enabled ?? true`, `defaultEnabled: registration.enabled ?? true`, `preserveEnabledState: registration.preserveEnabledState ?? true`.
3. If found and `definitionHash` matches → **skip** (no I/O).
4. If found and `definitionHash` differs → **update** the `yaml`, `definition`, `definitionHash`, `defaultEnabled`, `preserveEnabledState`, `lastUpdatedBy: 'system'`. For the `enabled` field: if `preserveEnabledState` is `true`, keep the existing document's `enabled` value (user's choice survives). If `false`, reset `enabled` to `defaultEnabled` (registering team forces a state).
5. If found but `managed: false` → This shouldn't happen (ID collision between user workflow and managed workflow). Log a warning and skip. The caller-provided deterministic ID (R17) makes this unlikely but not impossible.

**Cleanup on unregistration (R14):**

After provisioning, a second pass handles orphans — managed workflows that exist in storage but are no longer in the in-memory registry (the plugin removed the registration in a new release):

1. For each space, query `.workflows-workflows` for documents where `managed: true` (or `managedBy` is set).
2. For each result, check if the `id` + `managedBy` pair exists in the in-memory registry.
3. If not found in the registry → **delete** the orphaned workflow from that space.

This can be combined with the provisioning pass (step 1 already loads existing managed workflows per space) to avoid extra queries.

**Cleanup on plugin uninstall (R13):**

When a plugin is uninstalled (removed from the Kibana deployment), it no longer calls `registerManagedWorkflow()` at `setup()`. Its workflows are absent from the in-memory registry, so the unregistration cleanup above handles removal automatically — no separate mechanism needed. The `managedBy` field identifies which workflows belonged to the removed plugin.

**Performance consideration:**

With N managed workflows and M spaces, reconciliation performs up to N*M queries on startup. For the expected scale (single-digit workflows, tens of spaces), this is acceptable. If scale grows, a bulk `mget` per space reduces to M queries total. The orphan cleanup adds one query per space (fetch all managed workflows), which can be merged with the provisioning query.

---

### 5. Execution Identity

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

**Recommendation:** Option C for the first delivery. On-demand and event-driven execution cover the immediate consumer needs (Attack Discovery is invoked from UI actions, Streams is invoked programmatically). Entity Analytics' scheduling requirement is blocked on execution identity regardless. This avoids building a temporary identity system that #15718 will replace.

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
