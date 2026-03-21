# Spec: Security Solution Investigations Scout Tests

## ADDED Requirements

### Requirement: Investigations Scout test coverage

The system SHALL provide Scout tests that cover Investigations in Security Solution: timelines, timeline templates, threat intelligence, SIEM migrations, dashboards, data views, and alerts. The tests SHALL replicate the behavior of the ~59 Cypress specs under `cypress/e2e/investigations/`.

#### Scenario: Timelines are covered

- **WHEN** a Scout spec runs the timeline tests
- **THEN** it covers: timeline creation, data providers, filters, search/filter, ESQL tab state, ESQL assistant, ESQL search filter, discover timeline state integration, open timeline, timelines table, row renderers, notes tab, correlation tab, bulk add to timeline, export, full screen, flyout button, inspect, local storage, privileges, URL state, unsaved timeline, unified components (query tab, table row actions), data view, timeline scope, alerts checkbox

#### Scenario: Timeline templates are covered

- **WHEN** a Scout spec runs the timeline template tests
- **THEN** it covers: template creation, export

#### Scenario: Threat intelligence is covered

- **WHEN** a Scout spec runs the threat intelligence tests
- **THEN** it covers: indicators (basic URL, multiple indicators, invalid indicators, missing mappings, field browser, request inspector, add integrations), timeline integration, query bar, empty page, cases, block list. ES archive usage: `ti_indicators_data_single`, `ti_indicators_data_multiple`, `ti_indicators_data_invalid`, `ti_indicators_data_no_mappings`

#### Scenario: SIEM migrations are covered

- **WHEN** a Scout spec runs the SIEM migration tests
- **THEN** it covers: dashboards onboarding/translation, rules onboarding/translation, translated dashboards page, translated rules page

#### Scenario: Dashboards and data views are covered

- **WHEN** a Scout spec runs the dashboards/data view tests
- **THEN** it covers: detection response dashboard (KQL search bar, open in timeline, redirection to AlertPage), create runtime field, data view operations

#### Scenario: Alerts (investigations context) are covered

- **WHEN** a Scout spec runs the investigations alerts tests
- **THEN** it covers: page filters (URL and localStorage), alert details expandable flyout right panel (local storage persistence), building block alerts, alerts charts (KPI viz navigation, histogram legend hover), alerts cell actions, resolver, ransomware prevention
