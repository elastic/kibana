## Requirements

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

### Requirement: Ambiguous stream name resolution
When a user refers to a stream by a partial or informal name (e.g. "nginx" instead of "logs.nginx", or "the android stream"), the agent SHALL attempt to resolve the name intelligently rather than immediately asking for clarification.

#### Scenario: User uses a partial stream name
- **WHEN** the user says "show me nginx" and the stream name is actually `logs.nginx`
- **THEN** the agent tries the likely full name (e.g. `logs.nginx`). If that fails, it calls `list_streams` to find matching names and asks the user to confirm which stream they meant.

#### Scenario: User uses an informal name
- **WHEN** the user says "the android stream" in a conversation where `logs.android` has been discussed
- **THEN** the agent resolves it from conversation context without asking for clarification

### Requirement: Error handling for failed operations
When a tool call fails, the agent SHALL handle the error gracefully:
1. Report the error clearly to the user — include the stream name and what the agent was trying to do
2. If the likely cause is known, explain it briefly (e.g. "the stream may not exist", "a lock conflict occurred — another operation may be in progress", "insufficient permissions")
3. Suggest a next step: retry, try a different approach, or ask the user for guidance

The agent SHALL NOT silently retry failed operations. The agent SHALL NOT give generic "something went wrong" errors when the tool returns a specific error message.

#### Scenario: Write tool fails with lock conflict
- **WHEN** a write tool fails with a lock conflict error
- **THEN** the agent explains that another operation may be modifying the stream concurrently, and offers to retry after a moment

#### Scenario: Tool fails because stream does not exist
- **WHEN** a tool fails because the specified stream name does not exist
- **THEN** the agent tells the user the stream was not found, suggests checking the name, and offers to call `list_streams` to find available streams

#### Scenario: Tool fails with permission error
- **WHEN** a tool fails because the user lacks the required permissions
- **THEN** the agent explains that the operation requires additional permissions and suggests the user contact their administrator

### Requirement: Conversational context tracking
When the user mentions a specific stream by name, the agent SHALL remember it for the duration of the conversation. If follow-up questions do not specify a stream name, the agent SHALL assume they refer to the most recently discussed stream. If the reference is ambiguous (e.g. multiple streams discussed recently), the agent SHALL ask for clarification.

#### Scenario: Follow-up question about a previously mentioned stream
- **WHEN** the user previously asked about `logs.nginx` and then asks "what processors does it have?"
- **THEN** the agent uses conversation history to resolve "it" to `logs.nginx` and answers the question without asking for clarification

### Requirement: Next-step suggestions
After completing an operation, the agent SHALL briefly suggest one or two logical follow-up actions relevant to what was just done. Suggestions SHALL be concise (one sentence, not a menu).

#### Scenario: After creating partitions
- **WHEN** the agent finishes creating partitions for a stream
- **THEN** the agent suggests a natural follow-up such as setting up field extraction or configuring retention for the new streams

#### Scenario: After identifying data quality issues
- **WHEN** the agent presents data quality problems
- **THEN** the agent suggests specific corrective actions (e.g. add processors, fix mappings, enable failure store)
