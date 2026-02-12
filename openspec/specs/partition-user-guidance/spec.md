## Requirements

### Requirement: Guidance popover opens on generate action
The system SHALL display an `EuiPopover` when the user clicks the "Suggest partitions with AI" button. The popover SHALL contain an optional text area for user guidance, a Cancel button, and a Generate button. The popover SHALL be anchored to the button that triggered it.

#### Scenario: User clicks Suggest partitions with AI
- **WHEN** the user clicks the "Suggest partitions with AI" button
- **THEN** a popover opens containing a text area, a Cancel button, and a Generate button

#### Scenario: User cancels the popover
- **WHEN** the popover is open and the user clicks Cancel
- **THEN** the popover closes without triggering generation and without clearing the text area content

### Requirement: User can provide optional guidance text
The system SHALL allow users to enter free-form natural-language instructions in the popover text area before generating suggestions. The text area SHALL have placeholder text (e.g., "e.g., Partition by service name and severity level") to guide users. The guidance text SHALL be optional — leaving it empty SHALL be valid.

#### Scenario: User enters guidance and generates
- **WHEN** the user types guidance text into the text area and clicks Generate
- **THEN** the popover closes and suggestion generation begins with the guidance text passed as `user_prompt` to the API

#### Scenario: User generates without guidance
- **WHEN** the user leaves the text area empty and clicks Generate
- **THEN** the popover closes and suggestion generation begins without a `user_prompt`, producing the same fully-automatic behavior as before this change

### Requirement: Guidance is passed through the API to the AI workflow
The `POST /internal/streams/{name}/_suggest_partitions` endpoint SHALL accept an optional `user_prompt` string field in the request body. When present, the server SHALL pass the value to the `partitionStream` AI workflow function. The AI content prompt template SHALL render the user guidance in a dedicated section when provided.

#### Scenario: API receives request with user_prompt
- **WHEN** the API receives a request with a non-empty `user_prompt` field
- **THEN** the `partitionStream` function is called with the `userPrompt` parameter and the LLM prompt includes the user guidance text

#### Scenario: API receives request without user_prompt
- **WHEN** the API receives a request without `user_prompt` or with an empty string
- **THEN** the `partitionStream` function is called without a `userPrompt` parameter and the LLM prompt does not include a user guidance section

### Requirement: Refinement popover opens on regenerate action
The system SHALL display the same guidance popover when the user clicks the "Regenerate" button in the review suggestions form. The popover SHALL behave identically to the initial generation popover — optional text area, Cancel, and Generate.

#### Scenario: User clicks Regenerate
- **WHEN** suggestions are displayed and the user clicks the "Regenerate" button
- **THEN** the same guidance popover opens, allowing the user to enter optional refinement instructions

### Requirement: Refinement sends existing partitions alongside guidance
When generating suggestions from the review suggestions form (refinement), the system SHALL send the current suggestions as `existing_partitions` in the API request body alongside the optional `user_prompt`. The `existing_partitions` field SHALL be an array of `{ name: string, condition: Condition }` objects matching the `PartitionSuggestion` shape.

#### Scenario: User refines with guidance and existing partitions
- **WHEN** the user enters refinement guidance in the popover and clicks Generate while suggestions are displayed
- **THEN** the API request includes both `user_prompt` (the new guidance) and `existing_partitions` (the current suggestion set), and the LLM uses both to produce refined suggestions

#### Scenario: User regenerates without guidance but with existing partitions
- **WHEN** the user leaves the text area empty and clicks Generate while suggestions are displayed
- **THEN** the API request includes `existing_partitions` (the current suggestion set) but no `user_prompt`, and the LLM refines based solely on the existing partitions

### Requirement: AI workflow incorporates existing partitions in prompt
The `partitionStream` function SHALL accept an optional `existingPartitions` parameter. When provided, the content prompt template SHALL render the existing partition set in a dedicated section instructing the LLM to refine the partitions rather than starting from scratch. The `POST /internal/streams/{name}/_suggest_partitions` endpoint SHALL accept an optional `existing_partitions` array in the request body and pass it through to the workflow.

#### Scenario: Workflow called with existing partitions
- **WHEN** `partitionStream` is called with `existingPartitions` containing one or more partition objects
- **THEN** the LLM prompt includes a "Current partitions" section with the serialized partition data and instructions to refine them

#### Scenario: Workflow called without existing partitions
- **WHEN** `partitionStream` is called without `existingPartitions`
- **THEN** the LLM prompt does not include a "Current partitions" section and the model generates partitions from scratch

### Requirement: Backward compatibility is preserved
The system SHALL preserve full backward compatibility. Omitting both `user_prompt` and `existing_partitions` from the API request SHALL produce identical behavior to the pre-change system. The AI prompt templates SHALL only include guidance and existing partition sections when the respective parameters are provided.

#### Scenario: Legacy request without new fields
- **WHEN** the API receives a request with only `connector_id`, `start`, and `end` (no `user_prompt` or `existing_partitions`)
- **THEN** the system behaves identically to the pre-change implementation
