# Shape: per-Worker agent picker (Hunt Watch only)

Date: 2026-09-20
Branch: `worker-settings-card-alignment` (AlertZero Worker settings)

## Problem

Every AlertZero Worker that invokes Agent Builder today runs against whatever agent
its workflow YAML hardcodes. Security Rules already solved this for the alert
analysis workflow: the settings page exposes an **Agent** picker listing the default
agent plus user-created agents, persists the choice as `agentId`, and the workflow's
`ai.agent` step runs with it.

Hunt Watch's Continuous Threat Hunt Worker should get the same control — and only it.
No other Worker gains the field, and no Worker gets it turned on by default.

## Reference pattern (read from source, not recalled)

`x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/alert_analysis_workflow/`

- `index.tsx` — `EuiSuperSelect` with `data-test-subj="alertAnalysisWorkflowAgentSelector"`,
  `valueOfSelected={pageSettings?.agentId ?? agentBuilderDefaultAgentId}`, and an
  options list that **re-injects the selected id when it is missing from the fetched
  list**, so a deleted custom agent never silently loses the selection.
- `use_alert_analysis_workflow_agents.ts` — `agentBuilder.agents.list()`, filters
  `agent.readonly` (platform built-ins are not pickable), and gates `isLoading` on the
  same condition as the query's `enabled` (react-query v4 keeps `isLoading` true for a
  disabled query, which would otherwise spin forever).
- `common/workflows/alert_analysis_workflow.ts` — `agentId: z.string().min(1).max(64)`,
  max length matching Agent Builder's `agentIdMaxLength`.

## Where it lands in AlertZero

AlertZero's Worker settings are declaration-driven. `WorkerSettingsDeclaration`
(`kbn-alertzero-common/impl/worker_settings/types.ts`) has exactly one Worker-specific
slot: `extras` — a closed zod schema plus default, validated whole on every read and
write. The Watch page renders Worker-specific controls through
`custom_settings/registry.ts`, which maps worker id → component; **a Worker without an
entry renders only the shared controls**. That registry is already the mechanism that
makes this hunt-only.

So the picker is a Hunt Watch `extras` field plus a Hunt entry in the custom-settings
registry. Nothing in the shared page or the shared contract changes.

## The hard constraint: optional, not defaulted

The goal says the field must be **optional and not enabled by default per worker**.
Two distinct requirements, both of which the current contract actively fights:

1. **Not enabled per worker** — satisfied by the registry: only
   `SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID` maps to the picker.
   Every other Worker renders no agent control at all.

2. **Optional field** — this is the subtle one. `buildCompleteWorkerSettingsSchema`
   builds `z.object(shape).strict()`, and `buildDefaultWorkerSettings` spreads
   `extras.defaultValue` whenever the declaration has `extras`. If Hunt declared
   `extras: { schema: z.object({ agentId: z.string() }), defaultValue: { agentId: 'x' } }`,
   then **every fresh install would write a concrete agent id** — exactly the
   "enabled by default" the goal forbids — and every Hunt document written before this
   change (which has no `extras` key at all) would fail `parseWorkerValues` and strand
   the Worker as `state: 'unavailable'` (see `workers_service.projectWorker`, which
   catches the throw and sets `settingsUnavailable`).

   Therefore: `agentId` is `.optional()` **inside** the extras schema, and Hunt's
   `defaultValue` is the **empty object `{}`**. Absent means "no explicit choice —
   the workflow runs its default agent". The UI shows the default agent as the
   selected option without writing it, and only persists an id once the user
   actively picks one.

   The pre-existing-document case still needs handling: a stored Hunt document has
   no `extras` key, so `parseWorkerValues` builds a candidate without `extras`, and
   `buildCompleteWorkerSettingsSchema` puts `extras` in the shape as a **required**
   key whenever the declaration has one (`z.object({ agentId: z.string().optional() })`
   does not itself accept `undefined`, so the key stays required). That document would
   be rejected and the Worker would project as `state: 'unavailable'`.

   Decision: make `defaultValue` **optional on the declaration's `extras`**, and let
   its absence carry the meaning "this Worker's extras may be absent entirely":

   - `buildCompleteWorkerSettingsSchema` uses `declaration.extras.schema.optional()`
     when there is no `defaultValue`.
   - `buildDefaultWorkerSettings` omits `extras` when there is no `defaultValue`.

   That is one semantic signal rather than a boolean flag bolted next to the value it
   contradicts. Rule Tuning declares a `defaultValue` and therefore keeps its current
   strict required-extras behaviour unchanged — its existing tests are the proof.

## Persistence without touching the workflow YAML

Worth stating because it is not obvious: the durable store for Worker settings is the
managed workflow's **template values**, not the rendered YAML.
`WorkersService.update` persists `applied.values` via `installRegisteredWorker` and
reads them back through `getInstalledWorkflowState(...).templateValues`, which
`toSettings` parses. The YAML template is rendered *from* those values for the
workflow definition. `renderCommonWorkerYaml` destructures only `settingsVersion` and
`autonomyLevel`, so carrying `extras` through template values needs no YAML change and
no placeholder. The hunt YAML is therefore untouched.

## Out of scope

- Wiring the chosen agent into the hunt workflow YAML's `ai.agent` step. The hunt
  workflow is still a `console` stub (`hunt_continuous_threat_hunt.yaml`); there is no
  `ai.agent` step to point at. The template forwards the value so the step can consume
  it the moment the stub is replaced, but no agent actually runs yet. Stated plainly
  rather than implied.
- Any change to Rule Tuning, Rule Creation, Alert Triage or Attack Discovery.
- Server-side validation that the agent id exists. Mirrors alert analysis, which also
  does not verify existence — a deleted agent is handled in the UI by keeping the
  stale id visible rather than by rejecting the write.

## Alternatives rejected

- **Shared top-level `agentId` on `WorkerSettings`** (next to `autonomy`): would put
  the field on every Worker's wire contract and require per-Worker suppression in the
  shared panel. Contradicts "only for hunt watch" and inverts the declaration-driven
  design.
- **Defaulting `agentId` to `agentBuilderDefaultAgentId` in extras**: directly
  violates "not enabled by default" and writes a concrete choice the user never made.
  Rejected on the goal's own terms.
