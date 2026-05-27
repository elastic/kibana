Now I'll write the spec:

# Specification: Detection Emulation — Vertical Slice Merge Strategy (v2)

## Requirements

### `validate_rule` Core Validation Path (PR 1a)

- MUST generate a scenario from the rule's MITRE ATT&CK technique tags via `generateScenario` before injecting any logs.
- MUST synthesise ECS documents via `generateDocs` and inject them via `executeLogInjection` when `mode` is `"log_injection"`.
- MUST poll for alerts via `collectTelemetry` within a wall-clock budget, defaulting to 120 000 ms and hard-capping at 300 000 ms regardless of caller-supplied `wallBudgetMs`. (Current cap constants in `validate_rule_tool.ts:26–27`.)
- MUST reject `mode: "real_execution"` with a human-readable "feature not available" error and MUST NOT dispatch any real endpoint actions. (Current guard at `validate_rule_tool.ts:81–86`.)
- MUST return a `no_mitre_tags` or `no_supported_techniques` error when `generateScenario` indicates the rule has no emulable techniques.
- MUST gate `log_injection` execution behind the `detectionEmulationLogInjection` feature flag, returning a `feature_disabled` error when the flag is `false`. (Current flag check at `validate_rule_tool.ts:74–79`.)

### `validate_rule` Tool Input Schema (PR 1a)

- MUST accept `ruleId` (non-empty string, required), `endpointIds` (non-empty array, min 1, max `MAX_ENDPOINT_FANOUT` entries, required), `mode` (`"log_injection" | "real_execution"`, optional, defaults to `"log_injection"`), `agentType` (optional), and `wallBudgetMs` (optional positive integer).
- MUST reject `endpointIds` arrays exceeding `MAX_ENDPOINT_FANOUT` with a schema error naming the constant. (Current constraint in `common/detection_emulation/schemas/validate_rule_input.ts:22–25`.)

### `validate_rule` Tool Response Shape (PR 1a)

- A successful `log_injection` response MUST contain: `success` (boolean `true`), `scenario_id` (string), `rule_id` (string), `mode` (string), `tp` (integer), `fp` (integer), `matched_signals` (string array), `unmatched_signals` (string array), `poll_duration_ms` (number), `started_at` (ISO timestamp), `completed_at` (ISO timestamp).
- The PR 1a response MUST NOT contain `confidence`, `coverage`, `precision`, `report_id`, or `caveats`; those fields are introduced by PR 2.

### Guardrails Construction Gate — `plugin.ts` (PR 1a)

- The call to `createDetectionEmulationGuardrails()` in `plugin.ts` `setup()` MUST execute only when `detectionEmulationLogInjection || detectionEmulationRealExecution` evaluates to `true`. (Currently unconditional at `plugin.ts:659` per research finding §2.)
- When neither flag is `true`, `this.detectionEmulationGuardrails` MUST remain `undefined` and no allowlist, rate-limiter, or concurrency-gate object MUST be allocated at server startup.

### REST Route Registration Gate — `validate_rule` (PR 1a)

- The `validateRuleRoute` factory call in `registerDetectionEmulationRoutes()` MUST execute only when `detectionEmulationLogInjection` is `true`. (Currently unconditional in `register_routes.ts:39–44` per research finding §3.)
- When the flag is `false`, the `validate_rule` REST endpoint MUST NOT be registered and MUST return a 404 on any inbound request.

### REST Route Registration Gate — `run_command` (PR 3)

- The `runEmulationCommandRoute` factory call in `registerDetectionEmulationRoutes()` MUST execute only when `detectionEmulationRealExecution` is `true`. (Currently unconditional in `register_routes.ts:39–44` per research finding §3.)
- When the flag is `false`, the `run_command` REST endpoint MUST NOT be registered.

### Skill Tool Registration Scope (PR 1a)

- `getDetectionEmulationSkill()` MUST expose only `security.detection-emulation.validate-rule` in `getInlineTools()` for PR 1a. (Current state: `detection_emulation_skill.ts:72` returns `[createValidateRuleTool(ctx)]`.)
- Per-family tools (`run-process-command`, `run-file-command`, `run-network-command`, `run-execution-command`) MUST NOT be registered when `detectionEmulationRealExecution` is `false`; their registration is deferred to PR 3.

