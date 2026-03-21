# Design: Defend Workflows Cypress → Scout Migration

## Context

- **Current state**: Defend Workflows E2E runs on Cypress, orchestrated by FTR (`defend_workflows_cypress/` config, runner, serverless configs). Cypress specs live under `security_solution/public/management/cypress/`. CI uses `.buildkite/scripts/steps/functional/defend_workflows.sh` and `defend_workflows_serverless.sh`, and pipelines under `pull_request/security_solution/defend_workflows.yml` (and quality-gate / merge fanout).
- **Constraint**: Follow the generic Cypress→Scout migration guide (SCOUT_MIGRATION_GUIDE); reuse patterns from the Osquery Scout migration (fixtures, page objects, config layout, CI).
- **Stakeholders**: Security Solution / Defend Workflows team; same consumers as current Cypress runs (PRs, merge, quality gate).

## Goals / Non-Goals

**Goals:**

- Add a Scout/Playwright test suite for Defend Workflows under Security Solution (`x-pack/solutions/security/test/scout_defend_workflows/`) with config, fixtures, and shared utilities.
- Migrate Cypress specs incrementally to Scout, preserving coverage for endpoint management, response actions, artifacts, policy, RBAC, tamper protection.
- Wire CI so Scout Defend Workflows run in PR (and, where applicable, serverless) pipelines alongside or eventually replacing Cypress.
- Keep Cypress in place until migration is complete and validated.

**Non-Goals:**

- Removing Cypress Defend Workflows in this change.
- Changing product behavior or APIs; this is test infrastructure only.
- Migrating non–Defend Workflows Cypress (e.g. `security_solution_cypress`) in this change.

## Decisions

1. **Scout root and layout**
   - **Decision**: Use `x-pack/solutions/security/test/scout_defend_workflows/` with `ui/` (and optionally `api/` later). Prefer UI parallel layout (`parallel.playwright.config.ts`, `parallel_tests/`, `global.setup.ts`) where tests can be space-isolated; use sequential UI only where isolation is not possible.
   - **Rationale**: Matches DEFEND_WORKFLOWS_SCOUT_MIGRATION.md and Scout conventions; aligns with Osquery scout layout. Security Solution already has multiple test dirs under `test/`; a dedicated `scout_defend_workflows` keeps scope clear.
   - **Alternative**: Reuse a single `test/scout_security_solution/` for all security Scout tests—rejected to keep Defend Workflows migration bounded and easier to own.

2. **Scaffold generation**
   - **Decision**: Use `node scripts/scout.js generate --path x-pack/solutions/security --type ui --scout-root scout_defend_workflows` (or `both` if API tests are added). Use `--force` when augmenting existing dirs.
   - **Rationale**: Ensures standard Playwright/Scout configs, fixtures, and manifests; Scout skill and SCOUT_MIGRATION_GUIDE recommend the generator.
   - **Alternative**: Hand-roll configs—rejected to avoid drift from kbn-scout and other Scout suites.

3. **Config sets and server config**
   - **Decision**: Reuse existing security/endpoint config sets from `kbn-scout` where they match Defend Workflows needs (Fleet, endpoint, etc.). Add a custom server config set only if Defend Workflows require env not covered by existing sets.
   - **Rationale**: Defend Workflows Cypress FTR config already aligns with endpoint/Fleet; reusing kbn-scout configs reduces duplication and keeps server startup consistent with other security Scout runs.
   - **Alternative**: New custom config set from day one—rejected to minimize scope; can introduce later if needed.

4. **Migration order**
   - **Decision**: Migrate specs incrementally (e.g. start with a small subset: response_actions or policy), following the Step-by-Step Migration Checklist in SCOUT_MIGRATION_GUIDE. One PR per batch of specs is acceptable.
   - **Rationale**: Reduces risk and allows early CI feedback; aligns with Osquery migration approach.
   - **Alternative**: Big-bang migration—rejected for review and stability.

5. **CI strategy**
   - **Decision**: Add new Buildkite steps (e.g. `defend_workflows_scout.sh` / serverless variant) and pipeline entries that run Scout Defend Workflows. Keep existing Cypress steps until migration is complete; then deprecate Cypress in a follow-up.
   - **Rationale**: Parallel runs allow comparison and safe cutover; pipeline layout already has separate Defend Workflows entries.
   - **Alternative**: Replace Cypress steps immediately—rejected to avoid blocking PRs before Scout coverage is sufficient.

## Risks / Trade-offs

- **Risk**: Scout and Cypress both running in CI increases cost and time until Cypress is retired.  
  **Mitigation**: Run Scout only on changed paths (e.g. `scout_defend_workflows/` and related app code) where possible; plan Cypress retirement once coverage is parity.

- **Risk**: FTR/Cypress-specific services or env (e.g. Fleet server, certs) may not map 1:1 to Scout server configs.  
  **Mitigation**: Follow SCOUT_MIGRATION_GUIDE and existing security Scout configs; add custom config set only if proven necessary.

- **Trade-off**: Two test stacks maintained during migration. Accepted to allow incremental migration and safe rollback.

## Migration Plan

1. **Scaffold**: Create `scout_defend_workflows/` with Scout generator; add `tsconfig.json` and any Security Solution–specific fixtures/constants.
2. **Manifests**: Run `node scripts/scout.js update-test-config-manifests` after adding configs.
3. **First batch**: Migrate a small set of Cypress specs (e.g. response_actions or policy) to Scout; get green locally and in CI.
4. **CI**: Add Buildkite step(s) and wire into `defend_workflows.yml` (and serverless pipeline) for Scout Defend Workflows.
5. **Iterate**: Migrate remaining specs in batches; fix flakiness and env gaps.
6. **Retirement**: Once parity is validated, remove Cypress Defend Workflows config/specs and CI (separate change).

**Rollback**: Revert Scout CI steps and/or PR; Cypress remains the source of truth until retirement.

## Open Questions

- Whether Defend Workflows Scout needs a dedicated kbn-scout server config set (e.g. Fleet + endpoint) or an existing security set suffices—to be confirmed when running first specs.
- Exact list of Cypress spec files to migrate in the first batch (response_actions vs policy vs other)—can be decided when scaffolding is in place.
