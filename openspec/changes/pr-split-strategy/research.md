---
change_id: detection-emulation-vertical-slice-merge-strategy-v2
status: draft
created_at: 2026-05-25
treadmill_artifact_version: 1
research_topic: detection_emulation validate_rule_tool coupling, feature-flag gaps, and PR-split feasibility
feature_id: 38f26f78-42d1-4a6a-a92f-7d6916e52520
feature_slug: pr-split-strategy
---
# Research: Detection Emulation Vertical Slice Merge Strategy (v2)

## Research Question

What is the actual coupling structure of `validate_rule_tool.ts` and the surrounding wiring code, and which feature-flag gates are already in place vs. still missing, as claimed by the proposal?

## Summary

The proposal's structural claims are accurate: `validate_rule_tool.ts` hard-imports `scoreConfidence`, `createEmulationHistory`, `EmulationRunner`, and `DetectionEmulationGuardrails` as direct, non-optional dependencies. The skill registration gate (`logInjection || realExecution`) is already in place; however, three of the five flag gaps named in the proposal are confirmed: guardrails are constructed unconditionally in `plugin.ts`, neither REST route is conditionally registered, and `detection_emulation_skill.ts` registers all six tools unconditionally regardless of `realExecution` flag state. The UI components (`EmulationBadge`, `EmulationFilter`) do not yet exist in the working tree — they are future PR 4 work. The evals package exists and is structurally complete.

## Detailed Findings

### 1. Hard Imports in `validate_rule_tool.ts` — Confirmed Coupling

The file at line 35–43 imports all four dependencies that the proposal identifies as blocking independent slicing:

| Symbol | Source module | Role in tool |
|--------|---------------|--------------|
| `scoreConfidence` | `../../../lib/detection_emulation/confidence_scorer` | Called at ~line 508 to produce `confidence`, `coverage`, `precision`, `tp`, `fp` |
| `createEmulationHistory` | `../../../lib/detection_emulation/emulation_history` | Called at ~line 548 to persist the validation report and return a `report_id` |
| `EmulationRunner` | `../../../lib/detection_emulation/execution/runner` | Instantiated at ~line 433; `.run()` called per payload in `real_execution` mode |
| `DetectionEmulationGuardrails` (type) | `../../../lib/detection_emulation/execution/shared_guardrails` | Accepted in `ValidateRuleToolDeps` at line 83; destructured at line 103 into `{ allowlist, rateLimiter, concurrencyGate }` |

All four are statically resolved at module load time. Removing any one of them currently causes a build failure; the enrichment-pipeline refactor described in the proposal is not yet present.

### 2. `plugin.ts` — Guardrails Constructed Unconditionally (Gap Confirmed)

`createDetectionEmulationGuardrails(config, logger)` is called at line 659 of `plugin.ts` inside `setup()` with no feature-flag guard. The result is stashed in a class property (`this.detectionEmulationGuardrails`, declared at line 219) and passed both to `initRoutes()` (line 680) and to `registerAgentBuilderAttachmentsAndTools()` (line 274). A JSDoc comment at lines 217–218 explains the shared-bundle rationale (single allowlist, rate-limit windows, and concurrency gate across all surfaces), but no `if (logInjection || realExecution)` wrapper exists. This is exactly the PR 1a gap the proposal names.

### 3. REST Route Registration — Both Routes Unconditional (Gap Confirmed)

`registerDetectionEmulationRoutes()` in `register_routes.ts` (lines 39–44) calls three route factories — `runEmulationCommandRoute`, `validateRuleRoute`, `haltEmulationRoute` — unconditionally. Neither call is wrapped in a feature-flag check at the registration site. The individual route handlers do check flags at request time (`getDetectionEmulationFeatureFlags(config)` inside the handler body, returning 403 when disabled), but registration-level gating is absent. The proposal's PR 1a gap (`validate_rule` route always registered) and PR 3 gap (`run_command` route always registered) are both confirmed.

### 4. Skill Registration Gate — Already In Place

