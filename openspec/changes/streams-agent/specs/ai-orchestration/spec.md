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
The agent SHALL be able to chain multiple AI tools and management tools into multi-step workflows, guided by conversational context and user direction. The agent's system instructions SHALL include at least one complete few-shot example of a multi-step workflow to provide a concrete template for complex orchestration.

The general pattern for multi-step workflows is:
1. **Inspect** — Query data and/or gather stream details to understand current state
2. **Analyze** — Call AI tools (with accurate time ranges from step 1) to get suggestions
3. **Present** — Show suggestions to the user and ask which to accept
4. **Apply** — Execute accepted changes one at a time via write tools, following preview-confirm-apply
5. **Follow up** — Suggest logical next steps

#### Scenario: Onboard a new application end-to-end
- **WHEN** the user asks "I just started sending application logs to logs, help me set it up"
- **THEN** the agent orchestrates:
  1. Calls `query_documents` to inspect the data and determine the time range
  2. Calls `suggest_partitions` with accurate `startMs`/`endMs` to suggest how to organize the stream
  3. Presents the suggestions and asks which to accept
  4. After confirmation, calls `fork_stream` for each accepted partition (one at a time)
  5. Suggests follow-up actions (set up field extraction, configure retention)

#### Scenario: Diagnose and fix data quality issues
- **WHEN** the user asks "something seems wrong with logs.payments, help me fix it"
- **THEN** the agent orchestrates:
  1. Calls `get_data_quality` to retrieve metrics
  2. Calls `get_schema` to check for mapping issues
  3. Calls `query_documents` to inspect recent data for patterns
  4. Presents a diagnosis with specific root causes
  5. Suggests corrective actions (add processors, fix mappings, enable failure store) — each following preview-confirm-apply

#### Scenario: Help organize a stream (complete example)
- **WHEN** the user asks "help me set up logs.android"
- **THEN** the agent follows this flow:
  - Agent: [calls `query_documents`] "Here's what logs.android contains: [chronological list]. I can see 3 distinct processes. Want me to suggest how to partition this stream?"
  - User: "Yes"
  - Agent: [calls `suggest_partitions` with `startMs`/`endMs` from the query results] "Here are the suggested partitions: [numbered list with conditions]. Want me to create them?"
  - User: "Yes, create all 3"
  - Agent: "I'll create these 3 partitions one at a time: [list]. Shall I proceed?"
  - User: "Go ahead"
  - Agent: [calls `fork_stream` #1] "Created logs.android.android-phone ✓"
  - Agent: [calls `fork_stream` #2] "Created logs.android.android-systemui ✓"
  - Agent: [calls `fork_stream` #3] "Created logs.android.tencent-qt-qtl ✓"
  - Agent: "All 3 partitions created. You might want to set up field extraction for these new streams, or configure their retention policies."
