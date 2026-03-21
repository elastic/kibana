# Design: Fleet Cypress → Scout Migration

## Context

- **Current state**: Fleet has 20 Cypress end-to-end specs under `x-pack/platform/plugins/shared/fleet/cypress/e2e/`, plus one space_awareness spec. Cypress uses FTR for orchestration, custom tasks (`insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`), and `cypress-axe` for a11y. CI uses `.buildkite/pipelines/pull_request/fleet_cypress.yml` and `.buildkite/scripts/steps/functional/fleet_cypress.sh`.
- **Existing Fleet Scout**: Fleet already has Scout tests under `x-pack/platform/plugins/shared/fleet/test/scout/` for privileges (multiple role configs) and integrations (browse, copy). These use `ui/playwright.config.ts`, `ui/fixtures/`, and `ui/tests/`.
- **Constraint**: Follow SCOUT_MIGRATION_GUIDE; reuse patterns from Osquery Scout migration and existing Fleet Scout tests.
- **Stakeholders**: Fleet team; same consumers as current Cypress (PRs, merge).

## Goals / Non-Goals

**Goals:**

- Migrate all 20 Fleet Cypress specs to Scout/Playwright.
- Create shared Fleet Scout fixtures, page objects, and API helpers.
- Replicate Fleet Cypress custom tasks as Scout API helpers.
- Port a11y from cypress-axe to Playwright `page.checkA11y()`.
- Create CI pipeline for Fleet Scout tests.
- Remove Cypress infrastructure after migration is verified.

**Non-Goals:**

- Changing product behavior or Fleet APIs; test infrastructure only.
- Migrating non-Fleet Cypress suites in this change.

## Decisions

### 1. Directory structure

- **Decision**: Use `x-pack/platform/plugins/shared/fleet/test/scout/ui/` as the primary test root. Extend the existing layout rather than creating a sibling `scout_fleet` directory. Add new specs under `ui/tests/` with subdirectories or naming convention (e.g. `agents/`, `policies/`, `settings/`, `a11y/`) to organize the 20 migrated specs.
- **Rationale**: Fleet already has `test/scout/`; extending it keeps discovery simple and avoids config duplication. Matches Kibana Scout conventions.
- **Alternative**: New `scout_fleet/` sibling—rejected to avoid fragmentation.

### 2. Fixture organization

- **Decision**: Extend `ui/fixtures/` with:
  - **Page objects**: Fleet home (exists), agent list, agent policy details, enrollment tokens, uninstall tokens, settings, outputs, agent flyout, integrations (exists). Add new page objects under `fixtures/page_objects/` as needed.
  - **API helpers**: New `fixtures/api/` or `fixtures/helpers/api.ts` with `insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`. Use Scout `kbnClient` for Kibana API; use ES client from test context for Elasticsearch operations.
  - **Roles**: Reuse existing privilege fixtures (`privileges.ts`); add roles for space awareness if needed.
- **Rationale**: Centralizes Fleet-specific logic; SCOUT_MIGRATION_GUIDE recommends page objects and API helpers. Existing Fleet Scout fixtures (fleet_home, browse_integration, etc.) provide a base.

### 3. Fleet Cypress custom tasks → Scout helpers

| Cypress Task         | Scout Helper                        | Implementation                                                                 |
|----------------------|--------------------------------------|-------------------------------------------------------------------------------|
| `insertDoc`          | `apiHelpers.insertDoc({ index, id, doc })` | Use ES client (`create` with refresh) or Fleet test context client           |
| `insertDocs`         | `apiHelpers.insertDocs({ index, docs })`    | Use ES client `bulk` with refresh                                            |
| `deleteDocsByQuery`  | `apiHelpers.deleteDocsByQuery({ index, query })` | Use ES client `deleteByQuery`                                             |
| `installTestPackage` | `apiHelpers.installTestPackage(packageName)`  | POST to `/api/fleet/epm/packages` with zip from `cypress/packages/*.zip`        |
| `uninstallTestPackage`| `apiHelpers.uninstallTestPackage(packageName)` | DELETE `/api/fleet/epm/packages/{packageName}`                             |

- **Decision**: Implement as async functions in a shared module, invoked from test `beforeAll`/`beforeEach` or fixture setup. Ensure zip path resolution works from `x-pack/platform/plugins/shared/fleet/cypress/packages/` (or equivalent) when running Scout.
- **Rationale**: Preserves test semantics; avoids FTR/Cypress-specific task wiring.

### 4. Cleanup and setup helpers

