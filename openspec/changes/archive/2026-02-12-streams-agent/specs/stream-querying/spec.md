## ADDED Requirements

### Requirement: List all streams

The agent SHALL provide a tool `streams.list_streams` that returns all streams the user has access to, including each stream's name and description.

#### Scenario: User asks what streams exist

- **WHEN** the user asks "what streams do I have?" or similar
- **THEN** the agent calls `streams.list_streams` and presents a summary of all streams with name and description

#### Scenario: User asks for details about specific streams from the list

- **WHEN** the user sees the stream list and asks about a specific stream's quality, retention, or schema
- **THEN** the agent uses the appropriate focused tool (`get_data_quality`, `get_lifecycle_stats`, `get_schema`) to retrieve the details

### Requirement: Get stream detail

The agent SHALL provide a tool `streams.get_stream` that accepts a stream name and returns the stream's definition: its type (wired or classic), retention policy, processors, partitions (child streams with routing conditions), field mappings, and description.

#### Scenario: User asks about a specific stream

- **WHEN** the user asks "show me logs.nginx" or "tell me about logs.nginx"
- **THEN** the agent calls `streams.get_stream` with name `logs.nginx` and presents a summary of the stream's configuration

### Requirement: Get stream hierarchy

The agent SHALL be able to present the parent-child hierarchy of wired streams, showing which streams are children of which parent and how routing conditions are defined.

#### Scenario: User asks for the stream tree

- **WHEN** the user asks "show me the stream hierarchy under logs"
- **THEN** the agent calls `streams.get_stream` for the parent and presents a tree view of the parent and its children with their routing conditions

### Requirement: Get data quality detail

The agent SHALL provide a tool `streams.get_data_quality` that accepts a stream name and returns degraded document count/percentage, failed document count/percentage, quality score, and the failure store configuration status (enabled/disabled/inherited) read from the stream definition.

#### Scenario: User investigates data quality

- **WHEN** the user asks "why is logs.payments showing poor data quality?"
- **THEN** the agent calls `streams.get_data_quality` and presents the degraded/failed document metrics, quality score, and the failure store status

### Requirement: Get schema detail

The agent SHALL provide a tool `streams.get_schema` that accepts a stream name and returns the field mappings including mapped fields with types, unmapped fields, and inherited fields (for wired streams).

#### Scenario: User asks about unmapped fields

- **WHEN** the user asks "what fields are unmapped in logs.myapp?"
- **THEN** the agent calls `streams.get_schema` and presents the unmapped fields

### Requirement: Query stream documents

The agent SHALL provide a tool `streams.query_documents` that accepts a stream name and returns recent sample documents from the stream, sorted by `@timestamp` descending. The tool accepts optional parameters for document count (default 20) and time range. When no time range is provided, no time filter is applied and the most recent documents are returned regardless of age.

The tool SHALL flatten nested document structures into dot-notation key-value maps (e.g. `body.text`, `resource.attributes.host.name`) to reduce nesting and make documents easier for both the agent and the user to read. Long string values SHALL be truncated to keep context window usage manageable.

The tool's response SHALL include the oldest and newest returned timestamps as epoch milliseconds (`oldestReturnedTimestampMs`, `newestReturnedTimestampMs`) so the agent can pass them directly to AI tools as `startMs`/`endMs` without needing to parse or convert date strings.

#### Scenario: User asks to see recent data

- **WHEN** the user asks "show me some recent logs from logs.nginx" or "what's in logs.android?"
- **THEN** the agent calls `streams.query_documents` and presents the returned documents as a **chronological list** showing timestamp and key fields per entry — not as a prose summary

#### Scenario: Agent inspects data before AI analysis

- **WHEN** the agent is about to call an AI tool (e.g. suggest_partitions) and needs to understand the data
- **THEN** the agent calls `streams.query_documents` first to see actual data, determine the time range of recent activity, and use that context for the AI tool call

#### Scenario: User asks about specific fields or values

- **WHEN** the user asks "what does the message field look like in logs.apache?" or "show me error logs from logs.payments"
- **THEN** the agent calls `streams.query_documents` and focuses its response on the relevant fields or filtered patterns

### Requirement: Get lifecycle stats

The agent SHALL provide a tool `streams.get_lifecycle_stats` that accepts a stream name and returns the retention policy (type: ilm/dsl/inherit, configuration), total storage size, document count, and ILM phase breakdown with per-phase storage (when the stream is managed by ILM).

#### Scenario: User asks about retention

- **WHEN** the user asks "what's the retention on logs.nginx?"
- **THEN** the agent calls `streams.get_lifecycle_stats` and presents the retention policy, whether it's inherited or set directly, and storage breakdown by tier

### Requirement: Cross-stream storage analysis

The agent SHALL be able to answer questions about storage usage across multiple streams by combining data from `streams.list_streams` and `streams.get_lifecycle_stats`.

#### Scenario: User asks which streams use the most storage

- **WHEN** the user asks "which streams are using the most storage?"
- **THEN** the agent calls `streams.list_streams` to discover streams, then calls `streams.get_lifecycle_stats` for relevant streams, and presents the results sorted by storage size with retention policy context
