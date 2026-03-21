# Spec: Fleet Agent Policies Tests

## ADDED Requirements

### Requirement: Agent policy editing

The system SHALL allow editing an agent policy (e.g. description) and saving changes. Tests SHALL verify the PUT request body matches the edited values.

#### Scenario: Edit agent policy description

- **WHEN** a user edits an agent policy settings page and changes the description
- **THEN** saving sends the correct PUT request with the updated description
- **AND** the UI reflects the saved state

#### Scenario: Fleet Server host displayed for custom URL

- **WHEN** an agent policy uses a custom Fleet Server host
- **THEN** the enrollment flyout displays the correct Fleet Server host URL and API key for the selected platform (e.g. Kubernetes)

---

### Requirement: Orphaned package policy creation

The system SHALL allow creating orphaned package policies (package policies not attached to any agent policy). Tests SHALL verify the package policy creation flow and that orphaned policies can be managed.

#### Scenario: Create orphaned package policy

- **WHEN** a user creates a package policy without associating it to an agent policy
- **THEN** the package policy is created and appears in the appropriate list
- **AND** the policy can later be added to an agent policy

---

### Requirement: Agent binary download sources

The system SHALL allow managing agent binary download sources: add, edit, and delete. Tests SHALL verify CRUD operations on non-default download sources.

#### Scenario: Edit agent binary download source

- **WHEN** a user edits a non-default download source
- **THEN** the update is persisted and the UI reflects the change

#### Scenario: Add agent binary download source

- **WHEN** a user adds a new download source with a name and URL
- **THEN** the source is created and appears in the list

#### Scenario: Delete agent binary download source

- **WHEN** a user deletes a non-default download source
- **THEN** the source is removed and no longer appears in the list
