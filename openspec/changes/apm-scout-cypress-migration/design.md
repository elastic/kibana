# Design: APM Scout Cypress Migration

## Context

- **Current state**: APM has 21 Cypress e2e specs under `x-pack/solutions/observability/plugins/apm/ftr_e2e/cypress/e2e/`, using Synthtrace data generation, `@frsource/cypress-plugin-visual-regression-diff`, and APM-specific auth roles. CI runs via `.buildkite/scripts/steps/functional/apm_cypress.sh` and `pull_request/apm_cypress.yml`.
- **Existing Scout coverage**: APM already has extensive Scout coverage (~40+ specs) at `x-pack/solutions/observability/plugins/apm/test/scout/` covering service inventory, service map, service groups, dependencies, settings (agent keys, anomaly detection, custom links, indices, agent configuration, agent explorer), errors, storage explorer, transaction details, service overview (multiple variants), and alerts. Scout uses `@kbn/scout-oblt`, parallel Playwright config, synthtrace fixtures, and APM_ROLES for auth.
- **Constraint**: Follow SCOUT_MIGRATION_GUIDE; reuse patterns from existing APM Scout suite and other Cypress→Scout migrations (e.g. Osquery, Defend Workflows).

## Goals / Non-Goals

**Goals:**

- Identify gaps between Cypress and Scout coverage; migrate Cypress-only scenarios to Scout.
- Port Synthtrace patterns and visual regression to Scout/Playwright.
- Ensure all APM auth roles used in Cypress are available in Scout.
- Replace APM Cypress CI with Scout pipeline; remove Cypress infrastructure after migration.

**Non-Goals:**

- Changing APM product behavior or APIs.
- Migrating non-APM Cypress (e.g. other observability plugins) in this change.

## Decisions

### 1. Gap analysis approach

- **Decision**: Produce a tabular gap analysis comparing each of the 21 Cypress specs to existing Scout specs. Classify as: **covered** (Scout has equivalent), **partial** (some overlap, extend Scout), **gap** (no Scout equivalent, migrate).
- **Rationale**: Ensures no Cypress scenario is dropped; clarifies migration order and effort.
- **Method**: Manually audit each Cypress spec against Scout parallel_tests; document in migration guide or ADR.

### 2. Extending existing Scout test structure

- **Decision**: Extend the existing APM Scout layout at `test/scout/ui/` — do not create a separate `scout_apm_cypress` root. New specs go under `parallel_tests/` in subdirs matching Cypress structure where sensible (e.g. `parallel_tests/diagnostics/`, `parallel_tests/onboarding/`).
- **Rationale**: Single Scout suite simplifies CI, shared fixtures, and maintenance. APM Scout layout is already mature.
- **Page objects**: Add page objects only where Cypress-to-Scout migration introduces new flows (e.g. DiagnosticsPage, OnboardingPage); reuse existing (ServiceInventoryPage, ServiceMapPage, etc.) where possible.

### 3. Synthtrace data generation patterns in Scout

- **Decision**: Reuse existing Scout synthtrace fixtures (`opbeans`, `mobile_services`, `last_24_hours`, `otel_sendotlp`, etc.) from `fixtures/synthtrace/`. Global setup (`global.setup.ts`) already ingests data. For specs needing different data (e.g. AWS Lambda, Azure Functions), add new synthtrace generators or extend existing ones.
- **Rationale**: APM Scout already has working synthtrace integration; Cypress FTR and Scout both use `@kbn/synthtrace-client`. Avoid duplicating data setup.
- **Date ranges**: Use constants (START_DATE, END_DATE) from `fixtures/constants.ts`; ensure URL `rangeFrom`/`rangeTo` match synthtrace ingestion window.

### 4. Visual regression strategy in Playwright

- **Decision**: Use Playwright `expect(locator).toHaveScreenshot(name)` with:
  - Fixed viewport (e.g. 1280x720 or 1920x1080).
  - `mask` option to exclude variable regions (global nav, date picker).
  - `maxDiffPixels` or `threshold` for tolerance if needed.
