# Spec: Fleet Space Awareness Tests

## ADDED Requirements

### Requirement: Space-aware agent policies

The system SHALL support agent policies that are scoped to Kibana spaces. A policy created in a non-default space SHALL not be visible in the default space until the policy is updated to include the default space.

#### Scenario: Create agent policy in test space

- **WHEN** space awareness is enabled and a test space exists
- **AND** a user creates an agent policy in the test space (with system monitoring unchecked)
- **THEN** the policy is created and appears in the test space policies list
- **AND** the policy name is displayed in the table

#### Scenario: Policy not visible in default space

- **WHEN** a policy exists only in the test space
- **THEN** the default space policies list shows "No agent policies" (or does not include that policy)

#### Scenario: Update policy to include both spaces

- **WHEN** a user edits a test-space policy and adds "default" to the space selector
- **THEN** the policy is updated via PUT
- **AND** the policy is visible in both test and default spaces

#### Scenario: Policy visible in both spaces after update

- **WHEN** a policy has been updated to include both test and default spaces
- **THEN** visiting the test space policies list shows the policy
- **AND** visiting the default space policies list shows the policy

#### Scenario: Redirect when removing current space from policy

- **WHEN** a user is viewing a policy in the test space
- **AND** the user removes the test space from the policy (keeping only default)
- **THEN** after save, the user is redirected to the agent policies list
- **AND** the test space policies list shows "No agent policies" (policy now only in default)
- **AND** the URL remains in the test space context