### Zero Runtime Impact at Default Flag State (PR 1a)

- With both `detectionEmulationLogInjection: false` and `detectionEmulationRealExecution: false` (their defaults at `experimental_features.ts:245` and `:255` per research finding §7), merged code MUST produce zero runtime impact: no REST routes registered, no skill visible to Agent Builder, no guardrail objects allocated.
- The existing skill registration gate (`register_skills.ts:91–104`, `logInjection || realExecution`) MUST be preserved unchanged; it is already functional per research finding §4.

### Evals Coverage (PR 1a)

- The `kbn-evals-suite-detection-emulation` package MUST include eval scenarios exercising: skill activation (skill fires on a relevant prompt), schema compliance (`ruleId` and `endpointIds` present in tool call parameters), trajectory (model follows `tool_sequence` golden path), and distractor rejection (skill does not fire for alert investigation, rule creation, ES|QL, threat hunting, or dashboard prompts).
- The `skillActivation`, `schemaCompliance`, and `trajectory` evaluators MUST pass against the PR 1a tool response shape without requiring `confidence`, `coverage`, or `report_id` fields.
- Each eval example MUST reference a dataset entry defined in `validate_rule_dataset.ts`.
- The evals package MUST be wired into CI via `moon.yml` and `playwright.config.ts` so eval runs are reproducible in the same environment as functional tests.

Forward: design — The `criteria` strings for the two primary success-path examples in `validate_rule_dataset.ts:86–95` and `:104–111` reference `"confidence score"` and `"report_id"` — fields absent from the PR 1a response shape. The `criteria` evaluator will score below ceiling for those examples until PR 2's scoring enrichment lands. If CI gates on `criteria` pass rate at PR 1a merge time, this threshold must account for the known gap or those criteria must be conditioned on PR readiness.

### Scoring & History Enrichment (PR 2)

- `validate_rule_tool.ts` MUST accept `scoreConfidence` and `createEmulationHistory` as optional enrichment parameters, separate from the required `ValidateRuleToolDeps`.
- When `scoreConfidence` is provided, the tool response MUST include `confidence` (0–1 float), `coverage` (0–1 float), and `precision` (0–1 float).
- When `createEmulationHistory` is provided, the tool response MUST include `report_id` (string) referencing the persisted emulation report saved object.
- A `security.detection-emulation.get-emulation-history` tool MUST be registered in `getInlineTools()` when PR 2 lands.
- The `caveats` field SHOULD be included in the PR 2 response when the scorer produces qualification notes.

### Real Execution & Per-Family Tools (PR 3)

- `validate_rule_tool.ts` MUST accept `EmulationRunner` as an optional enrichment; when provided and `mode` is `"real_execution"`, the tool MUST invoke `EmulationRunner.run()` per payload rather than returning the "feature not available" error.
- Per-family tools MUST be conditionally registered in `getDetectionEmulationSkill()` only when `detectionEmulationRealExecution` is `true`.
- Each per-family tool handler MUST call `checkRealExecutionFeatureFlags()` (already implemented in `gate_checks.ts:64–77` per research finding §6) as a runtime guard.
- The `run_command` REST route MUST check `detectionEmulationRealExecution` at request time via `checkModeFeatureFlags()` and MUST return `403` when the flag is `false`.

### UI Feature Flag Hardening (PR 4)

- `EmulationBadge` and `EmulationFilter` components MUST call `useIsExperimentalFeatureEnabled('detectionEmulationLogInjection')` and MUST return `null` when the flag is `false`.
- `EmulationFilter` MUST be lazy-imported in `additional_toolbar_controls.tsx` (currently 154 lines, no emulation imports per research finding §8) so the component bundle is not loaded when the flag is off.
- `RunEmulationModal` MUST render only when `detectionEmulationLogInjection || detectionEmulationRealExecution` is `true`.
