## Plan Review — Gate 1 (Round 1)
**Artifact:** `context/changes/hunt-codeowners-security-investigations/plan.md`  **Shape:** flat  **Round:** 1/3
**Reviewer:** `generalPurpose` subagent (independent context ✓)

### Verdict: REVISE   ·   Tension: 7/10

### Defects
| # | Sev | Where | Defect | Fix |
|---|-----|-------|--------|-----|
| 1 | HIGH | `plan.md:Current State & Phase 3`, `plan-brief.md:Phase 3` | `.github/CODEOWNERS` targeted lines 3259–3270 (connector rules), omitted existing Hunt Watch rules at lines 3230–3234 (`server/services/watches/hunt`, `kbn-alertzero-common/impl/schemas/hunt*`), and included 3 non-existent paths (`alertzero/common/threat_intel_supply`, `alertzero/server/agent_builder/agents/hunt`, `alertzero/server/agent_builder/tools/hunt`) that fail `node scripts/generate codeowners --clean-empty`. | Anchor Phase 3 Step 1 on `# AlertZero Hunt Watch services` at `.github/CODEOWNERS:3229-3236`, preserve existing rules + `alert_analysis_workflow`, and drop the 3 non-existent paths. |
| 2 | HIGH | `plan.md:Phase 2, Step 2`, `plan-brief.md:Phase 2` | Moving `use_hunt_threat_intel_supply.ts` listed non-existent internal imports, listed `threat_intel_supply_section.test.tsx` (not a caller), and missed 2 actual callers (`public/hooks/use_workers_api.ts:21` and `public/pages/watches/components/worker_settings_panel.test.tsx:27, :323`). | Update internal imports (`./retry_on_transient_error` → `../retry_on_transient_error`, `../query_keys` → `../../query_keys`) and update all 4 real callers (`use_workers_api.ts`, `threat_intel_supply_section.tsx`, `worker_settings_panel.test.tsx`, `watch_detail.test.tsx`). |
| 3 | HIGH | `plan.md:Phase 1, Step 1` | `hunt_worker_workflows.test.ts` move listed non-existent imports (`./worker_settings_defaults`, `./actions/defend`) and missed its 4 actual relative imports (`./journal_note`, `../../../common/utils`, `../../../graph`, `../../../spec/schema`). | Rewrite those 4 imports in `hunt/hunt_worker_workflows.test.ts` to `../journal_note`, `../../../../common/utils`, `../../../../graph`, and `../../../../spec/schema`. |
| 4 | HIGH | `plan.md:Phase 1, Steps 4–5` | Fingerprint table in `managed_workflow_definitions.test.ts` has 1 Hunt row (`ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID`, `'5:4b67ee5b'`), uses `createContentFingerprint` (polynomial rolling hash, not `sha256`), has no `"covers every registered definition"` filter test, and still needs `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` imported for `templateRepresentativeValuesById` (`:117`). | Move only the single Continuous Threat Hunt fingerprint check to `hunt_version_hashes.test.ts` using `createContentFingerprint` + `renderInputs`, and keep `ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID` in `managed_workflow_definitions.test.ts` for `:117`. |
| 5 | HIGH | `plan.md:Phase 1, Step 5` | `renderWorkflowYaml` in `hunt_registry.test.ts` throws `Error: A bound Nightshift workflow requires a serviceAccountId` on `NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW` when `serviceAccountId` is omitted. | Pass `{ settingsVersion: 1, autonomyLevel: 'manual', serviceAccountId: 'kibana/nightshift_agent' } as never` in `hunt_registry.test.ts`. |
| 6 | MED | `plan.md:Risks & Phase 1, Step 6` | `lockdown.ts` has no `LOCKDOWN_HASH` or `computeLockdownHash()`. | Remove references to `LOCKDOWN_HASH` / `computeLockdownHash()`; only update `LOCKDOWN_SCAN_PATHS` in `lockdown.ts:22-25`, `lockdown.test.ts:25-26`, and `collect.test.ts:18`. |
| 7 | MED | `plan.md:Phase 1, Step 2` | `worker_template_values.ts` Hunt block is lines 88–136 and includes `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT` (`:107-116`). | Specify moving lines 88–136 (`HuntWorkerTemplateValues`, `HUNT_WORKER_DEFAULTS`, `MANUAL_TRIGGER_WITH_REPORT_IDS_INPUT`, `renderHuntWorkerYaml`) into `hunt_worker_template.ts`. |
| 8 | MED | `plan.md:Phase 1, Step 3` | `definitions/alertzero/index.ts` does not export `renderHuntWorkerYaml` or define `alertzeroManagedWorkflowDefinitions`, and `export *` violates `AGENTS.md`. | Use explicit named exports in `hunt/index.ts` and `definitions/alertzero/index.ts`. |

---

## Plan Review — Gate 1 (Round 2)
**Artifact:** `context/changes/hunt-codeowners-security-investigations/plan.md`  **Shape:** flat  **Round:** 2/3
**Reviewer:** `generalPurpose` subagent (independent context ✓)

### Verdict: REVISE   ·   Tension: 2/10

### Defects
| # | Sev | Where | Defect | Fix |
|---|-----|-------|--------|-----|
| 1 | MED | `plan.md:Phase 1, Step 6` | Removing `file: /^hunt[^/]*\.(ts|yaml)$/` from `LOCKDOWN_SCAN_PATHS` in `lockdown.ts:22-25` leaves no element with a `file` property on the `as const` array, narrowing `scope.file` to `unknown` in `listLockdownFiles()` (`lockdown.ts:100-106`) and failing `tsc` with `TS18046`. | Simplify `listLockdownFiles()` in `lockdown.ts:100-106` to drop the dead `'file' in scope` branch. |
| 2 | LOW | `plan.md:Phase 1, Step 6` | JSDoc comment in `x-pack/solutions/security/packages/kbn-evals-suite-hunt-watch/src/constants.ts:37` still references `kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.yaml`. | Update comment in `constants.ts:37` to `.../definitions/alertzero/hunt/hunt_continuous_threat_hunt.yaml`. |

---

## Plan Review — Gate 1 (Round 3)
**Artifact:** `context/changes/hunt-codeowners-security-investigations/plan.md`  **Shape:** flat  **Round:** 3/3
**Reviewer:** `generalPurpose` subagent (independent context ✓)

### Verdict: APPROVE   ·   Tension: 1/10

### Defects
None.

### Alignment with original intent
The plan directly serves all three original goals: consolidating Hunt Watch workflow definitions, template helpers, hooks, and tests into `hunt/` subdirectories across `@kbn/workflows` and `alertzero`, splitting Hunt Watch assertions out of shared test files so Hunt Watch PRs do not pull in unrelated codeowners, and assigning all Hunt Watch paths to `@elastic/security-investigations` in `.github/CODEOWNERS`.

### Missing verification
None.
