# Tasks: Fleet Scout Cypress Migration

## 1. Shared scaffold (fixtures, page objects, API helpers)

### Task 1: Create Fleet Scout API helpers

**Depends on**: none  
**Files**: `x-pack/platform/plugins/shared/fleet/test/scout/ui/fixtures/api/fleet_api.ts` (or `helpers/api.ts`), `fixtures/index.ts` (update exports)  
**Description**: Implement Scout API helpers that replicate Fleet Cypress custom tasks: `insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`. Use ES client and Kibana HTTP client from Scout test context. Ensure `installTestPackage` resolves zip path from `cypress/packages/*.zip`.

---

### Task 2: Create Fleet Scout cleanup and setup helpers

**Depends on**: Task 1  
**Files**: Same API helpers module or new `fixtures/api/cleanup.ts`  
**Description**: Implement `cleanupAgentPolicies`, `deleteAgentDocs`, `unenrollAgent`, `cleanupDownloadSources`, `setupFleetServer`, `setFleetServerHost` as async API helpers. Export from fixtures for use in test `beforeAll`/`afterAll`.

---

### Task 3: Create Fleet Scout page objects for agents, policies, settings

**Depends on**: none  
**Files**: `fixtures/page_objects/agent_list.ts`, `fixtures/page_objects/agent_policy_details.ts`, `fixtures/page_objects/fleet_settings.ts`, `fixtures/page_objects/enrollment_tokens.ts`, `fixtures/page_objects/uninstall_tokens.ts`, `fixtures/page_objects/agent_flyout.ts`, `fixtures/page_objects/index.ts`  
**Description**: Create page objects that wrap Fleet UI patterns (selectors, navigation, assertions). Extend existing `fleet_home.ts` as needed. Map Cypress screen constants to Playwright locators. Export from page objects index.

---

### Task 4: Create Fleet Scout page objects for integrations and outputs

**Depends on**: Task 3  
**Files**: Extend `fixtures/page_objects/` (integrations, outputs) or reuse existing `browse_integrations_page.ts`, `copy_integration_page.ts`  
**Description**: Ensure integration-related page objects cover install, add-to-policy, upgrade, and output settings. Add or extend as needed for integrations_real, integrations_mock, fleet_settings_outputs specs.

---

### Task 5: Update Fleet Scout config and manifests

**Depends on**: Task 1, Task 2, Task 3  
**Files**: `test/scout/.meta/ui/standard.json`, `playwright.config.ts`, run `node scripts/scout.js update-test-config-manifests`  
**Description**: Ensure Fleet Scout UI config includes new specs. Add any new config sets (e.g. for space awareness). Run manifest update so Scout CLI discovers the suite.

---

## 2. Migrate tests by capability group

### Task 6: Migrate fleet-agent-policies-tests

**Depends on**: Task 1, Task 2, Task 3, Task 5  
**Files**: `test/scout/ui/tests/agent_policy.spec.ts`, `agent_binary_download_source.spec.ts`, `package_policy.spec.ts` (or grouped as `policies/agent_policy.spec.ts` etc.)  
**Description**: Migrate `agent_policy.cy.ts`, `agent_binary_download_source.cy.ts`, `package_policy.cy.ts` to Scout. Use page objects and API helpers. Replace `cy.intercept` with `page.route` where mocking is required. Verify locally.

---

### Task 7: Migrate fleet-agents-tests

**Depends on**: Task 6  
**Files**: `test/scout/ui/tests/agents/agent_list.spec.ts`, `agents/agentless.spec.ts`  
**Description**: Migrate `agents/agent_list.cy.ts` and `agents/agentless.cy.ts`. Use `insertDocs` to seed agents; use `deleteAgentDocs`, `cleanupAgentPolicies` in cleanup. Map filters, bulk actions, and table assertions to Playwright.

---

### Task 8: Migrate fleet-settings-tests

**Depends on**: Task 6  
**Files**: `test/scout/ui/tests/settings/fleet_settings.spec.ts`, `settings/fleet_settings_outputs.spec.ts`, `fleet_startup.spec.ts`, `enrollment_token.spec.ts`, `uninstall_token.spec.ts`  
**Description**: Migrate `fleet_settings.cy.ts`, `fleet_settings_outputs.cy.ts`, `fleet_startup.cy.ts`, `enrollment_token.cy.ts`, `uninstall_token.cy.ts`. Use page objects for settings, outputs, enrollment tokens. Replace intercepts with route handlers where needed.

---

### Task 9: Migrate fleet-agent-flyout-tests

