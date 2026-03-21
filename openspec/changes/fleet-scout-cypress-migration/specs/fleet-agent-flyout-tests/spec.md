# Spec: Fleet Agent Flyout Tests

## ADDED Requirements

### Requirement: Add-agent flyout in managed mode

The system SHALL support the add-agent flyout when Fleet is in managed mode with a Fleet Server already setup. The flyout SHALL allow creating a new agent policy, enrolling agents, and confirming enrollment when incoming data is received.

#### Scenario: Add agent flyout with Fleet Server setup

- **WHEN** Fleet has a Fleet Server policy and at least one Fleet Server agent
- **THEN** the Add Agent button opens the add-agent flyout
- **AND** the Quick Start and Advanced tabs are available

#### Scenario: Create policy from flyout

- **WHEN** a user clicks "Create new policy" in the add-agent flyout
- **THEN** a new agent policy is created via POST
- **AND** the policy dropdown replaces the create button
- **AND** the flyout shows enrollment instructions for the new policy

#### Scenario: Confirm agent enrollment with incoming data

- **WHEN** a user creates a policy and an agent is enrolled (agent doc in `.fleet-agents`)
- **AND** incoming data arrives in a matching data stream (e.g. `logs-cypress-test`)
- **THEN** the flyout shows the "Incoming data confirmed" callout
- **AND** the enrollment flow is complete

#### Scenario: Platform selector (Kubernetes, etc.)

- **WHEN** a user selects a platform (e.g. Kubernetes) in the flyout
- **THEN** the enrollment command and Fleet Server host displayed match the selected platform
