## ADDED Requirements

### Requirement: AI tool time ranges default to last 24 hours
All AI orchestration tools that accept time range parameters (`startMs`, `endMs`) SHALL make those parameters optional. When omitted, the tool SHALL default to the last 24 hours using `Date.now()` server-side. This prevents the agent from hallucinating incorrect Unix timestamps.

### Requirement: AI tool time ranges must be accurate when available
When the agent has already queried documents from a stream (via `streams.query_documents`) and knows the actual time range of the data, it MUST pass those timestamps as `startMs`/`endMs` to subsequent AI tool calls. The 24-hour server-side default is a safety net for cases where the agent has no prior knowledge, not a substitute for accurate values. If the agent has not yet queried documents and is about to call an AI tool, it MUST call `query_documents` first to discover the actual time range.

#### Scenario: Agent uses known time range for AI tool
- **WHEN** the agent has previously called `query_documents` and observed data spanning a specific time range
- **AND** the user asks for an AI operation (e.g. "suggest partitions")
- **THEN** the agent passes the observed `startMs`/`endMs` to the AI tool, ensuring the AI analyzes actual data rather than an empty 24-hour window

#### Scenario: Agent discovers time range before AI tool
- **WHEN** the user asks for an AI operation and no documents have been queried yet
- **THEN** the agent calls `query_documents` first, extracts the time range from the results, and passes it to the AI tool

### Requirement: AI tool connector from execution context
All AI orchestration tools SHALL obtain the LLM connector from the Agent Builder tool context (`context.modelProvider.getDefaultModel()`) rather than accepting a `connectorId` parameter. This ensures the tools always use the same connector the agent is running on, without requiring the LLM to know or pass connector IDs.

### Requirement: Suggest partitions
The agent SHALL provide a tool `streams.suggest_partitions` that accepts a stream name and an optional user hint, invokes the existing partition suggestion AI endpoint, and returns the suggested partitions with their names and routing conditions. Time range parameters are optional (default: last 24 hours).

#### Scenario: User asks for help organizing logs
- **WHEN** the user asks "help me organize logs" or "suggest partitions for logs"
- **THEN** the agent calls `streams.suggest_partitions`, presents the suggested partitions (name, condition, estimated traffic percentage), and asks the user which to accept, reject, or modify

#### Scenario: User provides guidance for partitioning
- **WHEN** the user asks "suggest partitions for logs, I want to separate by service"
- **THEN** the agent passes the user hint to the partition suggestion endpoint and presents the results

#### Scenario: User accepts suggested partitions
- **WHEN** the user accepts one or more suggested partitions
- **THEN** the agent calls `streams.fork_stream` for each accepted partition following the preview-confirm-apply cycle

### Requirement: Suggest processing pipeline
The agent SHALL provide a tool `streams.suggest_processing_pipeline` that accepts a stream name and invokes the existing processing pipeline suggestion AI endpoint, returning the suggested processors.

#### Scenario: User asks for help extracting fields
- **WHEN** the user asks "help me extract fields from logs.nginx" or "suggest a processing pipeline for logs.nginx"
- **THEN** the agent calls `streams.suggest_processing_pipeline`, presents the suggested processors (type, source field, patterns/config, expected success rate), and asks the user which to accept

#### Scenario: User accepts suggested pipeline
- **WHEN** the user accepts a suggested processing pipeline
- **THEN** the agent calls `streams.update_processors` to apply the pipeline following the preview-confirm-apply cycle

### Requirement: Suggest grok patterns
The agent SHALL provide a tool `streams.suggest_grok_patterns` that accepts a stream name and a source field, invokes the existing grok suggestion AI endpoint, and returns suggested grok patterns.

#### Scenario: User asks for grok pattern help
- **WHEN** the user asks "generate a grok pattern for the message field in logs.apache"
- **THEN** the agent calls `streams.suggest_grok_patterns` and presents the suggested patterns with example matches

### Requirement: Suggest dissect patterns
The agent SHALL provide a tool `streams.suggest_dissect_patterns` that accepts a stream name and a source field, invokes the existing dissect suggestion AI endpoint, and returns suggested dissect patterns.

#### Scenario: User asks for dissect pattern help
- **WHEN** the user asks "generate a dissect pattern for logs.syslog"
- **THEN** the agent calls `streams.suggest_dissect_patterns` and presents the suggested patterns with example matches

### Requirement: Identify features
The agent SHALL provide a tool `streams.identify_features` that accepts a stream name and invokes the existing feature identification AI endpoint, returning the detected features (technologies, versions, descriptions).

#### Scenario: User asks what is in a stream
- **WHEN** the user asks "what technologies are present in logs?" or "identify features in logs.k8s"
- **THEN** the agent calls `streams.identify_features` and presents the detected features with descriptions and filters

### Requirement: Identify systems
The agent SHALL provide a tool `streams.identify_systems` that accepts a stream name and invokes the existing system identification AI endpoint, returning the detected systems with routing conditions.

#### Scenario: User asks what systems are in a stream
- **WHEN** the user asks "what systems are sending data to logs?"
- **THEN** the agent calls `streams.identify_systems` and presents the detected systems with descriptions and conditions

### Requirement: Generate stream description
The agent SHALL provide a tool `streams.generate_description` that accepts a stream name and invokes the existing description generation AI endpoint, returning a natural language description of the stream's data.

#### Scenario: User asks to describe a stream
- **WHEN** the user asks "describe what's in logs.k8s" or "generate a description for logs.nginx"
- **THEN** the agent calls `streams.generate_description` and presents the generated description, offering to save it to the stream's configuration

### Requirement: Multi-step AI workflow orchestration
The agent SHALL be able to chain multiple AI tools and management tools into multi-step workflows, guided by conversational context and user direction.

#### Scenario: Onboard a new application end-to-end
- **WHEN** the user asks "I just started sending application logs to logs, help me set it up"
- **THEN** the agent orchestrates a multi-step workflow: first suggests partitions, then after the user accepts partitions, suggests processing pipelines for the new child streams, then offers to configure retention — each step following the preview-confirm-apply cycle

#### Scenario: Diagnose and fix data quality issues
- **WHEN** the user asks "something seems wrong with logs.payments, help me fix it"
- **THEN** the agent retrieves data quality metrics, identifies the root causes (mapping conflicts, pipeline failures), and suggests corrective actions (add processors, fix mappings, enable failure store) — each action following the preview-confirm-apply cycle