| Cypress Helper             | Scout Helper                                      |
|----------------------------|---------------------------------------------------|
| `cleanupAgentPolicies`     | `apiHelpers.cleanupAgentPolicies(spaceId?)`        |
| `deleteAgentDocs`          | `apiHelpers.deleteAgentDocs(ignoreUnavailable?)`   |
| `unenrollAgent`            | `apiHelpers.unenrollAgent()`                       |
| `cleanupDownloadSources`   | `apiHelpers.cleanupDownloadSources()`              |
| `setupFleetServer`         | `apiHelpers.setupFleetServer()` / fixture         |
| `setFleetServerHost`       | `apiHelpers.setFleetServerHost(host)`             |

- **Decision**: Implement as API helpers using `kbnClient` or test-context HTTP client. Invoke in `afterAll`/`afterEach` to ensure test isolation.
- **Rationale**: Prevents cross-test pollution; Scout uses a shared Kibana instance.

### 5. Tag strategy (ESS / serverless)

- **Decision**: Use Scout tags (e.g. `@ess`, `@serverless`) where Fleet Cypress currently differentiates. Fleet Cypress runs on stateful; add serverless tags for specs that are compatible. Follow existing Fleet Scout config (.meta/ui/standard.json) for config sets.
- **Rationale**: Aligns with Kibana Scout tagging; allows selective runs.
- **Alternative**: Single config for all—may limit serverless coverage; tags allow future serverless runs.

### 6. CI pipeline approach

- **Decision**:
  1. Add new Buildkite step script `fleet_scout.sh` (or similar) that runs `node scripts/scout run-tests --config <fleet-scout-config>`.
  2. Update or replace `fleet_cypress.yml` to include Fleet Scout step. Option: run Scout in parallel with Cypress during migration; once migration is verified, remove Cypress step.
  3. Path-trigger: include Fleet Scout step when changes touch `x-pack/platform/plugins/shared/fleet/` or the Scout test dir.
- **Rationale**: Matches defend-workflows and other Scout migrations; allows phased cutover.
- **Alternative**: Replace Cypress immediately—rejected until Scout coverage is validated.

### 7. Integration with existing Fleet Scout tests

- **Decision**: Do not remove existing Fleet Scout specs (privileges, browse, copy). Migrated Cypress specs coexist. Share fixtures and page objects; extend `fleet_home.ts` and other page objects as needed. Ensure `playwright.config.ts` and `.meta/ui/standard.json` include all specs.
- **Rationale**: Preserves current Scout coverage; avoids regression during migration.
- **Alternative**: Consolidate into fewer specs—rejected to keep migration incremental and reviewable.

### 8. A11y migration

- **Decision**: Replace `cypress-axe` + `checkA11y` with Playwright's `@axe-core/playwright` or `page.checkA11y()` equivalent. Use Scout a11y fixture if available; otherwise add `expect.extend(toHaveNoViolations)` or direct `analyze()` calls in a11y specs.
- **Rationale**: Cypress axe source was injected via `getAxeCoreSource` task; Playwright has native a11y support. Follow Kibana Scout a11y patterns.
- **Alternative**: Skip a11y in Scout—rejected; a11y coverage is required.

## Risks / Trade-offs

- **Risk**: Fleet Cypress uses `cy.intercept` heavily for mocked API. Scout/Playwright uses `page.route` or similar. Mapping intercepts may require careful translation.
  **Mitigation**: For real-API specs, avoid mocking. For mock specs (e.g. integrations_mock, agent_policy), use `page.route` with equivalent handlers. Document patterns in SCOUT_MIGRATION_GUIDE.

- **Risk**: `installTestPackage` depends on zip files at `cypress/packages/*.zip`. Scout runs from different CWD; path resolution may differ.
  **Mitigation**: Use `require.resolve` or `path.join(__dirname, ...)` relative to Fleet plugin root; verify in CI.

- **Trade-off**: Two stacks (Cypress + Scout) during migration increases CI cost.
  **Mitigation**: Run Scout only on path-trigger where possible; retire Cypress promptly after validation.

## Migration plan (high level)

1. **Scaffold**: Extend Fleet Scout fixtures with API helpers, page objects; add `insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`.
2. **Migrate by capability**: Start with fleet-scout-test-scaffold (API helpers, page objects), then fleet-agent-policies-tests, fleet-agents-tests, fleet-settings-tests, fleet-agent-flyout-tests, fleet-integrations-tests, fleet-a11y-tests, fleet-space-awareness-tests, fleet-install-assets-tests.
3. **CI**: Add Fleet Scout Buildkite step; wire into pipeline; path-trigger on Fleet changes.
4. **Retirement**: Remove Cypress specs, config, plugins, and CI steps once Scout suite is green and parity validated.

**Rollback**: Revert Scout CI step; Cypress remains until retirement.

## Open questions

- Exact path for test package zips when running from Scout (relative to plugin vs. scripts dir).
- Whether space_awareness tests require a dedicated FTR/Scout config with spaces enabled; confirm with Fleet Cypress space setup.