`register_skills.ts` lines 91–104 wrap the `agentBuilder.skills.register(...)` call in:

```typescript
if (
  experimentalFeatures.detectionEmulationLogInjection ||
  experimentalFeatures.detectionEmulationRealExecution
) { … }
```

This gate is functional. A comment at lines 85–90 documents the intent. The proposal's claim that skill registration is already gated is correct — this gap does not need to be fixed.

### 5. `detection_emulation_skill.ts` — All Six Tools Registered Unconditionally

`getDetectionEmulationSkill()` in `detection_emulation_skill.ts` (lines 37–157) returns a skill that registers all six tools in `getInlineTools()`: `createValidateRuleTool`, `createGetEmulationHistoryTool`, `createRunProcessCommandTool`, `createRunFileCommandTool`, `createRunNetworkCommandTool`, `createRunExecutionCommandTool`. No conditional filtering on `realExecution` flag is applied inside this function. The per-family tools (`run*Command`) are expected to be gated via `gate_checks.ts` at call time, but PR 1a's stated goal — "register only `validate-rule`" — requires a code change to this file.

### 6. `gate_checks.ts` — Runtime Enforcement Is Functional

`checkRealExecutionFeatureFlags()` (lines 64–77) and `checkModeFeatureFlags()` (lines 79–105) both read flags via `getDetectionEmulationFeatureFlags(config)` and return a typed `GateResult` with `statusCode: 403` on failure. These functions are already called from tool handlers and route handlers. They are call-time guards; they do not affect registration-time coupling.

### 7. Feature Flag Definitions — Both Present, Both Default `false`

`experimental_features.ts` lines 245 and 255 define:
- `detectionEmulationRealExecution: false` — gating real endpoint response actions
- `detectionEmulationLogInjection: false` — gating synthetic log injection mode

Both carry inline JSDoc matching the proposal's descriptions. The runtime read path goes through `feature_flag.ts` `getDetectionEmulationFeatureFlags()` (lines 70–78), which merges experimental features with runtime config overrides.

### 8. UI Components — Not Yet Present in Working Tree

No files named `EmulationBadge`, `EmulationFilter`, `RunEmulationModal`, or `EmulationBadge.tsx` exist anywhere under `public/detections/components/`. The `additional_toolbar_controls.tsx` file (154 lines) uses `useIsExperimentalFeatureEnabled` at line 31/50 for an unrelated flag (`newDataViewPickerEnabled`), but has no emulation-specific imports or conditional renders. The UI work is entirely future (PR 4), not a gap in existing code.

### 9. Evals Package — Exists and Is Structurally Complete

`x-pack/solutions/security/packages/kbn-evals-suite-detection-emulation/` exists with `evals/validate_rule.spec.ts` (680 lines), `evals/validate_rule_dataset.ts` (328 lines), `playwright.config.ts`, `kibana.jsonc`, `moon.yml`, `package.json`, and `tsconfig.json`. The package is a full stand-alone Playwright eval suite.

### 10. Pre-Merge Cleanup — No Stray Files Found

No `.playwright-mcp/` directories and no orphaned `.png` files were found in the detection emulation subtrees. Either they were already removed in prior commits, or they exist in a branch not yet present in this worktree.

### 11. `ValidateRuleToolDeps` Interface — Current Shape

The `DetectionEmulationGuardrails` type is accepted as a required (non-optional) field named `guardrails` in `ValidateRuleToolDeps` (line 83). The proposal's enrichment refactor would need to make `guardrails` optional OR split its constituent fields (`allowlist`, `rateLimiter`, `concurrencyGate`) into individually-optional properties to allow PR 1a to type-check without PR 3's guardrails types present.

## Code References

- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:35-43` — hard static imports of all four coupling targets (`scoreConfidence`, `createEmulationHistory`, `EmulationRunner`, `DetectionEmulationGuardrails`).
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:83` — `DetectionEmulationGuardrails` accepted as a required (non-optional) field in `ValidateRuleToolDeps`.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:103` — guardrails destructured into `{ allowlist, rateLimiter, concurrencyGate }` — all three fields consumed by the handler.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:433-441` — `EmulationRunner` instantiated for `real_execution` dispatch.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:508-511` — `scoreConfidence` called to produce normalized confidence metrics.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/validate_rule_tool.ts:548-551` — `createEmulationHistory` called to persist the emulation report.
- `x-pack/solutions/security/plugins/security_solution/server/plugin.ts:219` — `detectionEmulationGuardrails?: DetectionEmulationGuardrails` class property declaration.
- `x-pack/solutions/security/plugins/security_solution/server/plugin.ts:659` — `createDetectionEmulationGuardrails(config, logger)` called unconditionally in `setup()` — no feature-flag guard present.
- `x-pack/solutions/security/plugins/security_solution/server/plugin.ts:680` — guardrails passed into `initRoutes()`.
- `x-pack/solutions/security/plugins/security_solution/server/plugin.ts:274` — guardrails passed into `registerAgentBuilderAttachmentsAndTools()`.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/register_skills.ts:91-104` — `if (logInjection || realExecution)` gate wrapping `agentBuilder.skills.register(...)` — already in place.
- `x-pack/solutions/security/plugins/security_solution/server/lib/detection_emulation/api/register_routes.ts:39-44` — `registerDetectionEmulationRoutes()` calls all three route factories unconditionally — no registration-level flag check.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/detection_emulation_skill.ts:37-157` — `getInlineTools()` returns all six tools with no conditional filtering on `realExecution` flag.
- `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/detection_emulation/gate_checks.ts:64-77` — `checkRealExecutionFeatureFlags()` — call-time gate returning 403, does not affect registration.
- `x-pack/solutions/security/plugins/security_solution/common/experimental_features.ts:245` — `detectionEmulationRealExecution: false` definition.
- `x-pack/solutions/security/plugins/security_solution/common/experimental_features.ts:255` — `detectionEmulationLogInjection: false` definition.
- `x-pack/solutions/security/plugins/security_solution/server/lib/detection_emulation/feature_flag.ts:70-78` — `getDetectionEmulationFeatureFlags()` merges experimental features with runtime config.
- `x-pack/solutions/security/plugins/security_solution/public/detections/components/alerts_table/additional_toolbar_controls.tsx:31` — `useIsExperimentalFeatureEnabled` imported but not yet used for any emulation component.
- `x-pack/solutions/security/packages/kbn-evals-suite-detection-emulation/evals/validate_rule.spec.ts` — 680-line eval spec; package is structurally complete.

## Open Questions

- **`typeof import(...)` for optional enrichment types**: The proposal's `ValidateRuleEnrichments` interface uses `typeof import('...')` for optional dep types. It is not confirmed from the code whether this pattern correctly avoids pulling in the full module graph at bundle time when enrichments are absent — this requires a bundle-analysis verification step.
- **Intermediate skill description content**: PR 1a restricts `detection_emulation_skill.ts` to register only `validate-rule`, but the current `content` string (the LLM-facing markdown) at lines 37–157 describes all six tools and real-execution guidance. The exact content diff needed for the PR 1a→PR 3 window is not specified in the operator description or the current file.
- **`DetectionEmulationGuardrails` intermediate type shape**: Making `guardrails` optional in `ValidateRuleToolDeps` allows PR 1a to build without `execution/shared_guardrails.ts`, but lines 103–390 (destructure and use of `allowlist`, `rateLimiter`, `concurrencyGate`) would require null-guard changes throughout the handler. The exact mechanical scope of that change is not captured in the operator description.
- **Pre-merge stray files**: The operator description states 18 `.playwright-mcp/` and `.png` files need dropping, but none were found in this worktree. Either they exist on a different branch/worktree or have already been removed — requires cross-branch verification.
- **`haltEmulationRoute` PR assignment**: `registerDetectionEmulationRoutes()` registers a third route (`haltEmulationRoute`) not mentioned in any PR's content list. It is unclear which PR this route belongs to and whether it needs its own registration-time feature-flag gate.
