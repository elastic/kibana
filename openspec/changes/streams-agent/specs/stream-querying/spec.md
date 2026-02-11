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
The agent SHALL provide a tool `streams.get_stream` that accepts a stream name and returns its full configuration: retention policy, storage size, ingestion rates, processors, partitions (children), schema (mapped/unmapped fields), data quality metrics, and features/systems.

#### Scenario: User asks about a specific stream
- **WHEN** the user asks "show me logs.nginx" or "tell me about logs.nginx"
- **THEN** the agent calls `streams.get_stream` with name `logs.nginx` and presents a summary of the stream's configuration

#### Scenario: User asks a follow-up about a previously mentioned stream
- **WHEN** the user previously asked about `logs.nginx` and then asks "what processors does it have?"
- **THEN** the agent uses conversation history to resolve "it" to `logs.nginx` and presents the processor list from the stream detail

### Requirement: Get stream hierarchy
The agent SHALL be able to present the parent-child hierarchy of wired streams, showing which streams are children of which parent and how routing conditions are defined.

#### Scenario: User asks for the stream tree
- **WHEN** the user asks "show me the stream hierarchy under logs"
- **THEN** the agent calls `streams.get_stream` for the parent and presents a tree view of the parent and its children with their routing conditions

### Requirement: Get data quality detail
The agent SHALL provide a tool `streams.get_data_quality` that accepts a stream name and returns degraded document count/percentage, failed document count/percentage, quality score, and whether the failure store is enabled.

#### Scenario: User investigates data quality
- **WHEN** the user asks "why is logs.payments showing poor data quality?"
- **THEN** the agent calls `streams.get_data_quality` and presents the degraded/failed document metrics, field-level issues, and whether the failure store is active

### Requirement: Get schema detail
The agent SHALL provide a tool `streams.get_schema` that accepts a stream name and returns the field mappings including mapped fields with types, unmapped fields, and inherited fields (for wired streams).

#### Scenario: User asks about unmapped fields
- **WHEN** the user asks "what fields are unmapped in logs.myapp?"
- **THEN** the agent calls `streams.get_schema` and presents the unmapped fields with suggested types

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
The agent SHALL provide a tool `streams.get_lifecycle_stats` that accepts a stream name and returns the retention policy (type, value, source), ILM phase breakdown, and data tier distribution.

#### Scenario: User asks about retention
- **WHEN** the user asks "what's the retention on logs.nginx?"
- **THEN** the agent calls `streams.get_lifecycle_stats` and presents the retention policy, whether it's inherited or set directly, and storage breakdown by tier

### Requirement: Cross-stream storage analysis
The agent SHALL be able to answer questions about storage usage across multiple streams by combining data from `streams.list_streams` and `streams.get_lifecycle_stats`.

#### Scenario: User asks which streams use the most storage
- **WHEN** the user asks "which streams are using the most storage?"
- **THEN** the agent calls `streams.list_streams` to discover streams, then calls `streams.get_lifecycle_stats` for relevant streams, and presents the results sorted by storage size with retention policy context

### Requirement: Response formatting
The agent SHALL present structured tool output using lists, tables, and concise summaries — not prose paragraphs. Formatting guidance SHALL be included in the agent's system instructions for each major output type:

- **Query documents**: Chronological list — one entry per document with timestamp and key fields
- **Schema fields**: Field list — one per line with field name and type
- **Data quality**: Concise summary — quality score, degraded %, failed %, failure store status
- **Lifecycle stats**: Summary line — retention value, source, storage size, tier breakdown
- **Partition suggestions**: Numbered list — name, routing condition, estimated traffic percentage
- **Stream detail**: Sectioned summary — separate sections for retention, processors, partitions, schema

#### Scenario: Agent presents schema information
- **WHEN** the user asks "what fields are in logs.nginx?"
- **THEN** the agent presents fields as a list (e.g. `status_code: keyword`, `request_path: match_only_text`) rather than narrating them in prose

#### Scenario: Agent presents data quality metrics
- **WHEN** the user asks "how's the data quality on logs.payments?"
- **THEN** the agent presents a concise summary (e.g. "Quality: Degraded — 12% degraded, 0.3% failed, failure store: enabled") rather than narrating each metric

### Requirement: Tool selection heuristics
The agent's system instructions SHALL include guidance on selecting the appropriate read tool based on the user's question:

- For a **general overview** of a stream → `get_stream` (returns everything in one call)
- For a **specific aspect** (schema, quality, retention) → the focused tool (`get_schema`, `get_data_quality`, `get_lifecycle_stats`)
- For understanding **what data looks like** → `query_documents`
- For **comparing across streams** or discovering streams → `list_streams`

The agent SHALL NOT call multiple focused tools when a single `get_stream` call would answer the question, and SHALL NOT call `get_stream` when the user only asked about a specific aspect.

#### Scenario: User asks a general question about a stream
- **WHEN** the user asks "tell me about logs.nginx"
- **THEN** the agent calls `get_stream` (one call) rather than calling `get_schema` + `get_data_quality` + `get_lifecycle_stats` separately

#### Scenario: User asks only about retention
- **WHEN** the user asks "what's the retention on logs.nginx?"
- **THEN** the agent calls `get_lifecycle_stats` (focused) rather than `get_stream` (which returns much more than needed)

### Requirement: Ambiguous stream name resolution
When a user refers to a stream by a partial or informal name (e.g. "nginx" instead of "logs.nginx", or "the android stream"), the agent SHALL attempt to resolve the name intelligently rather than immediately asking for clarification.

#### Scenario: User uses a partial stream name
- **WHEN** the user says "show me nginx" and the stream name is actually `logs.nginx`
- **THEN** the agent tries the likely full name (e.g. `logs.nginx`). If that fails, it calls `list_streams` to find matching names and asks the user to confirm which stream they meant.

#### Scenario: User uses an informal name
- **WHEN** the user says "the android stream" in a conversation where `logs.android` has been discussed
- **THEN** the agent resolves it from conversation context without asking for clarification
