# Spec: Fleet Agents Tests

## ADDED Requirements

### Requirement: Agent list filters

The system SHALL support filtering agents by agent ID, upgrade available, policy, status, and tags. Tests SHALL verify each filter returns the expected agents.

#### Scenario: Filter by agent ID

- **WHEN** a user applies a filter `agent.id: "agent-1"`
- **THEN** the table displays only the matching agent

#### Scenario: Filter by upgrade available

- **WHEN** a user clicks "Upgrade available"
- **THEN** only agents with upgrades available are shown
- **AND** a second click clears the filter and shows all agents

#### Scenario: Filter by agent policy

- **WHEN** a user selects one or more policies from the policy filter
- **THEN** the table displays only agents in those policies
- **AND** selecting a policy with no agents shows "No agents found"

#### Scenario: Filter by status (Healthy, Unhealthy, Inactive)

- **WHEN** a user selects Healthy, Unhealthy, or Inactive from the status filter
- **THEN** the table displays only agents with that status
- **AND** multiple status selections can be combined (e.g. Healthy + Unhealthy)

#### Scenario: Filter by tags

- **WHEN** a user selects one or more tags from the tags filter
- **THEN** the table displays only agents with those tags
- **AND** "Clear all" removes tag filters

---

### Requirement: Bulk actions on agents

The system SHALL support bulk upgrade, bulk add/remove tags, bulk reassign policy, and hierarchical bulk action menus (Upgrade management, Maintenance and diagnostics, Security and removal).

#### Scenario: Bulk upgrade and cancel

- **WHEN** a user bulk selects agents and triggers upgrade
- **THEN** agent status shows "Updating"
- **AND** the user can cancel the upgrade via the Activity flyout
- **AND** after cancel, agent status returns to "Healthy"

#### Scenario: Bulk add/remove tags

- **WHEN** a user bulk selects agents and chooses "Add / remove tags"
- **THEN** the user can create or select tags and apply them to the selected agents

#### Scenario: Bulk reassign to new policy

- **WHEN** a user bulk selects agents and chooses "Assign to new policy"
- **THEN** the user can select a target policy and reassign
- **AND** the agents move to the new policy and the table updates

#### Scenario: Hierarchical bulk action menu

- **WHEN** a user opens the bulk actions menu
- **THEN** submenus "Upgrade management", "Maintenance and diagnostics", "Security and removal" are visible
- **AND** navigating to "Security and removal" shows "Unenroll X agents"
- **AND** navigating to "Maintenance and diagnostics" shows "Request diagnostics for X agents"

---

### Requirement: Agentless policy details

The system SHALL display agentless policy details without an "add integration" button, since agentless policies do not support package policies in the same way as agent-based policies.

#### Scenario: Agentless policy has no add integration button

- **WHEN** a user views an agentless policy details page
- **THEN** the "Add integration" button is not displayed
- **AND** policy-specific agentless details are shown
