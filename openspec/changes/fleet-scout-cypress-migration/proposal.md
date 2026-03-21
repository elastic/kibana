## Why

Fleet's 20 Cypress end-to-end tests are the last remaining Cypress suite for the Fleet plugin. The Kibana project is standardizing on Scout/Playwright for all e2e testing. Fleet already has some Scout tests (privileges, integrations) but the bulk of coverage (agents, policies, settings, outputs, enrollment tokens, a11y) still lives in Cypress. Migrating now unifies the test infrastructure, reduces CI complexity, and enables parallel execution.

## What Changes

- Migrate all 20 Cypress spec files (+ 1 space_awareness spec) to Scout/Playwright
- Create shared Fleet Scout fixtures, page objects, and API helpers
- Replicate Fleet Cypress custom tasks (`insertDoc`, `insertDocs`, `deleteDocsByQuery`, `installTestPackage`, `uninstallTestPackage`) as Scout API helpers
- Port a11y testing from `cypress-axe` to Playwright's `page.checkA11y()`
- Create CI pipeline scripts for Fleet Scout tests
- Remove Cypress test infrastructure after migration is verified

## Capabilities

### New Capabilities
- `fleet-scout-test-scaffold`: Shared Scout test scaffold for Fleet plugin (fixtures, page objects, API helpers, roles)
- `fleet-agent-policies-tests`: Agent policy CRUD, orphaned package policy, binary download sources
- `fleet-agents-tests`: Agent list filters, agentless policy details
- `fleet-integrations-tests`: Integration install, upgrade, mock integrations, automatic import, package policies, pipelines/mappings
- `fleet-settings-tests`: Fleet settings, outputs (ES, Remote ES, Kafka), fleet startup, enrollment tokens, uninstall tokens
- `fleet-agent-flyout-tests`: Add-agent flyout in managed mode
- `fleet-a11y-tests`: Accessibility tests for Fleet home page
- `fleet-space-awareness-tests`: Space-aware agent policies
- `fleet-install-assets-tests`: Unverified package force-install modal, ML/transforms integration

### Modified Capabilities

## Impact

- `x-pack/platform/plugins/shared/fleet/test/scout/` — new/extended Scout test directory
- `x-pack/platform/plugins/shared/fleet/cypress/` — to be deprecated after migration
- `.buildkite/pipelines/pull_request/fleet_cypress.yml` — replace with Scout pipeline
- `.buildkite/scripts/steps/functional/fleet_cypress.sh` — replace with Scout script