- **Rationale**: Playwright has built-in screenshot comparison; no need for `@frsource/cypress-plugin-visual-regression-diff`. Only `service_map.cy.ts` uses visual regression (and is currently skipped); scope is small.
- **Baselines**: Store in `__snapshots__` or `{specDir}/__snapshots__`; commit to repo; support `--update-snapshots` in CI for intentional UI changes.

### 5. APM auth role mapping

- **Decision**: Map Cypress roles to Scout as follows:

| Cypress command | Scout equivalent |
|-----------------|-------------------|
| loginAsSuperUser | kbn-scout superuser/admin |
| loginAsViewerUser | browserAuth.loginAsViewer() |
| loginAsEditorUser | browserAuth.loginAsPrivileged() |
| loginAsMonitorUser | browserAuth.loginAsApmMonitor() |
| loginAsApmManageOwnAndCreateAgentKeys | Add to APM_ROLES + browserAuth |
| loginAsApmAllPrivilegesWithoutWriteSettingsUser | browserAuth.loginAsApmAllPrivilegesWithoutWriteSettings() |
| loginAsApmReadPrivilegesWithWriteSettingsUser | browserAuth.loginAsApmReadPrivilegesWithWriteSettings() |

- **Rationale**: Scout already has apmAllPrivilegesWithoutWriteSettings, apmReadPrivilegesWithWriteSettings, apmMonitor. Add apmManageOwnAndCreateAgentKeys for onboarding/agent-keys flow.
- **Role definitions**: Align APM_ROLES in `fixtures/constants.ts` with `create_apm_users/authentication.ts`; use KibanaRole format compatible with Scout's dynamic role creation.

### 6. Tag strategy

- **Decision**: Reuse existing tags `@ess` and `@svlOblt` for environment separation. Add `@apm-migration` (or similar) to migrated specs during transition for targeted runs if needed.
- **Rationale**: Consistent with other APM Scout specs; no new tag taxonomy unless CI requirements change.

### 7. CI pipeline approach

- **Decision**: Replace `apm_cypress.sh` with a Scout step (e.g. `apm_scout.sh`) that runs `node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/apm/test/scout/.meta/ui/parallel.json` (or equivalent). Update `apm_cypress.yml` to use the new step; eventually rename pipeline to `apm_scout.yml`.
- **Rationale**: Single pipeline per domain; Scout replaces Cypress. Keep same dependencies (build, checks) and machine type; parallelism as needed.
- **Rollback**: Revert to apm_cypress.sh if issues arise; Cypress infra remains until removal task.

## Risks / Trade-offs

- **Risk**: Visual regression in service map may flake (Cypress version is already skipped).  
  **Mitigation**: Stabilize viewport, masking, and wait conditions; consider making visual regression optional or run less frequently.

- **Risk**: apmManageOwnAndCreateAgentKeys uses application-based privileges; Scout KibanaRole format may differ.  
  **Mitigation**: Check kbn-scout support for application privileges; fall back to FTR user pre-provisioning if needed.

- **Trade-off**: Running Scout and Cypress in parallel during migration increases CI cost.  
  **Mitigation**: Migrate in batches; disable Cypress step once Scout coverage is validated.

## Migration Plan

1. **Gap analysis**: Produce and document gap analysis for all 21 Cypress specs.
2. **Auth roles**: Add apmManageOwnAndCreateAgentKeys to Scout; verify other roles.
3. **Gap specs**: Migrate Cypress-only specs (404, deep_links, diagnostics, feature_flag, home, infrastructure, mobile, navigation, no_data_screen, onboarding, trace_explorer, tutorial) and extend partial-coverage specs (aws_lambda, azure_functions, errors_table, mobile_overview, time_comparison).
4. **Visual regression**: Port service map screenshot tests to Playwright (if re-enabling).
5. **CI**: Create apm_scout.sh; wire into pipeline; validate.
6. **Retirement**: Remove Cypress config, specs, and apm_cypress.sh.

## Open Questions

- Whether service map visual regression should be re-enabled (currently `describe.skip`) or deferred.
- Exact FTR config set used by APM Cypress and whether Scout can reuse it for user provisioning.
