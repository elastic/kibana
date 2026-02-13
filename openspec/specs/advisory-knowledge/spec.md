## Requirements

### Requirement: Health assessment interpretation guidance
The agent's system instructions SHALL include a `<health_assessment>` section that provides interpretation guidance for `assess_stream_health` results. The section SHALL include:
- Intent triggers that indicate when to use this tool (e.g., "how's my stream", "is this stream healthy", "check on", "stream status", "anything wrong")
- Instructions to prioritize critical issues first, then warnings
- Instructions to suggest fixing the top issue and offer to execute the fix via the appropriate write tool
- Instructions to present the health grade prominently, followed by issues as a prioritized list

#### Scenario: Agent interprets a critical health assessment
- **WHEN** the agent receives an `assess_stream_health` result with `overallHealth: "critical"` and two critical issues
- **THEN** the agent presents the critical grade, explains each issue in plain language, and offers to fix the highest-impact issue first

#### Scenario: Agent interprets a healthy assessment
- **WHEN** the agent receives an `assess_stream_health` result with `overallHealth: "healthy"` and no issues
- **THEN** the agent confirms the stream is healthy and suggests a follow-up (e.g., "looks good — want me to check another stream?")

### Requirement: Quality troubleshooting interpretation guidance
The agent's system instructions SHALL include a `<quality_troubleshooting>` section that provides interpretation guidance for `diagnose_data_quality` results. The section SHALL include:
- Intent triggers (e.g., "data quality is bad", "parsing errors", "degraded documents", "why are docs failing", "help me fix quality")
- Instructions to explain each root cause in plain language, connecting the technical diagnosis to what the user should do
- A mapping from root cause types to fix actions:
  - Unmapped fields → suggest `map_fields` with the specific field names
  - Missing processors → suggest `update_processors`
  - Failure store disabled with failures → suggest `enable_failure_store`
  - Mixed data shapes → suggest partitioning via `fork_stream`
- Instructions to offer applying each fix following the existing preview-confirm-apply cycle

#### Scenario: Agent explains unmapped fields root cause
- **WHEN** the diagnosis identifies unmapped fields as a root cause of degradation
- **THEN** the agent explains in plain language (e.g., "12 fields in your data aren't mapped yet, which causes documents to be marked as degraded") and offers to map the most common ones

#### Scenario: Agent connects diagnosis to action
- **WHEN** the diagnosis identifies multiple root causes with different fix tools
- **THEN** the agent presents them in impact order and offers to fix each one, using the appropriate write tool via preview-confirm-apply

### Requirement: Stream overview interpretation guidance
The agent's system instructions SHALL include a `<stream_overview>` section that provides interpretation guidance for `overview_streams` results. The section SHALL include:
- Intent triggers (e.g., "what do you recommend", "which streams need attention", "give me an overview", "summary of all streams", "what should I focus on")
- Instructions to present streams ranked by urgency (critical issues first)
- Instructions to highlight the top 3-5 issues across all streams
- Instructions to offer drilling into the worst-performing stream for detailed assessment
- Instructions to handle truncated results by noting how many streams were assessed out of the total

#### Scenario: Agent presents cross-stream overview
- **WHEN** the agent receives an `overview_streams` result with 3 streams having issues
- **THEN** the agent presents the streams ranked by urgency, highlights the top issues, and offers to drill into the most problematic stream

#### Scenario: Agent handles truncated results
- **WHEN** the `overview_streams` result has `truncated: true` with 120 total streams and 50 assessed
- **THEN** the agent notes that 50 of 120 streams were assessed and suggests that additional streams may also need attention

### Requirement: Onboarding guidance workflow
The agent's system instructions SHALL include an `<onboarding_guidance>` section that provides a guided workflow for users setting up a new or unconfigured stream. The section SHALL include:
- Intent triggers (e.g., "just set up", "new data source", "help me get started", "now what", "I just started sending data")
- A three-phase guidance sequence:
  1. **Understand**: Call `assess_stream_health` to understand the current state, then call `query_documents` to see sample data
  2. **Organize**: Based on the assessment, suggest partitioning (if multiple data types detected), field mapping (if unmapped fields found), and processing (if raw unstructured data)
  3. **Optimize**: Suggest retention configuration, failure store enablement, and a description for the stream
- Instructions to adapt the sequence based on what the assessment reveals (skip phases that aren't needed)
- Instructions to guide the user through each phase conversationally, not dump all suggestions at once

#### Scenario: User onboarding a new stream
- **WHEN** the user asks "I just started sending app logs to logs.myapp, help me set it up"
- **THEN** the agent calls `assess_stream_health` first, then presents the current state and walks through the understand → organize → optimize sequence based on what it finds

#### Scenario: Stream already well-configured
- **WHEN** the health assessment shows the stream is already healthy with configured retention and mapped fields
- **THEN** the agent skips unnecessary phases and confirms the stream is well set up, suggesting only minor improvements if any

#### Scenario: Stream with multiple issues
- **WHEN** the health assessment reveals unmapped fields, no retention, and no processors
- **THEN** the agent guides the user through all three phases, addressing the most impactful issues first

### Requirement: Retention best practices knowledge
The agent's system instructions SHALL include a `<retention_best_practices>` section containing domain knowledge about data retention. The section SHALL include:
- Common retention periods by data type:
  - Security/compliance logs: 90–365 days
  - Application logs: 7–30 days
  - Debug/verbose logs: 1–7 days
  - Metrics: 30–90 days
  - Audit logs: 365+ days
- Guidance on choosing between retention types (DSL data retention vs ILM policy vs inherited)
- Tiering strategies: when to consider hot → warm → cold → frozen transitions
- Cost implications: shorter retention reduces storage costs; tiering moves data to cheaper storage without deleting it
- Instructions to ask about the user's use case before recommending a specific retention period

#### Scenario: User asks what retention to set
- **WHEN** the user asks "what retention should I use for logs.nginx?"
- **THEN** the agent asks about the use case (operational monitoring, security, compliance), then recommends a specific retention period with rationale based on the best practices knowledge

#### Scenario: User asks about reducing storage costs
- **WHEN** the user asks "how can I reduce storage costs?"
- **THEN** the agent calls `overview_streams` to identify the largest streams, then uses retention best practices to recommend retention adjustments or tiering strategies for the highest-storage streams

### Requirement: Response formatting for assessment results
The agent's system instructions SHALL include formatting guidance for composite assessment tool results:
- **Health assessment**: Present as a grade header (e.g., "Health: Warning"), followed by issues as a bulleted list with severity indicators, followed by a one-line offer to fix the top issue
- **Quality diagnosis**: Present root causes as a numbered list, each with a plain-language explanation and the recommended fix action
- **Stream overview**: Present as a table or ranked list showing stream name, quality score, storage size, and top issue per stream

#### Scenario: Agent formats health assessment results
- **WHEN** the agent presents results from `assess_stream_health`
- **THEN** it uses the structured format (grade header + issue list + fix offer) rather than narrating the results as prose

#### Scenario: Agent formats overview results
- **WHEN** the agent presents results from `overview_streams`
- **THEN** it uses a ranked list or table format showing each stream's status at a glance
