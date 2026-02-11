## ADDED Requirements

### Requirement: List all streams
The agent SHALL provide a tool `streams.list_streams` that returns all streams the user has access to, including each stream's name, type (wired/classic), data quality status, and storage size.

#### Scenario: User asks what streams exist
- **WHEN** the user asks "what streams do I have?" or similar
- **THEN** the agent calls `streams.list_streams` and presents a summary of all streams with name, type, quality status, and storage size

#### Scenario: User asks for streams with data quality issues
- **WHEN** the user asks "which streams have data quality issues?"
- **THEN** the agent calls `streams.list_streams`, filters results to streams with degraded or poor quality status, and presents the filtered list with quality details

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

### Requirement: Get lifecycle stats
The agent SHALL provide a tool `streams.get_lifecycle_stats` that accepts a stream name and returns the retention policy (type, value, source), ILM phase breakdown, and data tier distribution.

#### Scenario: User asks about retention
- **WHEN** the user asks "what's the retention on logs.nginx?"
- **THEN** the agent calls `streams.get_lifecycle_stats` and presents the retention policy, whether it's inherited or set directly, and storage breakdown by tier

### Requirement: Cross-stream storage analysis
The agent SHALL be able to answer questions about storage usage across multiple streams by combining data from `streams.list_streams` and `streams.get_lifecycle_stats`.

#### Scenario: User asks which streams use the most storage
- **WHEN** the user asks "which streams are using the most storage?"
- **THEN** the agent calls `streams.list_streams`, sorts by storage size, and presents the top streams with storage size, ingestion rate, and retention policy so the user can identify optimization opportunities
