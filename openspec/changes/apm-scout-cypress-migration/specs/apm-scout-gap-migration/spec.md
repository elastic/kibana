# Spec: APM Scout Gap Migration

## ADDED Requirements

### Requirement: Gap analysis and coverage mapping

The system SHALL produce a gap analysis document comparing the 21 APM Cypress specs against existing Scout coverage at `x-pack/solutions/observability/plugins/apm/test/scout/`. The analysis SHALL classify each Cypress spec as: (a) **covered** by existing Scout (migration optional), (b) **partial** (some scenarios covered, others missing), or (c) **gap** (no Scout equivalent).

#### Scenario: Gap analysis includes all 21 Cypress specs

- **GIVEN** the Cypress specs at `x-pack/solutions/observability/plugins/apm/ftr_e2e/cypress/e2e/`
- **WHEN** the gap analysis is produced
- **THEN** each spec is listed with its classification and a brief rationale (e.g. "404 page — gap; no Scout equivalent")

#### Scenario: Existing Scout coverage is documented

- **GIVEN** existing Scout specs (40+ specs under `test/scout/ui/parallel_tests/`, including service_inventory, service_map, service_groups, dependencies, settings, errors, transaction_details, service_overview, storage_explorer, alerts)
- **WHEN** the gap analysis is produced
- **THEN** the analysis notes which Cypress specs have Scout coverage (e.g. service_inventory.cy.ts ↔ service_inventory.spec.ts, service_map.cy.ts ↔ sevice_map/service_map.spec.ts, rules/error_count.cy.ts ↔ alerts/error_count.spec.ts)

---

### Requirement: Migrate Cypress-only gap specs to Scout

The system SHALL migrate Cypress specs classified as gaps to Scout/Playwright under `x-pack/solutions/observability/plugins/apm/test/scout/`. Migration SHALL follow SCOUT_MIGRATION_GUIDE and existing APM Scout patterns (fixtures, page objects, synthtrace, `@kbn/scout-oblt`).

#### Scenario: 404 page is migrated to Scout

- **GIVEN** `_404.cy.ts` (visits `/app/apm/foo`, asserts "Page not found")
- **WHEN** migration is complete
- **THEN** a Scout spec exists that navigates to an invalid APM path and asserts the 404 page content for the viewer role

#### Scenario: Deep links spec is migrated to Scout

- **GIVEN** `deep_links.cy.ts` (global search for "apm"/"applications", asserts links: Service inventory, Service groups, Traces, Service map, Dependencies, Settings; navigates to each)
- **WHEN** migration is complete
- **THEN** Scout specs cover global search deep links and navigation to each APM area

#### Scenario: Diagnostics spec is migrated to Scout

- **GIVEN** `diagnostics/diagnostics.cy.ts` (summary tab, import/export, tabs for superuser vs viewer; viewer sees limited tabs and privilege warning)
- **WHEN** migration is complete
- **THEN** Scout specs cover diagnostics summary, import/export, tab visibility, and viewer vs superuser behavior

#### Scenario: Feature flag comparison spec is migrated to Scout

- **GIVEN** `feature_flag/comparison.cy.ts` (time comparison feature flag on/off)
- **WHEN** migration is complete
- **THEN** Scout spec covers comparison feature flag behavior

#### Scenario: Home page spec is migrated to Scout

- **GIVEN** `home.cy.ts` (redirect, metric-only services)
- **WHEN** migration is complete
- **THEN** Scout spec covers home redirect and metric-only service handling

#### Scenario: Infrastructure page spec is migrated to Scout

- **GIVEN** `infrastructure/infrastructure_page.cy.ts` (containers, pods, hosts)
- **WHEN** migration is complete
- **THEN** Scout spec covers infrastructure page (containers, pods, hosts tabs)

#### Scenario: Mobile transaction specs are migrated or extended in Scout

- **GIVEN** `mobile/mobile_transaction_details.cy.ts` and `mobile/mobile_transactions.cy.ts`
- **WHEN** migration is complete
- **THEN** Scout coverage exists (existing `service_overview_mobile.spec.ts` may be extended or new specs added) for mobile transactions tab and transaction details

#### Scenario: Navigation spec is migrated to Scout

- **GIVEN** `navigation.cy.ts` (resource loading, navigation flows)
- **WHEN** migration is complete
- **THEN** Scout spec covers navigation and resource loading behavior

#### Scenario: No-data screen spec is migrated to Scout

- **GIVEN** `no_data_screen.cy.ts` (no-data screen and settings bypass)
- **WHEN** migration is complete
- **THEN** Scout spec covers no-data state and settings bypass

#### Scenario: Onboarding spec is migrated to Scout

- **GIVEN** `onboarding/onboarding.cy.ts` (APM onboarding flow)
- **WHEN** migration is complete
- **THEN** Scout spec covers onboarding steps and flows

#### Scenario: Trace explorer spec is migrated to Scout

- **GIVEN** `trace_explorer/trace_explorer.cy.ts`
- **WHEN** migration is complete
- **THEN** Scout spec covers trace explorer page and behavior

#### Scenario: Tutorial spec is migrated to Scout

- **GIVEN** `tutorial/tutorial.cy.ts` (APM tutorial)
- **WHEN** migration is complete
- **THEN** Scout spec covers tutorial page and flows

#### Scenario: Partial-coverage specs are extended in Scout

- **GIVEN** specs with partial Scout coverage: `service_overview/aws_lambda/aws_lambda.cy.ts`, `service_overview/azure_functions/azure_functions.cy.ts`, `service_overview/errors_table.cy.ts`, `service_overview/mobile_overview_with_most_used_charts.cy.ts`, `service_overview/time_comparison.cy.ts`
- **WHEN** migration is complete
- **THEN** Scout specs are added or extended for AWS Lambda, Azure Functions, errors table, mobile overview charts, and time comparison

---

### Requirement: Synthtrace data generation in Scout

The system SHALL port Synthtrace-based data generation patterns from Cypress FTR setup to Scout fixtures. Scout specs SHALL use existing or new synthtrace fixtures (e.g. opbeans, mobile_services) for consistent test data.

#### Scenario: Synthtrace fixtures support migrated specs

- **GIVEN** Cypress specs that use `synthtrace.index(opbeans(...))` or similar
- **WHEN** migration is complete
- **THEN** Scout global setup or per-spec fixtures use equivalent synthtrace generators (e.g. `opbeans`, `mobile_services`, `last_24_hours`) from `test/scout/ui/fixtures/synthtrace/`

#### Scenario: Date ranges align with test data

- **GIVEN** Scout constants (START_DATE, END_DATE) in `fixtures/constants.ts`
- **WHEN** migrated specs require time-bounded data
- **THEN** synthtrace generation uses consistent date ranges and page navigation uses matching `rangeFrom`/`rangeTo` query params

---

### Requirement: CI pipeline for APM Scout

The system SHALL create or update the CI pipeline so that APM Scout tests run in place of (or alongside) the APM Cypress pipeline. The pipeline SHALL invoke `node scripts/scout run-tests` with the APM Scout config.

#### Scenario: Scout step runs in APM pipeline

- **GIVEN** the APM pipeline (e.g. `.buildkite/pipelines/pull_request/apm_cypress.yml`)
- **WHEN** migration is complete
- **THEN** the pipeline runs APM Scout tests (via a new step or replacement of `apm_cypress.sh`)

#### Scenario: Pipeline triggers on relevant path changes

- **WHEN** pipeline logic triggers APM jobs
- **THEN** changes under `x-pack/solutions/observability/plugins/apm/test/scout/` or APM plugin code cause the Scout step to run