**Depends on**: Task 6, Task 7  
**Files**: `test/scout/ui/tests/fleet_agent_flyout.spec.ts`  
**Description**: Migrate `fleet_agent_flyout.cy.ts`. Use `insertDoc` for agent and log docs to simulate enrollment and incoming data. Use agent flyout page object. Verify "Incoming data confirmed" flow.

---

### Task 10: Migrate fleet-integrations-tests

**Depends on**: Task 1, Task 4, Task 5  
**Files**: `test/scout/ui/tests/integrations/integrations_real.spec.ts`, `integrations_mock.spec.ts`, `integrations_automatic_import.spec.ts`, `input_packages_real.spec.ts`, `package_policy_pipelines_and_mappings_real.spec.ts`  
**Description**: Migrate `integrations_real.cy.ts`, `integrations_mock.cy.ts`, `integrations_automatic_import.cy.ts`, `input_packages_real.cy.ts`, `package_policy_pipelines_and_mappings_real.cy.ts`. Use `installTestPackage`/`uninstallTestPackage` for real API specs. Use route handlers for mock specs. Integrate with existing browse/copy specs.

---

### Task 11: Migrate fleet-a11y-tests

**Depends on**: Task 3, Task 5  
**Files**: `test/scout/ui/tests/a11y/home_page.spec.ts`  
**Description**: Migrate `a11y/home_page.cy.ts`. Replace `checkA11y` (cypress-axe) with Playwright `page.checkA11y()` or `@axe-core/playwright`. Cover Agents, Agent Policies, Enrollment Tokens, Uninstall Tokens, Data Streams. Skip or fix Settings if a11y violation exists (see Cypress skip).

---

### Task 12: Migrate fleet-space-awareness-tests

**Depends on**: Task 6, Task 5  
**Files**: `test/scout/ui/tests/space_awareness/policies.spec.ts`  
**Description**: Migrate `space_awareness/policies.cy.ts`. Ensure Scout config or global setup enables space awareness and creates test space. Use `cleanupAgentPolicies('test')` for space-scoped cleanup. Verify policy visibility across spaces and redirect on space removal.

---

### Task 13: Migrate fleet-install-assets-tests

**Depends on**: Task 1, Task 4  
**Files**: `test/scout/ui/tests/install_assets.spec.ts`, `assets_integration_with_ml_and_transforms.spec.ts`  
**Description**: Migrate `install_assets.cy.ts` and `assets_integration_with_ml_and_transforms.cy.ts`. Use route handlers to simulate unverified package and force-install flow. Verify `force: true` in install request. For ML/transforms, use real or mocked API as in Cypress.

---

## 3. CI pipeline

### Task 14: Create Fleet Scout Buildkite step script

**Depends on**: Task 5  
**Files**: `.buildkite/scripts/steps/functional/fleet_scout.sh` (or equivalent)  
**Description**: Add script that runs `node scripts/scout run-tests --arch stateful --config <fleet-scout-config-path>`. Use same env (KIBANA_URL, ELASTICSEARCH_URL, etc.) as Fleet Cypress. Support optional serverless variant if needed.

---

### Task 15: Wire Fleet Scout into CI pipeline

**Depends on**: Task 14  
**Files**: `.buildkite/pipelines/pull_request/fleet_cypress.yml` (or new `fleet_scout.yml`), pipeline generation config if applicable  
**Description**: Add Fleet Scout step to the Fleet pipeline. Path-trigger on `x-pack/platform/plugins/shared/fleet/` changes. During migration, run Scout alongside Cypress; after validation, remove Cypress step.

---

## 4. Remove old Cypress infrastructure

### Task 16: Remove Fleet Cypress specs and config

**Depends on**: Task 6, Task 7, Task 8, Task 9, Task 10, Task 11, Task 12, Task 13, Task 15  
**Files**: `x-pack/platform/plugins/shared/fleet/cypress/` (delete or deprecate), `cypress.config.ts`, `cypress/plugins/index.ts`, `cypress/e2e/**`, `cypress/support/**`, `cypress/tasks/**`, `cypress/screens/**`, `cypress/packages/` (retain zips if used by Scout)  
**Description**: Remove Cypress test infrastructure after Scout suite is green and parity validated. Retain `cypress/packages/*.zip` if Scout `installTestPackage` reads from that path; otherwise relocate zips. Update Fleet plugin to remove Cypress dependency.

---

### Task 17: Remove Fleet Cypress CI steps

**Depends on**: Task 16  
**Files**: `.buildkite/pipelines/pull_request/fleet_cypress.yml`, `.buildkite/scripts/steps/functional/fleet_cypress.sh`  
**Description**: Remove or replace Fleet Cypress pipeline and step script with Fleet Scout. Ensure no references to `fleet_cypress` remain in pipeline generation.
