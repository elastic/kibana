# Spec: Fleet A11y Tests

## ADDED Requirements

### Requirement: Accessibility for Fleet home page

The system SHALL pass accessibility checks on Fleet home page areas using Playwright's `page.checkA11y()` (or equivalent Scout a11y helper). Tests SHALL replace the Cypress `cypress-axe` integration with Playwright a11y patterns.

#### Scenario: Add-agent Quick Start tab

- **WHEN** a user opens the Add Fleet Server flow and views the Quick Start tab
- **THEN** the page passes a11y checks

#### Scenario: Install Fleet Server flow

- **WHEN** a user adds a host, enters URL, and generates the Fleet Server policy in Quick Start
- **THEN** the platform type selector and subsequent UI pass a11y checks

#### Scenario: Add-agent Advanced tab

- **WHEN** a user opens the Advanced tab (Select policy, Add host, Generate service token)
- **THEN** each state passes a11y checks

#### Scenario: Agent policies tab

- **WHEN** a user navigates to Agent Policies
- **THEN** the agent policies table passes a11y checks

#### Scenario: Create policy flyout

- **WHEN** a user opens the Create Agent Policy flyout and expands advanced options
- **THEN** the flyout passes a11y checks

#### Scenario: Agent table after adding policy

- **WHEN** a user creates an agent policy and the table updates
- **THEN** the updated table passes a11y checks

#### Scenario: Enrollment tokens tab

- **WHEN** a user navigates to Enrollment Tokens
- **THEN** the enrollment tokens table passes a11y checks

#### Scenario: Create enrollment token modal

- **WHEN** a user opens the Create Enrollment Token modal
- **THEN** the modal passes a11y checks

#### Scenario: Uninstall tokens tab

- **WHEN** a user navigates to Uninstall Tokens (with at least one policy)
- **THEN** the uninstall tokens table passes a11y checks

#### Scenario: View uninstall command flyout

- **WHEN** a user opens the View Uninstall Command flyout
- **THEN** the flyout passes a11y checks

#### Scenario: Data streams tab

- **WHEN** a user navigates to Data Streams
- **THEN** the data streams table (or empty state) passes a11y checks

#### Scenario: Settings tab (when enabled)

- **WHEN** a user navigates to Fleet Settings (if a11y violations are resolved)
- **THEN** the settings form passes a11y checks
