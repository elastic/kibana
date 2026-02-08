# Cypress-to-Scout Migration Specification

## Requirement: All Cypress tests have Scout equivalents

Every Cypress `.cy.ts` file under `osquery/cypress/e2e/` SHALL have a corresponding Scout `.spec.ts` file with actual Playwright test logic (not stubs).

### Scenario: Tier tests check response action permissions

- GIVEN a detection rule exists and the user is logged in as SOC Manager
- WHEN navigating to the rule edit page and clicking the Actions tab
- THEN for `endpoint_complete` tier, response actions SHALL be available
- AND for all other tiers (`security_essentials`, `security_complete`, `endpoint_essentials`), an upgrade message SHALL appear

### Scenario: Skipped tests have real implementations

- GIVEN a Cypress test is `describe.skip` due to flakiness
- WHEN its Scout equivalent exists
- THEN it SHALL contain the full Playwright translation (not a `// TODO` stub)
- AND it SHALL remain `test.describe.skip` until the flakiness is resolved

### Scenario: Tags match Cypress-to-Scout mapping

- GIVEN a Cypress test uses `@serverless` tag
- WHEN its Scout equivalent exists
- THEN the Scout test SHALL use `@svlSecurity` tag
- AND `@ess` tags SHALL be preserved where present in Cypress

## Requirement: No missing sub-describes or individual tests

### Scenario: packs_create_edit includes Lens and Discover sub-describes

- GIVEN Cypress `packs_create_edit.cy.ts` has "should open lens in new tab" and "should open discover in new tab"
- WHEN the Scout file is checked
- THEN both sub-describes SHALL exist with Playwright implementations

### Scenario: alerts_multiple_agents includes all test implementations

- GIVEN Cypress has 4 test cases in `alerts_multiple_agents.cy.ts`
- WHEN the Scout file is checked
- THEN all 4 SHALL have Playwright implementations (skipped ones use `test.skip` with real body)
