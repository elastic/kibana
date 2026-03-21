## Why

APM has 21 Cypress e2e tests using Synthtrace data generation and visual regression diffing. APM already has extensive Scout coverage (~40+ specs) covering service inventory, overview, dependencies, settings, errors, and storage explorer. However, some Cypress-only tests remain (404 page, deep links, diagnostics, feature flags, mobile transactions, onboarding, navigation, no-data screen, trace explorer, tutorial). Completing this migration eliminates Cypress as a dependency, unifies CI, and ensures full Scout coverage.

## What Changes

- Identify gaps between existing Scout tests and Cypress tests
- Migrate remaining Cypress-only test scenarios to Scout/Playwright
- Port Synthtrace-based data generation patterns to Scout fixtures
- Port visual regression testing to Playwright snapshot/screenshot comparison
- Replicate APM-specific auth roles (viewer, editor, monitor, etc.) in Scout
- Create CI pipeline scripts for APM Scout tests (replacing Cypress pipeline)
- Remove Cypress test infrastructure after migration is verified

## Capabilities

### New Capabilities
- `apm-scout-gap-migration`: Migrate Cypress tests not yet covered by existing Scout specs (404, deep links, diagnostics, feature flags, mobile, navigation, no-data, onboarding, trace explorer, tutorial)
- `apm-visual-regression`: Port visual regression testing from `@frsource/cypress-plugin-visual-regression-diff` to Playwright screenshot assertions
- `apm-auth-roles`: Replicate APM-specific custom roles (viewer, editor, monitor, etc.) in Scout

### Modified Capabilities

## Impact

- `x-pack/solutions/observability/plugins/apm/test/scout/` — extend existing Scout tests
- `x-pack/solutions/observability/plugins/apm/ftr_e2e/` — to be deprecated after migration
- `.buildkite/pipelines/pull_request/apm_cypress.yml` — replace with Scout pipeline
- `.buildkite/scripts/steps/functional/apm_cypress.sh` — replace with Scout script
