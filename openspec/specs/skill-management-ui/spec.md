# skill-management-ui Specification

## Purpose
TBD - created by archiving change add-user-created-skills. Update Purpose after archive.
## Requirements
### Requirement: Skills list view

The agent builder UI SHALL include a skills management section that displays all skills (built-in and user-created) in a list/table view.

Each skill entry SHALL display: name, description, type indicator (built-in vs user-created), and the number of referenced tools.

Built-in skills SHALL be visually distinguished (e.g., badge or icon) and SHALL NOT have edit/delete actions.

#### Scenario: View all skills
- **WHEN** the user navigates to the skills management section
- **THEN** all skills (built-in and user-created) for the current space are displayed

#### Scenario: Built-in skills are not editable
- **WHEN** a built-in skill is displayed in the list
- **THEN** edit and delete actions are not available for that skill

#### Scenario: User-created skills have edit/delete actions
- **WHEN** a user-created skill is displayed in the list
- **THEN** edit and delete actions are available for that skill

---

### Requirement: Create skill form

The UI SHALL provide a form for creating a new skill with the following fields:

| Field | Type | Required | Constraints |
|---|---|---|---|
| Name | text input | yes | Max 64 chars, lowercase letters/numbers/hyphens/underscores |
| Description | text area | yes | Max 1024 chars |
| Content | markdown editor | yes | Non-empty, skill instructions |
| Tools | multi-select | no | Select from available tools in the registry |

#### Scenario: Create a new skill with tools
- **WHEN** the user fills in all required fields, selects tools from the registry, and submits
- **THEN** the skill is created via the API and appears in the skills list

#### Scenario: Form validation prevents invalid input
- **WHEN** the user enters a name with spaces or special characters
- **THEN** an inline validation error is displayed before submission

#### Scenario: Tool selector shows available tools
- **WHEN** the user opens the tool multi-select
- **THEN** all tools from the registry (built-in and user-created) are listed as options

---

### Requirement: Edit skill form

The UI SHALL provide a form for editing an existing user-created skill, pre-populated with the current values. The form layout matches the create form.

#### Scenario: Edit an existing skill
- **WHEN** the user opens the edit form for a user-created skill, modifies fields, and saves
- **THEN** the skill is updated via the API and the changes are reflected in the skills list

#### Scenario: Edit form is pre-populated
- **WHEN** the user opens the edit form for a user-created skill
- **THEN** all fields are pre-filled with the skill's current values

---

### Requirement: Delete skill confirmation

The UI SHALL show a confirmation dialog before deleting a user-created skill.

#### Scenario: Confirm deletion
- **WHEN** the user clicks delete on a user-created skill and confirms the dialog
- **THEN** the skill is deleted via the API and removed from the skills list

#### Scenario: Cancel deletion
- **WHEN** the user clicks delete on a user-created skill and cancels the dialog
- **THEN** the skill is not deleted

---

### Requirement: Skill assignment in agent configuration

The agent configuration form SHALL include a skill selection section that allows users to assign skills to the agent.

The selection SHALL support:
- A multi-select control to pick skills from the full list (built-in + user-created)
- Displaying currently assigned skills with the ability to remove them
- Distinguishing built-in from user-created skills in the selector

#### Scenario: Assign skills to an agent
- **WHEN** the user opens an agent's configuration, selects skills from the picker, and saves
- **THEN** the agent's `skills` configuration is updated with the selected skill IDs

#### Scenario: Remove skills from an agent
- **WHEN** the user removes skills from an agent's configuration and saves
- **THEN** the removed skills are no longer in the agent's `skills` field

#### Scenario: Default agent shows all built-in skills assigned
- **WHEN** the user views the default agent's configuration
- **THEN** all built-in skills are shown as assigned (reflecting the wildcard selection)

---

### Requirement: Empty state for skills

The UI SHALL display an informative empty state when no user-created skills exist, with guidance on how to create one.

#### Scenario: No user-created skills exist
- **WHEN** the user navigates to the skills section and no user-created skills have been created
- **THEN** an empty state is displayed with a description and a "Create skill" call-to-action button

