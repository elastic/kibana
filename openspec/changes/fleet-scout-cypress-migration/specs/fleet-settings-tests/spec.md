# Spec: Fleet Settings Tests

## ADDED Requirements

### Requirement: Fleet server hosts management

The system SHALL allow creating, editing, and managing Fleet Server hosts. Internal hosts SHALL not be displayed in the settings UI. Tests SHALL verify CRUD operations and that internal hosts are hidden.

#### Scenario: Edit Fleet Server host

- **WHEN** a user edits a Fleet Server host (name, URL)
- **THEN** the update is persisted via PUT
- **AND** the UI reflects the new values after confirmation

#### Scenario: Create new Fleet Server host

- **WHEN** a user creates a new Fleet Server host with name and URL
- **THEN** the host is created via POST
- **AND** it can be set as default via the default switch

#### Scenario: Internal Fleet Server hosts are hidden

- **WHEN** Fleet Server hosts include internal (is_internal) hosts
- **THEN** internal hosts are not displayed in the settings table

---

### Requirement: Outputs management

The system SHALL allow creating and editing outputs (Elasticsearch, Remote ES, Logstash, Kafka). Tests SHALL verify output CRUD, host URL validation, and SSL configuration for Logstash.

#### Scenario: Edit default Elasticsearch output

- **WHEN** a user edits the default output (name, hosts)
- **THEN** the update is persisted via PUT
- **AND** the request body matches the entered values

#### Scenario: Create Logstash output with SSL

- **WHEN** a user creates a Logstash output with hosts, SSL certificate, and key
- **THEN** the output is created via POST
- **AND** the request body includes the SSL configuration

---

### Requirement: Fleet settings outputs (extended)

The system SHALL support Remote ES, Kafka outputs, output validation, and output operations (add, edit, delete). Tests SHALL verify validation errors and operations for each output type.

#### Scenario: Remote ES output

- **WHEN** a user creates or edits a Remote ES output
- **THEN** the configuration is validated and persisted correctly

#### Scenario: Kafka output

- **WHEN** a user creates or edits a Kafka output
- **THEN** the configuration is validated and persisted correctly

#### Scenario: Output validation

- **WHEN** a user enters invalid output configuration
- **THEN** validation errors are displayed
- **AND** save is blocked until valid

---

### Requirement: Fleet startup and policy creation

The system SHALL support Fleet startup flow and creation of the default Fleet Server policy. Tests SHALL verify Fleet initializes correctly and the Fleet Server policy is created when expected.

#### Scenario: Fleet startup

- **WHEN** Fleet starts for the first time
- **THEN** setup completes and Fleet is ready
- **AND** the Fleet Server policy can be created if needed

---

### Requirement: Enrollment token create and delete

The system SHALL allow creating and deleting enrollment tokens. Tests SHALL verify token creation modal, token list display, and delete flow.

#### Scenario: Create enrollment token

- **WHEN** a user creates an enrollment token with a name
- **THEN** the token is created
- **AND** it appears in the enrollment tokens list

#### Scenario: Delete enrollment token

- **WHEN** a user deletes an enrollment token
- **THEN** the token is removed
- **AND** it no longer appears in the list

---

### Requirement: Uninstall token page

The system SHALL display the uninstall tokens page with policy-based tokens, filter capability, and a flyout to view uninstall commands.

#### Scenario: Uninstall tokens table

- **WHEN** a user navigates to Uninstall Tokens
- **THEN** the table displays tokens by policy
- **AND** policies with tokens are listed

#### Scenario: View uninstall command flyout

- **WHEN** a user clicks "View uninstall command" for a policy
- **THEN** a flyout opens with the uninstall command
- **AND** the flyout is accessible (a11y)
