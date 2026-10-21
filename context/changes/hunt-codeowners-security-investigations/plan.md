# Hunt Watch CODEOWNERS → `@elastic/security-investigations` Implementation Plan

## Overview

Ensure every Hunt Watch file in the repository resolves to `@elastic/security-investigations` in `.github/CODEOWNERS`, and reorganize Hunt Watch files into `hunt/` subdirectories where feasible so ownership is expressed with directory rules instead of brittle per-file entries and so shared test files don't pull unrelated teams onto Hunt Watch PRs.

**Context & Motivation**: Hunt Watch is owned by `@elastic/security-investigations`, not `@elastic/security-solution`. Today `.github/CODEOWNERS` (lines 3229–3234) assigns only a partial subset of Hunt Watch paths (`alertzero/server/routes/hunt`, `alertzero/server/services/watches/hunt`, and `kbn-alertzero-common/impl/schemas/hunt*`) to `@elastic/security-investigations`. All other Hunt Watch files — in `@kbn/workflows` (`hunt*`, `find_or_create_investigation.*`, `hunt_worker_workflows.test.ts`, `worker_reports.hunt.test.ts`, `renderHuntWorkerYaml` inside `worker_template_values.ts`), in `@kbn/alertzero-common` (`impl/worker_settings/hunt_watch.ts`), and across `x-pack/solutions/security/plugins/alertzero` (`threat_intel_supply` service, UI components/hooks, `package_report` step, `hunt_coordinator_result` attachment, outcome telemetry contract, and contract tests) — fall back to `@elastic/security-solution` or `@elastic/kibana-jai-workflows`. Worse, Hunt Watch assertions embedded in shared test files (`managed_workflow_definitions.test.ts`, `worker_template_values.test.ts`) force `@elastic/kibana-jai-workflows` / `@elastic/security-solution` review on every Hunt Watch change.

## Current State (Verified)

Snapshot: commit `737fd000d892` (`upstream/main` as of 2026-10-21).

### Existing `.github/CODEOWNERS` entries for Hunt Watch & Threat Intel (lines 3219–3236)

```
# Threat intel supply pipeline
src/platform/packages/shared/kbn-workflows/managed/definitions/threat_intel @elastic/security-investigations
/x-pack/solutions/security/plugins/security_solution/server/threat_intel @elastic/security-investigations
/x-pack/solutions/security/plugins/security_solution/common/threat_intel @elastic/security-investigations
/x-pack/solutions/security/plugins/security_solution/test/scout_alertzero @elastic/security-investigations
/src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/alertzero @elastic/security-investigations
/src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_threat_intel @elastic/security-investigations
/src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_hunt_watch @elastic/security-investigations
x-pack/solutions/security/plugins/security_solution/common/workflows/alert_analysis_workflow.ts @elastic/security-investigations

# AlertZero Hunt Watch services
/x-pack/solutions/security/plugins/alertzero/server/routes/hunt @elastic/security-investigations
/x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt @elastic/security-investigations
/x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/hunt @elastic/security-investigations
/x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/components/hunt.schema.yaml @elastic/security-investigations
/x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/components/hunt.gen.ts @elastic/security-investigations
x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/alert_analysis_workflow @elastic/security-investigations
x-pack/solutions/security/plugins/security_solution/server/workflows/alert_analysis_workflow @elastic/security-investigations
```

Additionally, `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch` is in the generated CODEOWNERS section via `"owner": ["@elastic/security-investigations"]` in its `kibana.jsonc`.

### Gaps — Hunt Watch files currently resolving to `@elastic/security-solution` (or `@elastic/kibana-jai-workflows`)

