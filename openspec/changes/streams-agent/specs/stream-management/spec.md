## ADDED Requirements

### Requirement: Preview-confirm-apply cycle for all mutations
Every write tool SHALL follow a preview-confirm-apply cycle: the agent MUST describe the intended change (including current state and proposed new state) and receive explicit user confirmation before executing the mutation. Agent Builder's tool confirmation mechanism SHALL be used for the approval step.

#### Scenario: Agent previews a retention change
- **WHEN** the user asks "set retention on logs.debug to 7 days"
- **THEN** the agent presents a preview showing the stream name, current retention policy (value and source), and proposed new retention before requesting confirmation

#### Scenario: User confirms a mutation
- **WHEN** the agent has presented a preview and the user confirms
- **THEN** the agent executes the mutation and reports success or failure

#### Scenario: User rejects a mutation
- **WHEN** the agent has presented a preview and the user declines or asks for adjustments
- **THEN** the agent does NOT execute the mutation and asks how the user would like to proceed

### Requirement: Set retention policy
The agent SHALL provide a tool `streams.set_retention` that accepts a stream name and a retention configuration (specific period in days, ILM policy name, or inherit from parent/template) and updates the stream's retention policy.

#### Scenario: Set a specific retention period
- **WHEN** the user asks "set retention on logs.debug to 7 days"
- **THEN** the agent previews the change (current vs proposed retention), and after confirmation, updates the stream to a 7-day retention period

#### Scenario: Switch to ILM policy
- **WHEN** the user asks "make logs.compliance follow the hot-warm-cold-90d ILM policy"
- **THEN** the agent previews the change and after confirmation, updates the stream to follow the specified ILM policy

#### Scenario: Enable retention inheritance
- **WHEN** the user asks "make logs.nginx inherit retention from its parent"
- **THEN** the agent previews the change showing the parent's retention policy that will be inherited, and after confirmation, enables inheritance

### Requirement: Create partition (fork stream)
The agent SHALL provide a tool `streams.fork_stream` that accepts a parent stream name, a child stream name, and a routing condition, and creates a new child stream.

#### Scenario: Create a partition with an explicit condition
- **WHEN** the user asks "route all documents where service.name is nginx to logs.nginx"
- **THEN** the agent previews the partition (parent, child name, routing condition) and after confirmation, creates the child stream

#### Scenario: Create multiple partitions sequentially
- **WHEN** the user confirms a set of partitions (e.g. from AI suggestions)
- **THEN** the agent MUST create each partition one at a time — calling `fork_stream`, waiting for it to complete, then calling the next — because the Streams API uses an exclusive lock per stream. Issuing multiple fork calls in parallel SHALL result in lock conflicts. The agent reports success for each partition individually.

### Requirement: Delete stream
The agent SHALL provide a tool `streams.delete_stream` that accepts a stream name and deletes the stream after confirmation.

#### Scenario: Delete a child stream
- **WHEN** the user asks "delete logs.old-app"
- **THEN** the agent previews the deletion (stream name, whether it has child streams, current data volume) and after confirmation, deletes the stream

### Requirement: Update processors
The agent SHALL provide a tool `streams.update_processors` that accepts a stream name and a processor configuration (add, edit, or remove processors) and updates the stream's processing pipeline.

#### Scenario: Add a grok processor
- **WHEN** the user asks "add a grok processor to parse the message field in logs.nginx"
- **THEN** the agent previews the processor addition (processor type, source field, patterns) and after confirmation, adds the processor to the stream's pipeline

#### Scenario: Add a drop processor with condition
- **WHEN** the user asks "drop all DEBUG messages from logs.verbose"
- **THEN** the agent previews the drop processor with its condition (log.level == DEBUG) and after confirmation, adds it

#### Scenario: Simulation before applying processor changes
- **WHEN** the agent is about to apply processor changes that support simulation
- **THEN** the agent SHALL run a simulation first and include the simulation results (success rate, detected fields, any failures) in the preview before requesting confirmation

### Requirement: Map fields
The agent SHALL provide a tool `streams.map_fields` that accepts a stream name and a list of field name/type pairs and updates the field mappings.

#### Scenario: Map an unmapped field
- **WHEN** the user asks "map status_code as keyword in logs.api"
- **THEN** the agent previews the mapping change (field name, proposed type) and after confirmation, applies the mapping

### Requirement: Enable failure store
The agent SHALL provide a tool `streams.enable_failure_store` that accepts a stream name and an optional retention period and enables the failure store on the stream.

#### Scenario: Enable failure store with default retention
- **WHEN** the user asks "enable the failure store on logs.orders"
- **THEN** the agent previews enabling the failure store and after confirmation, enables it

### Requirement: Update advanced settings
The agent SHALL provide a tool `streams.update_settings` that accepts a stream name and settings (shards, replicas, refresh interval) and updates the stream's advanced configuration.

#### Scenario: Change replica count
- **WHEN** the user asks "set replicas to 2 on logs.critical"
- **THEN** the agent previews the settings change and after confirmation, applies it
