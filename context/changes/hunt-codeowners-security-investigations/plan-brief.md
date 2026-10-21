# Plan Brief: Hunt Watch CODEOWNERS → `@elastic/security-investigations`

**Summary**: Consolidate Hunt Watch files into `hunt/` subdirectories where feasible (`@kbn/workflows/managed/definitions/alertzero/hunt`, `alertzero/server/managed_workflows/hunt`, `alertzero/public/hooks/hunt`), split Hunt Watch assertions out of shared test files (`managed_workflow_definitions.test.ts`, `worker_template_values.test.ts`), update `@kbn/evals-suite-hunt-watch` (`lockdown.ts`, `lockdown.test.ts`, `collect.test.ts`), and update `.github/CODEOWNERS` so every Hunt Watch file in the repo resolves to `@elastic/security-investigations`.

## Key Decisions & Touchpoints

- **Phase 1 — `@kbn/workflows` (`src/platform/packages/shared/kbn-workflows/managed/`) + `@kbn/evals-suite-hunt-watch`**:
  - Move `hunt.{ts,yaml}`, `hunt_continuous_threat_hunt.{ts,yaml}`, `hunt_package_report.{ts,yaml}`, `hunt_proposal_gate.{ts,yaml}`, `find_or_create_investigation.{ts,yaml}`, `hunt_worker_workflows.test.ts`, and `worker_reports.hunt.test.ts` into `definitions/alertzero/hunt/`.
  - Extract `HuntWorkerTemplateValues`, `HUNT_WORKER_DEFAULTS`, `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT`, and `renderHuntWorkerYaml` (lines 88–136 of `worker_template_values.ts`) into `definitions/alertzero/hunt/hunt_worker_template.ts` (and `hunt_worker_template.test.ts` covering both `renderRunAs` and Hunt placeholder tokens); update comments in `hunt_continuous_threat_hunt.yaml` and `hunt_watch.ts`.
  - Add `definitions/alertzero/hunt/index.ts` and re-export the 5 workflow definitions and 5 IDs via explicit named exports from `definitions/alertzero/index.ts` so `@kbn/workflows/managed` public exports do not change; update `forensics_proposal_gate.test.ts:16` to import from `'./hunt'`.
  - Extract the Continuous Threat Hunt `'5:4b67ee5b'` render-input fingerprint row and `describe('Hunt Watch: registry-wide checks')` from `managed/managed_workflow_definitions.test.ts` into `definitions/alertzero/hunt/hunt_version_hashes.test.ts` and `definitions/alertzero/hunt/hunt_registry.test.ts` (using `{ settingsVersion: 1, autonomyLevel: 'manual', serviceAccountId: 'kibana/nightshift_agent' } as never` in `renderWorkflowYaml`).
  - Update `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/{collect.test.ts,constants.ts,lockdown.ts,lockdown.test.ts}` for the `definitions/alertzero/hunt/` directory (including dropping the dead `'file' in scope` branch in `listLockdownFiles()`).

- **Phase 2 — `alertzero` plugin (`x-pack/solutions/security/plugins/alertzero/`)**:
  - Move `server/managed_workflows/hunt_children_contract.test.ts` → `server/managed_workflows/hunt/hunt_children_contract.test.ts`.
  - Move `public/hooks/use_hunt_threat_intel_supply.ts` → `public/hooks/hunt/use_hunt_threat_intel_supply.ts` and update its internal imports (`../retry_on_transient_error`, `../../query_keys`) and its 4 callers (`public/hooks/use_workers_api.ts`, `threat_intel_supply_section.tsx`, `worker_settings_panel.test.tsx`, `watch_detail.test.tsx`).

- **Phase 3 — `.github/CODEOWNERS`**:
  - Expand the `# AlertZero Hunt Watch services` block (lines 3229–3234) with `/src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt`, `/x-pack/solutions/security/packages/kbn-alertzero-common/impl/worker_settings/hunt_watch.ts`, and all Hunt Watch paths in `alertzero` (`common/hunt_coordinator_result_attachment_schema.ts`, `common/step_types/package_report.{ts,test.ts}`, `public/hooks/hunt`, `public/pages/watches/components/threat_intel_supply_section.{tsx,test.tsx}`, `server/agent_builder/attachments/hunt_coordinator_result.{ts,test.ts}`, `server/managed_workflows/hunt`, `server/services/threat_intel_supply`, `server/step_types/package_report`, `server/step_types/report_worker_outcome/shipped_yaml_contract.hunt.{fixture.ts,test.ts}`, and `server/telemetry/workers/hunt.md`).

## Verification

- `node scripts/jest src/platform/packages/shared/kbn-workflows/managed`
- `node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch`
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/hunt/hunt_children_contract.test.ts`
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/public/hooks/use_workers_api.test.tsx`
- `node scripts/jest x-pack/solutions/security/plugins/alertzero/public/pages/watches`
- `node scripts/type_check --project src/platform/packages/shared/kbn-workflows/tsconfig.json`
- `node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/tsconfig.json`
- `node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json`
- `node .buildkite/scripts/steps/checks/verify_codeowners_teams.ts`
- `node scripts/generate codeowners --clean-empty && git diff --exit-code .github/CODEOWNERS`

Full plan: `context/changes/hunt-codeowners-security-investigations/plan.md`.
