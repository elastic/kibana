## MODIFIED Requirements

### Requirement: Tool selection heuristics
The agent's system instructions SHALL include guidance on selecting the appropriate tool based on the user's question:

- For an **advisory or open-ended question** ("what do you recommend?", "how's this stream doing?", "help me get started", "what should I focus on?") → the appropriate composite assessment tool (`assess_stream_health`, `diagnose_data_quality`, or `overview_streams`)
- For a **general overview** of a stream → `get_stream` (returns everything in one call)
- For a **specific aspect** (schema, quality, retention) → the focused tool (`get_schema`, `get_data_quality`, `get_lifecycle_stats`)
- For understanding **what data looks like** → `query_documents`
- For **comparing across streams** or discovering streams → `list_streams`

The agent SHALL NOT call multiple focused tools when a single `get_stream` call would answer the question, and SHALL NOT call `get_stream` when the user only asked about a specific aspect. The agent SHALL NOT fall back to individual read tools when the user asks an advisory question that a composite tool is designed to handle.

Advisory intent detection: the agent SHALL recognize the following question patterns as advisory and route to composite tools:
- Health/status check → `assess_stream_health`: "how is X doing?", "is X healthy?", "check on X", "anything wrong with X?"
- Quality troubleshooting → `diagnose_data_quality`: "data quality is bad", "help me fix quality", "why are docs degraded/failing?", "parsing errors"
- Cross-stream overview → `overview_streams`: "what do you recommend?", "which streams need attention?", "give me an overview", "what should I focus on?"
- Onboarding guidance → `assess_stream_health` (then guided workflow): "help me get started", "I just set up X", "now what?", "new data source"

#### Scenario: User asks a general question about a stream
- **WHEN** the user asks "tell me about logs.nginx"
- **THEN** the agent calls `get_stream` (one call) rather than calling `get_schema` + `get_data_quality` + `get_lifecycle_stats` separately

#### Scenario: User asks only about retention
- **WHEN** the user asks "what's the retention on logs.nginx?"
- **THEN** the agent calls `get_lifecycle_stats` (focused) rather than `get_stream` (which returns much more than needed)

#### Scenario: User asks an advisory question about a stream
- **WHEN** the user asks "how is logs.nginx doing?" or "is logs.nginx healthy?"
- **THEN** the agent calls `assess_stream_health` rather than `get_stream` or individual read tools

#### Scenario: User asks for general recommendations
- **WHEN** the user asks "what do you recommend?" or "which streams need attention?"
- **THEN** the agent calls `overview_streams` rather than `list_streams` followed by individual tool calls

#### Scenario: User reports a quality problem
- **WHEN** the user asks "my data quality is bad on logs.payments" or "why are documents degraded?"
- **THEN** the agent calls `diagnose_data_quality` rather than calling `get_data_quality` alone

#### Scenario: User asks for onboarding help
- **WHEN** the user asks "I just set up logs.myapp, help me get started"
- **THEN** the agent calls `assess_stream_health` first, then follows the onboarding guidance workflow based on the results
