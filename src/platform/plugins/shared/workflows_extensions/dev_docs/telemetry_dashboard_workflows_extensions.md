# Telemetry dashboard: workflows extensions usage (steps & triggers)

This guide is for **external contributors** and Elastic engineers who need a **filterable view** of how registered **step types** and **event triggers** show up in Elastic usage data. Step and trigger **registration** happens via `workflows_extensions`; **telemetry is emitted** when users author workflows and when runs execute—primarily from `workflows_management` (browser EBT) and `workflows_execution_engine` (server EBT).

For cluster access and index conventions, see the internal [**elastic/telemetry** repository](https://github.com/elastic/telemetry) (“I just want to see the data”).

---

## 1. Data views (EBT indices)

Workflows ship events to the standard Kibana EBT indices:

| Channel        | Typical data view title   | Use for |
|----------------|-----------------------------|---------|
| Browser / UI   | `ebt-kibana-browser`        | Editor actions, lifecycle, step test runs, validation |
| Server         | `ebt-kibana-server`         | Workflow execution outcomes, trigger dispatch, suppression |

Create **one dashboard** that queries **both** data views (two Discover sessions, or Lens panels pinned to each data view), or define a **combined** data view if your cluster allows comma-separated patterns—confirm field mappings with **Discover → Inspect / Field statistics**.

Common document fields:

| Field           | Meaning |
|-----------------|--------|
| `timestamp`     | Time field for time picker |
| `event_type`    | Stable event identifier (e.g. `workflows_trigger_event_dispatched`) |
| `properties.*` | Payload fields from the registered EBT schema (flattened with dot notation) |

---

## 2. Pattern filter (e.g. `cases.*`)

Pick a **prefix** that matches your plugin’s step types and trigger ids (often `yourPlugin.*` or `cases.*`). Use **KQL** with wildcards (`*`).

**Single dashboard filter** (narrow to workflows events and your namespace):

```kuery
event_type : workflows_* and (
  properties.stepTypes : cases* or
  properties.stepType : cases* or
  properties.failedStepType : cases* or
  properties.triggerId : cases* or
  properties.eventTriggerId : cases* or
  properties.triggerTypes : cases*
)
```

Adjust `cases` to your prefix (e.g. `observability`, `security_solution`).

**Why several fields:**  

- **Triggers at runtime:** server execution events use `properties.eventTriggerId`; dispatch telemetry uses `properties.triggerId`.  
- **Steps:** lifecycle and execution events include `properties.stepTypes` (array); UI step-test uses `properties.stepType`; failures may set `properties.failedStepType`.  
- **Saved workflows:** lifecycle events include `properties.triggerTypes` (YAML trigger kinds); event-driven **ids** are visible mainly in **server** execution/dispatch events.

**Controls:** Add an **Options list** control only if the field is keyword-friendly; wildcards are easiest in the **global query bar** or a **filter pill**. For a reusable “prefix” control, many teams use a **Parameters** / placeholder workflow—alternatively paste the KQL above and replace the prefix.

---

## 3. Event catalog (`event_type`)

These ship today for workflows-related telemetry (prefix `workflows_`). Source enums in-repo:

### Browser (`ebt-kibana-browser`)

| `event_type` | Plugin area | Extension-relevant payload |
|--------------|-------------|----------------------------|
| `workflows_workflow_created` | management | `properties.stepTypes`, `properties.triggerTypes`, `properties.stepTypeCounts` |
| `workflows_workflow_updated` | management | same |
| `workflows_workflow_deleted` | management | — |
| `workflows_workflow_cloned` | management | same |
| `workflows_workflow_enabled_state_changed` | management | — |
| `workflows_workflow_test_run_initiated` | management | — |
| `workflows_workflow_step_test_run_initiated` | management | **`properties.stepType`** |
| `workflows_workflow_run_initiated` | management | — |
| `workflows_workflow_run_cancelled` | management | — |
| `workflows_workflow_executions_cancelled` | management | — |
| `workflows_workflow_exported` / `workflows_workflow_imported` | management | metadata |
| `workflows_workflow_list_viewed` / `workflows_workflow_detail_viewed` / … | management | navigation |
| `workflows_workflow_validation_error` | management | validation |
| `workflows_ai_*` | management | AI chat |

### Server (`ebt-kibana-server`)

| `event_type` | Extension-relevant payload |
|--------------|----------------------------|
| `workflows_execution_workflow_completed` | **`properties.stepTypes`**, **`properties.eventTriggerId`**, execution metrics |
| `workflows_execution_workflow_failed` | above + **`properties.failedStepType`**, `properties.failedStepId` |
| `workflows_execution_workflow_cancelled` | **`properties.stepTypes`**, **`properties.eventTriggerId`** |
| `workflows_event_driven_execution_suppressed` | **`properties.eventTriggerId`** (when present on execution) |
| `workflows_trigger_event_dispatched` | **`properties.triggerId`**, dispatch counts |

Schema definitions (authoritative field lists and types):

- Browser + shared naming: `src/platform/plugins/shared/workflows_management/public/common/lib/telemetry/events/workflows/`
- Server execution: `src/platform/plugins/shared/workflows_execution_engine/server/lib/telemetry/events/workflows_execution/index.ts`

---

## 4. Suggested dashboard panels

Build in **Lens** or **Discover**; apply the **same KQL** from §2 on each panel (or set it once at dashboard level).

1. **Event volume over time** — Histogram / area: count by `@timestamp`, breakdown by `event_type`, filter with §2.  
2. **Trigger dispatch health** — Filter `event_type : workflows_trigger_event_dispatched` + prefix on `properties.triggerId`; chart `properties.matchedCount`, `properties.scheduledSuccessCount`, `properties.scheduledFailureCount` (numeric).  
3. **Execution outcomes** — Filter `event_type : workflows_execution_workflow_*`; metric counts completed vs failed; optional breakdown `properties.eventTriggerId`.  
4. **Step adoption in saved workflows** — Filter lifecycle events; **Top values** of `properties.stepTypes` (or aggregate from keyword array as supported).  
5. **Raw drill-down** — Saved Discover session with columns `timestamp`, `event_type`, `properties.triggerId`, `properties.eventTriggerId`, `properties.stepTypes`, `properties.stepType`, `properties.failedStepType`.

---

## 5. Privacy and interpretation

- Telemetry is aggregated across customers; follow Elastic policies for internal use only.  
- **Do not** treat counts as exact customer counts without statistical context.  
- Step/trigger **ids** are product-defined strings (e.g. `cases.caseCreated`), not customer secret data—still handle exports responsibly.

---

## 6. Quick reference: prefix swap

| Goal | Example KQL fragment |
|------|----------------------|
| All workflows telemetry for prefix | `event_type : workflows_* and (properties.triggerId : cases* or properties.eventTriggerId : cases* or properties.stepTypes : cases* or properties.stepType : cases*)` |
| Dispatch only | `event_type : workflows_trigger_event_dispatched and properties.triggerId : cases*` |
| Runs triggered by your event id | `properties.eventTriggerId : cases.case*` |
| Step test runs from UI | `event_type : workflows_workflow_step_test_run_initiated and properties.stepType : cases*` |

Replace `cases` with your team’s id prefix as needed.
