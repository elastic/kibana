# Spec: Security Solution Explore Scout Tests

## ADDED Requirements

### Requirement: Explore Scout test coverage

The system SHALL provide Scout tests that cover the Explore area in Security Solution: hosts, network, users, cases, filters, navigation, and URL state. The tests SHALL replicate the behavior of the ~25 Cypress specs under `cypress/e2e/explore/`.

#### Scenario: Navigation is covered

- **WHEN** a Scout spec runs the navigation tests
- **THEN** it covers: top-level navigation common to all Security app pages (ESS), Kibana navigation to all Security app pages (ESS), and serverless side navigation links

#### Scenario: Cases connector options are covered

- **WHEN** a Scout spec runs the cases connector tests
- **THEN** it covers: Cases connector incident fields, connector options for Security Solution cases

#### Scenario: Inspect button is covered

- **WHEN** a Scout spec runs the inspect tests
- **THEN** it covers: inspect button behavior, request inspector, and similar debug/inspect flows

#### Scenario: URL state is covered

- **WHEN** a Scout spec runs the URL state tests
- **THEN** it covers: URL state persistence, state sync between URL and app (ESS, skipInServerless where applicable)

#### Scenario: Hosts, network, users explore views are covered

- **WHEN** Scout specs run for explore hosts, network, users
- **THEN** they cover the explore data tables, filters, and navigation for hosts, network, and users views

#### Scenario: ESS and Serverless variants

- **WHEN** Explore Scout tests run
- **THEN** ESS-only tests use `@skipInServerless`, serverless-only tests use `@serverless`, and shared tests run in both modes