| Path | Current owner | Why |
|---|---|---|
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt.ts` + `.yaml` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `.github/CODEOWNERS:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.ts` + `.yaml` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_package_report.ts` + `.yaml` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_proposal_gate.ts` + `.yaml` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/find_or_create_investigation.ts` + `.yaml` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_worker_workflows.test.ts` | `@elastic/security-solution` | Matches `definitions/alertzero` rule at `:3202` |
| `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_reports.hunt.test.ts` | `@elastic/security-solution` | Added in PR #298655; matches `definitions/alertzero` rule at `:3202` |
| `HuntWorkerTemplateValues` + `HUNT_WORKER_DEFAULTS` + `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT` + `renderHuntWorkerYaml` inside `definitions/alertzero/worker_template_values.ts` (lines 88–136) & `'Continuous Threat Hunt'` row in `worker_template_values.test.ts` (lines 62–70) | `@elastic/security-solution` | Mixed into shared template helper file |
| Continuous Threat Hunt render-input fingerprint row (`:250-254`, plus `HUNT_CONTINUOUS_THREAT_HUNT_YAML` import at `:55`) & `describe('Hunt Watch: registry-wide checks')` (`:435-489`) in `src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts` | `@elastic/kibana-jai-workflows` | Embedded in package-level test file |
| `x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/hunt_watch.ts` | `@elastic/security-solution` | Package default owner |
| `x-pack/solutions/security/plugins/alertzero/common/hunt_coordinator_result_attachment_schema.ts` | `@elastic/security-solution` | Plugin default owner (added in PR #297329) |
| `x-pack/solutions/security/plugins/alertzero/common/step_types/package_report.ts` + `.test.ts` | `@elastic/security-solution` | Plugin default owner (`hunt.packageReport` step schema) |
| `x-pack/solutions/security/plugins/alertzero/server/agent_builder/attachments/hunt_coordinator_result.ts` + `.test.ts` | `@elastic/security-solution` | Plugin default owner (added in PR #297329) |
| `x-pack/solutions/security/plugins/alertzero/server/services/threat_intel_supply/**` (11 files) | `@elastic/security-solution` | Plugin default owner |
| `x-pack/solutions/security/plugins/alertzero/server/step_types/package_report/**` (`index.ts`, `package_report_step.ts`, `package_report_step.test.ts`) | `@elastic/security-solution` | Plugin default owner (`hunt.packageReport` step implementation) |
| `x-pack/solutions/security/plugins/alertzero/server/step_types/report_worker_outcome/shipped_yaml_contract.hunt.fixture.ts` + `.test.ts` | `@elastic/security-solution` | Plugin default owner (added in PR #298655) |
| `x-pack/solutions/security/plugins/alertzero/server/telemetry/workers/hunt.md` | `@elastic/security-solution` | Plugin default owner (added in PR #298655) |
| `x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt_children_contract.test.ts` | `@elastic/security-solution` | Plugin default owner |
| `x-pack/solutions/security/plugins/alertzero/public/hooks/use_hunt_threat_intel_supply.ts` | `@elastic/security-solution` | Plugin default owner |
| `x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/threat_intel_supply_section.tsx` + `.test.tsx` | `@elastic/security-solution` | Plugin default owner |

### Files intentionally left shared (multi-worker registries / union types / shared settings UI)

These files touch all AlertZero Workers (Triage, Attack Discovery, Forensics, Detection, Hunt) and must remain owned by `@elastic/security-solution` (or co-owned with `@elastic/alertzero-common-layer` / `@elastic/kibana-jai-workflows` where already configured):
- `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/index.ts` and `src/platform/packages/shared/kbn-workflows/managed/definitions/index.ts`
- `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_settings_defaults.ts` (+ `.test.ts`)
- `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/service_account_inheritance.test.ts` and `worker_close_reports.test.ts` (cross-worker invariant tests over all Workers)
- `src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts` (`templateRepresentativeValuesById` entry for `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` at `:117`, required by the registry-wide `'defines representative template values for every yamlTemplate workflow'` test at `:410`)
- `x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/{index,types,contract,worker_settings.test}.ts`
- `x-pack/solutions/security/packages/kbn-alertzero-common/threat_intel_mapping.{ts,test.ts}` (shared between `security_solution/server/threat_intel` and `alertzero/server/services/threat_intel_supply`)
- `x-pack/solutions/security/plugins/alertzero/common/constants.ts` and `common/worker_names.ts`
- `x-pack/solutions/security/plugins/alertzero/public/pages/watches/**` (except `threat_intel_supply_section.*`), `public/hooks/use_workers_api.{ts,test.tsx}`, `server/services/watches/**` (except `hunt/**`), `server/routes/workers/**`, `server/plugin.ts`
- `x-pack/solutions/security/plugins/alertzero/server/managed_workflows/workers/{worker_settings_compat.test.ts,test_helpers/**,fixtures/**}` (tests every Worker's settings against its YAML)

## Desired End State

1. Every Hunt Watch-dedicated file in `@kbn/workflows`, `@kbn/alertzero-common`, `@kbn/evals-suite-hunt-watch`, and `x-pack/solutions/security/plugins/alertzero` resolves to `Teams: [ 'elastic/security-investigations' ]` via `node scripts/get_owners_for_file.js --path <path>`.
2. In `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/`:
   - All Hunt Watch workflow definitions, template helpers, and Hunt-only tests live under `definitions/alertzero/hunt/`:
     - `hunt.ts`, `hunt.yaml`
     - `hunt_continuous_threat_hunt.ts`, `hunt_continuous_threat_hunt.yaml`
     - `hunt_package_report.ts`, `hunt_package_report.yaml`
     - `hunt_proposal_gate.ts`, `hunt_proposal_gate.yaml`
     - `find_or_create_investigation.ts`, `find_or_create_investigation.yaml`
     - `hunt_worker_template.ts`, `hunt_worker_template.test.ts` (extracted from `worker_template_values.ts` / `.test.ts`)
     - `hunt_worker_workflows.test.ts`
     - `worker_reports.hunt.test.ts` (moved from `definitions/alertzero/worker_reports.hunt.test.ts`)
     - `hunt_version_hashes.test.ts` and `hunt_registry.test.ts` (extracted from `managed_workflow_definitions.test.ts`)
     - `index.ts` (barrel re-exporting the 5 workflow definitions and their 5 IDs via explicit named exports)
   - `definitions/alertzero/index.ts` imports and re-exports the 5 workflow definitions and 5 IDs from `./hunt` using explicit named exports, so `@kbn/workflows/managed`'s public surface is 100% unchanged.
   - A single directory rule `/src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt @elastic/security-investigations` covers all Hunt Watch files in `@kbn/workflows`.
3. Editing `hunt_continuous_threat_hunt.yaml` or its `version` bumps only `hunt_version_hashes.test.ts` ( and `worker_reports.hunt.test.ts`, both owned by `@elastic/security-investigations`), never `managed_workflow_definitions.test.ts` (owned by `@elastic/kibana-jai-workflows`).
4. `node scripts/generate codeowners --clean-empty && git diff --exit-code .github/CODEOWNERS` and `node .buildkite/scripts/steps/checks/verify_codeowners_teams.ts` pass with zero diff/errors.

## Out of Scope

- Changing any runtime behavior, workflow YAML content, or workflow `version` numbers (per `managed-workflow-version-bump` rule, never bump `version` unless explicitly asked).
- Splitting cross-worker registries (`constants.ts`, `worker_settings_defaults.ts`, `worker_settings_compat.test.ts`, `service_account_inheritance.test.ts`, `worker_close_reports.test.ts`, `templateRepresentativeValuesById`).
- Changing package-level `owner` in any `kibana.jsonc`.
- Moving `threat_intel_supply_section.tsx` out of `public/pages/watches/components/` (kept alongside `worker_settings_panel.tsx` and covered with file-level rules).

## Risks & Dependencies

- **Public barrel exports of `@kbn/workflows/managed`**: External callers import `ALERTZERO_HUNT_WORKFLOW_ID`, `ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW`, etc. from `@kbn/workflows/managed`. Explicit named re-exports from `./hunt` in `definitions/alertzero/index.ts` preserve all public exports.
- **`yamlTemplate.toString()` hash**: `ManagedWorkflowsService` hashes `definition.yamlTemplate.toString()` for template definitions (`managed_workflows_service.ts:932`). Moving `renderHuntWorkerYaml` from `./worker_template_values` to `./hunt_worker_template` changes the compiled CommonJS module identifier inside `yamlTemplate.toString()` (`_worker_template_values` → `_hunt_worker_template`), which triggers a harmless one-time re-reconcile of the identical rendered YAML on next boot without requiring a `version` bump.
- **`@kbn/evals-suite-hunt-watch` lockdown & collect tests**: `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/lockdown.ts` scans Hunt Watch workflow definitions by directory, and `src/collect.test.ts` reads `hunt.yaml` by repo-relative path. Moving the files into `definitions/alertzero/hunt/` requires updating `lockdown.ts` (`LOCKDOWN_SCAN_PATHS`), `lockdown.test.ts`, and `collect.test.ts`.
- **Previously open PRs**: PRs #297827, #297846, #297496, #297329, #298449, #298655, and #299293 have all merged into `main` as of 2026-10-21.

## Critical Implementation Details

- **Package boundary rule (`@kbn/eslint-import-Notices` / `@kbn/workflows`)**: Files inside `src/platform/packages/shared/kbn-workflows` use relative imports within the package; consumers outside the package import from `@kbn/workflows/managed` only (no subpath imports into `managed/definitions/...`).
- **Explicit named exports**: Per `AGENTS.md`, use explicit named `export { ... } from './...'` statements in `definitions/alertzero/hunt/index.ts` and `definitions/alertzero/index.ts` — never `export *`.
- **YAML imports**: Webpack/Jest raw loader resolves `.yaml` via relative path (`import HUNT_YAML from './hunt.yaml'`). Moving `.ts` and `.yaml` together into `definitions/alertzero/hunt/` keeps all `./*.yaml` imports unchanged; only parent-directory shared imports change by one `../` level.
- **Test harness extraction in `hunt_registry.test.ts` and `hunt_version_hashes.test.ts`**:
  - In `hunt_version_hashes.test.ts`, copy the 6-line `createContentFingerprint` polynomial rolling hash (`(fingerprint * 31 + character.charCodeAt(0)) % 0xffffffff`) and `renderInputs` helper from `managed_workflow_definitions.test.ts:211-225` to verify `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW`'s `'5:4b67ee5b'` fingerprint against `HUNT_CONTINUOUS_THREAT_HUNT_YAML` and `CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS`.
  - In `hunt_registry.test.ts`, `renderWorkflowYaml` renders every workflow in `managedWorkflowDefinitions` to inspect top-level `tags`. Because `NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW`'s `yamlTemplate` requires a non-empty `serviceAccountId` (`render_bound_yaml.ts:17-19` throws `Error: A bound Nightshift workflow requires a serviceAccountId` otherwise) and AlertZero Workers expect `{ settingsVersion, autonomyLevel }` (with `upgradeStoredWorkerSettings` filling `scheduleInterval` and `extras`), pass `{ settingsVersion: 1, autonomyLevel: 'manual', serviceAccountId: 'kibana/nightshift_agent' } as never` to `definition.yamlTemplate(...)`.
- **CODEOWNERS rule ordering**: In `.github/CODEOWNERS`, later lines override earlier lines. All `@elastic/security-investigations` rules under `# AlertZero Hunt Watch services` (lines 3229–3234) appear after `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero @elastic/security-solution` (line 3202) and after the generated package entries for `kbn-alertzero-common` (line 804) and `alertzero` (line 871), so they take precedence.

---

## Phase 1: Consolidate Hunt Watch definitions & tests into `definitions/alertzero/hunt/`

**Goal**: Group every Hunt Watch workflow definition, template helper, and Hunt-specific test in `@kbn/workflows` under `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/`, and update `@kbn/evals-suite-hunt-watch` for the new paths.

### Changes Required

1. **`git mv` the 12 existing Hunt files into `definitions/alertzero/hunt/`**
   - **Files**:
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt.ts` → `.../alertzero/hunt/hunt.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt.yaml` → `.../alertzero/hunt/hunt.yaml`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.ts` → `.../alertzero/hunt/hunt_continuous_threat_hunt.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.yaml` → `.../alertzero/hunt/hunt_continuous_threat_hunt.yaml`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_package_report.ts` → `.../alertzero/hunt/hunt_package_report.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_package_report.yaml` → `.../alertzero/hunt/hunt_package_report.yaml`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_proposal_gate.ts` → `.../alertzero/hunt/hunt_proposal_gate.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_proposal_gate.yaml` → `.../alertzero/hunt/hunt_proposal_gate.yaml`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/find_or_create_investigation.ts` → `.../alertzero/hunt/find_or_create_investigation.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/find_or_create_investigation.yaml` → `.../alertzero/hunt/find_or_create_investigation.yaml`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_worker_workflows.test.ts` → `.../alertzero/hunt/hunt_worker_workflows.test.ts`
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_reports.hunt.test.ts` → `.../alertzero/hunt/worker_reports.hunt.test.ts`
   - **Import path updates inside moved `.ts` files**:
     - In all 5 definition `.ts` files (`hunt.ts`, `hunt_continuous_threat_hunt.ts`, `hunt_package_report.ts`, `hunt_proposal_gate.ts`, `find_or_create_investigation.ts`):
       - `./constants` → `../constants`
       - `../../types` → `../../../types`
     - In `hunt_continuous_threat_hunt.ts`:
       - `./worker_settings_defaults` → `../worker_settings_defaults`
       - `./worker_template_values` → `./hunt_worker_template`
     - In `hunt_worker_workflows.test.ts` (lines 18–21; note `from '.'` at `:17` stays `from '.'` and resolves to `hunt/index.ts`):
       - `./journal_note` → `../journal_note`
       - `../../../common/utils` → `../../../../common/utils`
       - `../../../graph` → `../../../../graph`
       - `../../../spec/schema` → `../../../../spec/schema`
     - In `worker_reports.hunt.test.ts` (line 25; note `from '.'` at `:16` stays `from '.'` and resolves to `hunt/index.ts`):
       - `./worker_reports.test_helpers` → `../worker_reports.test_helpers`

2. **Extract `HuntWorkerTemplateValues`, `HUNT_WORKER_DEFAULTS`, `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT`, and `renderHuntWorkerYaml` into `hunt/hunt_worker_template.ts` (and `hunt/hunt_worker_template.test.ts`)**
   - **Files**:
     - Create `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_worker_template.ts`
     - Create `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_worker_template.test.ts`
     - Modify `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_template_values.ts` (remove lines 88–136)
     - Modify `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_template_values.test.ts` (remove `HUNT_CONTINUOUS_THREAT_HUNT_YAML` import at `:16`, `renderHuntWorkerYaml` import at `:20`, and `'Continuous Threat Hunt'` entry at `:62-70`)
     - Modify comments in `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_continuous_threat_hunt.yaml` (`:31-32`) and `x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/hunt_watch.ts` (`:14-15`)
   - **Contract**:
     - Move lines 88–136 of `worker_template_values.ts` (`HuntWorkerTemplateValues`, `HUNT_WORKER_DEFAULTS`, `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT`, and `renderHuntWorkerYaml`) into `hunt/hunt_worker_template.ts`, importing `renderScheduledWorkerYaml` and `type ScheduledWorkerTemplateValues` from `../worker_template_values`.
     - Remove `'Continuous Threat Hunt'` (and the unused `HUNT_CONTINUOUS_THREAT_HUNT_YAML` and `renderHuntWorkerYaml` imports) from `worker_template_values.test.ts`.
     - In `hunt/hunt_worker_template.test.ts`, test both:
       1. The 3 `renderRunAs` behaviors (`renders settings as an object when no account is stored`, `omits run_as when no account is stored`, `round-trips a quoted service account id`).
       2. The Hunt-specific placeholder substitutions (`__WORKER_TRIGGERS__` including the `manual` trigger's `reportIds` input and `scheduled` interval, `__WORKER_TIER2_WHEN__`, `__WORKER_CANDIDATE_LIMIT__`, `__WORKER_FAN_OUT_MAX__`).
     - Update the filename in the comments at `hunt_continuous_threat_hunt.yaml:32` and `kbn-alertzero-common/impl/worker_settings/hunt_watch.ts:15` from `worker_template_values.ts` to `hunt_worker_template.ts`.

3. **Create barrel `hunt/index.ts`, re-export from `definitions/alertzero/index.ts`, and update internal callers**
   - **Files**:
     - Create `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/index.ts`
     - Modify `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/index.ts` (lines 32, 40–43, 127–139, 144–147)
     - Modify `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/forensics_proposal_gate.test.ts` (`:16`)
   - **Contract**:
     - `hunt/index.ts` uses explicit named exports to re-export:
       - `ALERTZERO_HUNT_WORKFLOW`, `ALERTZERO_HUNT_WORKFLOW_ID` from `./hunt`
       - `ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW`, `ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID` from `./find_or_create_investigation`
       - `ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW`, `ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID` from `./hunt_package_report`
       - `ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW`, `ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID` from `./hunt_proposal_gate`
       - `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW`, `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` from `./hunt_continuous_threat_hunt`
       - `type HuntWorkerTemplateValues`, `renderHuntWorkerYaml` from `./hunt_worker_template`
     - `definitions/alertzero/index.ts` updates its imports (`:32, :40-43`, used by `ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS` and `ALERTZERO_HUNT_CHILD_WORKFLOW_IDS`) and its explicit named re-exports (`:127-139, :144-147`) of those 10 symbols to come from `'./hunt'`.
     - `forensics_proposal_gate.test.ts:16` updates `import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW } from './hunt_proposal_gate';` to `import { ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW } from './hunt';`.

4. **Split Continuous Threat Hunt render-input fingerprint check out of `managed_workflow_definitions.test.ts` into `hunt/hunt_version_hashes.test.ts`**
   - **Files**:
     - Modify `src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts` (`:55, :59, :250-254`)
     - Create `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_version_hashes.test.ts`
   - **Contract**:
     - Remove the `[ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID, renderInputs(HUNT_CONTINUOUS_THREAT_HUNT_YAML, CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS), '5:4b67ee5b']` row (`:250-254`), the `HUNT_CONTINUOUS_THREAT_HUNT_YAML` import (`:55`), and the `CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS` import (`:59`) from `managed_workflow_definitions.test.ts`. (Keep `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` imported in `managed_workflow_definitions.test.ts` because `templateRepresentativeValuesById` at `:117` still uses it.)
     - Create `definitions/alertzero/hunt/hunt_version_hashes.test.ts` asserting that `${ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW.version}:${createContentFingerprint(renderInputs(HUNT_CONTINUOUS_THREAT_HUNT_YAML, CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS))}` equals `'5:4b67ee5b'` using a local copy of `createContentFingerprint` and `renderInputs` from `managed_workflow_definitions.test.ts:211-225`. (Note: the 4 child workflow integer versions are already pinned in `worker_reports.hunt.test.ts:572-585`.)

5. **Split `describe('Hunt Watch: registry-wide checks')` out of `managed_workflow_definitions.test.ts` into `hunt/hunt_registry.test.ts`**
   - **Files**:
     - Modify `src/platform/packages/shared/kbn-workflows/managed/managed_workflow_definitions.test.ts` (`:26, :435-489`)
     - Create `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_registry.test.ts`
   - **Contract**:
     - Delete `describe('Hunt Watch: registry-wide checks')` (`:435-489`) and the now-unused `ALERTZERO_HUNT_CHILD_WORKFLOW_IDS` import (`:26`) from `managed_workflow_definitions.test.ts`.
     - Recreate `describe('Hunt Watch: registry-wide checks')` in `hunt_registry.test.ts`, importing `managedWorkflowDefinitions` from `../../..`, `ALERTZERO_HUNT_CHILD_WORKFLOW_IDS` from `..`, and `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` from `.`, and rendering templated definitions with `{ settingsVersion: 1, autonomyLevel: 'manual', serviceAccountId: 'kibana/nightshift_agent' } as never`:
       ```ts
       const renderWorkflowYaml = (
         definition: (typeof managedWorkflowDefinitions)[number]
       ): string =>
         'yaml' in definition
           ? definition.yaml
           : definition.yamlTemplate({
               settingsVersion: 1,
               autonomyLevel: 'manual',
               serviceAccountId: 'kibana/nightshift_agent',
             } as never);
       ```

6. **Update `@kbn/evals-suite-hunt-watch` for moved `definitions/alertzero/hunt/` files**
   - **Files**:
     - Modify `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/collect.test.ts` (`:18`)
     - Modify `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/constants.ts` (`:37`)
     - Modify `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/lockdown.ts` (`:22-25`, `:100-106`)
     - Modify `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/lockdown.test.ts` (`:25-26`)
   - **Contract**:
     - `collect.test.ts:18`: update `'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt.yaml'` → `'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt.yaml'`.
     - `constants.ts:37`: update comment `'kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.yaml'` → `'kbn-workflows/managed/definitions/alertzero/hunt/hunt_continuous_threat_hunt.yaml'`.
     - `lockdown.ts:22-25` and `:100-106`: replace `{ dir: 'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero', file: /^hunt[^/]*\.(ts|yaml)$/ }` with `{ dir: 'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt' }`, and simplify `listLockdownFiles()` (`:100-106`) to drop the now-dead `'file' in scope` branch (which would otherwise narrow `scope.file` to `unknown` and fail `tsc` with `TS18046`):
       ```ts
       export const listLockdownFiles = (): string[] =>
         LOCKDOWN_SCAN_PATHS.flatMap(({ dir }) =>
           listFiles(Path.join(REPO_ROOT, dir))
             .filter((file) => /\.(ts|yaml)$/.test(Path.basename(file)) && !isTestFile(file))
             .map((file) => Path.relative(REPO_ROOT, file))
         );
       ```
     - `lockdown.test.ts:25-26`: update expected paths to `'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt.yaml'` and `'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/hunt_proposal_gate.yaml'`.

### Automated Verification
- `node scripts/jest src/platform/packages/shared/kbn-workflows/managed`
- `node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch`
- `node scripts/type_check --project src/platform/packages/shared/kbn-workflows/tsconfig.json`
- `node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/tsconfig.json`
- `node scripts/type_check --project x-pack/solutions/security/packages/kbn-alertzero-common/tsconfig.json`

### Manual Verification
- Confirm `definitions/alertzero/` top-level listing contains no `hunt*`, `worker_reports.hunt.test.ts`, or `find_or_create_investigation.*` files.

---

## Phase 2: Group isolated Hunt Watch files into `hunt/` subdirectories in `alertzero`

**Goal**: Move standalone single-file Hunt Watch modules in `x-pack/solutions/security/plugins/alertzero` into `hunt/` subdirectories where imports are purely local, so `.github/CODEOWNERS` can use directory rules.

### Changes Required

1. **Move `hunt_children_contract.test.ts` into `server/managed_workflows/hunt/`**
   - **File**: `git mv x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt_children_contract.test.ts x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt/hunt_children_contract.test.ts`
   - **Contract**: The test only imports from `yaml`, `@kbn/alertzero-common`, `@kbn/workflows`, and `@kbn/workflows/managed` (zero relative imports), so no import edits are needed.

2. **Move `use_hunt_threat_intel_supply.ts` into `public/hooks/hunt/`**
   - **Files**:
     - `git mv x-pack/solutions/security/plugins/alertzero/public/hooks/use_hunt_threat_intel_supply.ts x-pack/solutions/security/plugins/alertzero/public/hooks/hunt/use_hunt_threat_intel_supply.ts`
     - Modify `x-pack/solutions/security/plugins/alertzero/public/hooks/use_workers_api.ts` (`:21`)
     - Modify `x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/threat_intel_supply_section.tsx` (`:23`)
     - Modify `x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/worker_settings_panel.test.tsx` (`:27, :323`)
     - Modify `x-pack/solutions/security/plugins/alertzero/public/pages/watches/watch_detail.test.tsx` (`:47`)
   - **Contract**:
     - Inside `public/hooks/hunt/use_hunt_threat_intel_supply.ts` (`:17-18`):
       - `./retry_on_transient_error` → `../retry_on_transient_error`
       - `../query_keys` → `../../query_keys`
     - Inside `public/hooks/use_workers_api.ts` (`:21`):
       - `./use_hunt_threat_intel_supply` → `./hunt/use_hunt_threat_intel_supply`
     - Inside `public/pages/watches/components/threat_intel_supply_section.tsx` (`:23`):
       - `../../../hooks/use_hunt_threat_intel_supply` → `../../../hooks/hunt/use_hunt_threat_intel_supply`
     - Inside `public/pages/watches/components/worker_settings_panel.test.tsx` (`:27` and `:323`):
       - `'../../../hooks/use_hunt_threat_intel_supply'` → `'../../../hooks/hunt/use_hunt_threat_intel_supply'`
     - Inside `public/pages/watches/watch_detail.test.tsx` (`:47`):
       - `jest.mock('../../hooks/use_hunt_threat_intel_supply', ...)` → `jest.mock('../../hooks/hunt/use_hunt_threat_intel_supply', ...)`

### Automated Verification
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt/hunt_children_contract.test.ts`
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/public/hooks/use_workers_api.test.tsx`
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/public/pages/watches`
- `node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json`

---

## Phase 3: Update `.github/CODEOWNERS` and verify every Hunt Watch path

**Goal**: Expand the `# AlertZero Hunt Watch services` block in `.github/CODEOWNERS` (lines 3229–3234) so every Hunt Watch directory and file in `@kbn/workflows`, `@kbn/alertzero-common`, and `alertzero` resolves to `@elastic/security-investigations`.

### Changes Required

1. **Update `# AlertZero Hunt Watch services` block in `.github/CODEOWNERS` (lines 3229–3236)**
   - **File**: `.github/CODEOWNERS`
   - **Replace lines 3229–3236 with** (preserving the 5 existing Hunt Watch rules and the 2 `alert_analysis_workflow` lines, and adding the 16 missing Hunt Watch rules):
     ```
     # AlertZero Hunt Watch services
     /src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt @elastic/security-investigations
     /x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/hunt @elastic/security-investigations
     /x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/components/hunt.schema.yaml @elastic/security-investigations
     /x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/components/hunt.gen.ts @elastic/security-investigations
     /x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/hunt_watch.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/common/hunt_coordinator_result_attachment_schema.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/common/step_types/package_report.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/common/step_types/package_report.test.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/public/hooks/hunt @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/threat_intel_supply_section.tsx @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/threat_intel_supply_section.test.tsx @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/agent_builder/attachments/hunt_coordinator_result.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/agent_builder/attachments/hunt_coordinator_result.test.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/routes/hunt @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/services/threat_intel_supply @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/step_types/package_report @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/step_types/report_worker_outcome/shipped_yaml_contract.hunt.fixture.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/step_types/report_worker_outcome/shipped_yaml_contract.hunt.test.ts @elastic/security-investigations
     /x-pack/solutions/security/plugins/alertzero/server/telemetry/workers/hunt.md @elastic/security-investigations
     x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/alert_analysis_workflow @elastic/security-investigations
     x-pack/solutions/security/plugins/security_solution/server/workflows/alert_analysis_workflow @elastic/security-investigations
     ```

2. **Verify ownership resolution and CI checks**
   - Run `node scripts/get_owners_for_file.js --path <path>` across every Hunt Watch file in:
     - `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt/**`
     - `x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/hunt/**`
     - `x-pack/solutions/security/packages/kbn-alertzero-common/impl/schemas/components/{hunt.schema.yaml,hunt.gen.ts}`
     - `x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/hunt_watch.ts`
     - `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/**`
     - `x-pack/solutions/security/plugins/alertzero/common/hunt_coordinator_result_attachment_schema.ts`
     - `x-pack/solutions/security/plugins/alertzero/common/step_types/package_report.{ts,test.ts}`
     - `x-pack/solutions/security/plugins/alertzero/public/hooks/hunt/**`
     - `x-pack/solutions/security/plugins/alertzero/public/pages/watches/components/threat_intel_supply_section.{tsx,test.tsx}`
     - `x-pack/solutions/security/plugins/alertzero/server/agent_builder/attachments/hunt_coordinator_result.{ts,test.ts}`
     - `x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt/**`
     - `x-pack/solutions/security/plugins/alertzero/server/routes/hunt/**`
     - `x-pack/solutions/security/plugins/alertzero/server/services/threat_intel_supply/**`
     - `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/**`
     - `x-pack/solutions/security/plugins/alertzero/server/step_types/package_report/**`
     - `x-pack/solutions/security/plugins/alertzero/server/step_types/report_worker_outcome/shipped_yaml_contract.hunt.{fixture.ts,test.ts}`
     - `x-pack/solutions/security/plugins/alertzero/server/telemetry/workers/hunt.md`
   - Verify CODEOWNERS generator & dead-entry check pass cleanly: `node scripts/generate codeowners --clean-empty && git diff --exit-code .github/CODEOWNERS`.
   - Run team validation directly: `node .buildkite/scripts/steps/checks/verify_codeowners_teams.ts`.
   - Run linter on changed files: `node scripts/eslint --fix $(git diff --name-only)`.

### Automated Verification
- `node .buildkite/scripts/steps/checks/verify_codeowners_teams.ts`
- `node scripts/generate codeowners --clean-empty && git diff --exit-code .github/CODEOWNERS`
- `node scripts/jest src/platform/packages/private/kbn-code-owners`
- `node scripts/eslint $(git diff --name-only)`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.
>
> Beads (`kibana-15c`, `.1` to `.3`) is the record: update child notes with branch, PR URL,
> draft status, pushed SHA, and gate results as each phase lands. Do not close until Steph confirms.

### Phase 1: Consolidate Hunt Watch definitions & tests into `definitions/alertzero/hunt/`

#### Automated

- [x] 1.1 git mv 12 Hunt files into `definitions/alertzero/hunt/` and fix relative imports — f242bb12d30f
- [x] 1.2 Extract `hunt_worker_template.ts` (+ test) from `worker_template_values` — f242bb12d30f
- [x] 1.3 Create `hunt/index.ts` barrel and re-export from `definitions/alertzero/index.ts` — f242bb12d30f
- [x] 1.4 Split `hunt_version_hashes.test.ts` from `managed_workflow_definitions.test.ts` — f242bb12d30f
- [x] 1.5 Split `hunt_registry.test.ts` from `managed_workflow_definitions.test.ts` — f242bb12d30f
- [x] 1.6 Update `@kbn/evals-suite-hunt-watch` for `definitions/alertzero/hunt/` paths — f242bb12d30f
- [x] 1.7 `node scripts/jest src/platform/packages/shared/kbn-workflows/managed` passes — f242bb12d30f
- [x] 1.8 `node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch` passes — f242bb12d30f
- [x] 1.9 type_check for kbn-workflows, evals-suite-hunt-watch, and kbn-alertzero-common passes — f242bb12d30f

#### Manual

- [x] 1.10 Confirm `definitions/alertzero/` top-level listing contains no `hunt*`, `worker_reports.hunt.test.ts`, or `find_or_create_investigation.*` files — f242bb12d30f

### Phase 2: Group isolated Hunt Watch files into `hunt/` subdirectories in `alertzero`

#### Automated

- [x] 2.1 Move `hunt_children_contract.test.ts` into `server/managed_workflows/hunt/`
- [x] 2.2 Move `use_hunt_threat_intel_supply.ts` into `public/hooks/hunt/` and update importers
- [x] 2.3 Phase 2 jest + type_check gates pass

### Phase 3: Update `.github/CODEOWNERS` and verify every Hunt Watch path

#### Automated

- [ ] 3.1 Expand `# AlertZero Hunt Watch services` CODEOWNERS block
- [ ] 3.2 Ownership resolution + CODEOWNERS generator + team validation + eslint pass
