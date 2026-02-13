## Why

The streams agent today is a capable command executor — it can list streams, set retention, create partitions, and run AI suggestions when users know what to ask for. But it falls short when users need guidance. Open-ended questions like "What do you recommend?", "How should I organize this stream?", or "My data quality is bad, help me fix it" expose a gap: the agent has **tools** but lacks **domain knowledge and reasoning frameworks** to compose them into advisory responses. This is the most common class of user intent that the agent fails to serve well.

## What Changes

- **New composite assessment tools** that gather multi-dimensional stream state (quality + schema + lifecycle + sample data) in a single tool call and return structured, scored results with identified issues — replacing the need for 4-5 sequential tool calls that the LLM must then synthesize ad-hoc
- **New domain knowledge framework** embedded in the system prompt, providing the agent with heuristics and best practices for retention policies, data quality diagnosis, stream onboarding sequences, and optimization recommendations — enabling it to reason about *what to do* with gathered data, not just *present* it
- **Enhanced advisory intent detection** in the agent's behavior instructions, so it recognizes open-ended and advisory questions and routes them to assessment tools and knowledge-guided workflows rather than individual read tools

## Capabilities

### New Capabilities

- `stream-assessment`: Composite tools for comprehensive stream evaluation — single-stream health assessment (quality score, schema completeness, retention appropriateness, processing coverage), data quality root-cause diagnosis (connecting metrics to causes to fixes), and cross-stream overview (scanning all streams to identify and prioritize issues). These tools bundle multiple internal API calls into a single tool invocation and return structured results with scoring and recommendations.
- `advisory-knowledge`: Domain knowledge and reasoning heuristics embedded in the system prompt for advisory responses — retention best practices by use case (security, application, debug logs), data quality diagnostic patterns (connecting degraded/failed metrics to root causes like unmapped fields, missing processors, type mismatches), stream onboarding guidance sequences (understand → organize → optimize), and optimization recommendations. This is the "expertise" layer that turns raw data into actionable advice.

### Modified Capabilities

- `agent-behavior`: Adding advisory intent detection — the agent must recognize open-ended questions ("What do you recommend?", "How should I organize this?", "Help me get started") and route them to composite assessment tools and advisory knowledge rather than falling back to individual read tools or asking the user to be more specific.

## Impact

- **streams_agent plugin** (`x-pack/platform/plugins/shared/streams_agent/`):
  - New composite tool files in `server/tools/` (health assessment, quality diagnosis, cross-stream overview)
  - New tool registrations in `register_tools.ts`
  - Significantly expanded system prompt in `register_streams_agent.ts` with domain knowledge sections
- **No changes to the agent builder** — all new functionality works within the existing agent registration and tool APIs
- **No changes to the streams plugin** — composite tools compose existing streams client APIs, no new endpoints needed
- **No new dependencies** — composite tools call the same scoped clients already used by existing tools
