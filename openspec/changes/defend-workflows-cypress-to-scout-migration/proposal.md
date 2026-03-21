# Proposal: Defend Workflows Cypress → Scout Migration

## Why

Kibana is standardizing E2E testing on Scout/Playwright. Defend Workflows tests currently run on Cypress (with FTR); migrating them to Scout aligns with the Osquery migration and reduces dual-stack maintenance. This change establishes a single Scout-based test suite for Defend Workflows (endpoint management, response actions, artifacts, policy, RBAC, tamper protection) and eventual retirement of the Cypress stack for this area.

## What Changes

- **New Scout test layout** for Defend Workflows under Security Solution (e.g. `x-pack/solutions/security/test/scout_defend_workflows/`) with Playwright/Scout config, fixtures, and shared utilities.
- **Incremental migration** of Cypress specs from `security_solution/public/management/cypress/` to Scout specs, reusing patterns from the Osquery Scout migration guide (fixtures, page objects, selectors, assertions).
- **CI wiring** for Scout Defend Workflows: new Buildkite steps and pipeline entries (stateful and, where applicable, serverless) so migrated tests run in PRs.
- **No immediate removals**: Cypress Defend Workflows config and specs remain until migration is complete and validated; then they can be retired in a follow-up.

## Capabilities

### New Capabilities

- **scout-defend-workflows-tests**: Scout/Playwright test suite for Defend Workflows covering endpoint management, response actions, artifacts, policy, RBAC, tamper protection, and related E2E. Includes config (e.g. parallel Playwright config), fixtures, optional common/page helpers, and CI integration.

### Modified Capabilities

- _(None — this is a net-new test suite; no existing product specs change.)_

## Impact

- **Code**: New directory under `x-pack/solutions/security/test/` (e.g. `scout_defend_workflows/`); reuse of `kbn-scout` and security/endpoint config sets where applicable.
- **CI**: New or updated scripts under `.buildkite/scripts/steps/functional/` and pipeline under `.buildkite/pipelines/pull_request/security_solution/` for Scout Defend Workflows.
- **Reference**: Migration follows patterns from the Osquery Scout migration guide (SCOUT_MIGRATION_GUIDE in the osquery-scout-cypress-migration worktree). Existing Defend Workflows Cypress assets (FTR config in `defend_workflows_cypress/`, Cypress config and specs, current Buildkite steps) stay until migration is complete.
