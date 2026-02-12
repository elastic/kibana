## Why

Streams provides powerful capabilities for managing data streams — partitioning, processing, retention, schema mapping, data quality monitoring, and AI-assisted workflows — but using them requires navigating multiple tabs and understanding how features interconnect. Users need a conversational interface that lets them query stream state, carry out management tasks, and orchestrate multi-step AI workflows through natural language. By registering a "Streams Agent" in the Agent Builder framework, we get the chat UI, conversation persistence, tool calling, and message history for free, and can focus on building the Streams-specific tools and agent instructions.

## What Changes

- Register a new "Streams Agent" in Agent Builder with Streams-specific instructions and tools. The agent is accessible through the Agent Builder chat UI — no custom chat component is needed.
- Define Streams-specific tools that the agent can call to query and modify streams. These tools call existing Streams APIs (both public and internal) under the hood.
- The agent supports natural language querying of stream state: listing streams, inspecting hierarchy, checking retention, storage, schema, data quality, processors, and partitions.
- The agent supports stream mutations through a preview-confirm-apply cycle: setting retention, creating partitions, adding processors, mapping fields, enabling failure stores, updating descriptions, and deleting streams. Every mutation is previewed before the user confirms.
- The agent wraps existing Streams AI features (partition suggestions, processing pipeline suggestions, grok/dissect pattern generation, feature/system identification) into conversational workflows with multi-step reasoning, rather than reimplementing them.
- The agent maintains conversational context — when a user discusses a specific stream, follow-up questions implicitly refer to it without requiring the user to repeat the stream name. This is a behavioral requirement enforced through agent instructions; Agent Builder's built-in conversation history provides the underlying mechanism.

## Capabilities

### New Capabilities
- `stream-querying`: Natural language read operations — listing streams, inspecting stream details (retention, storage, processors, schema, partitions, data quality), querying sample documents from a stream, and cross-stream analysis (e.g. "which streams have data quality issues?"). Implemented as Agent Builder tools that call existing Streams APIs.
- `stream-management`: Natural language write operations with a preview-confirm-apply cycle — setting retention, creating/deleting partitions, adding/editing processors, mapping fields, enabling failure stores, and updating stream descriptions. Implemented as Agent Builder tools with confirmation steps before applying mutations.
- `ai-orchestration`: Conversational orchestration of existing Streams AI endpoints — partition suggestions, processing pipeline suggestions, grok/dissect pattern generation, feature/system identification, and description generation — exposed as Agent Builder tools that the agent can chain into multi-step workflows (e.g. "onboard this new application" triggers partitioning, then processing, then retention setup).
- `agent-behavior`: Cross-cutting behavioral requirements for the agent — response formatting, tool selection heuristics, conversational context tracking, ambiguous stream name resolution, error handling, and next-step suggestions. These apply across all capabilities and are enforced through the agent's system instructions.

### Modified Capabilities

_(none — this is an additive feature that wraps existing APIs without modifying them)_

## Impact

- **New plugin**: A new `streams_agent` plugin at `x-pack/platform/plugins/shared/streams_agent/`, alongside the existing `streams/` and `streams_app/` plugins. Contains the agent definition, tool registrations, and tool handler implementations.
- **Agent registration**: A new `streams.agent` registered with Agent Builder, with domain-specific instructions and tool selection. Requires updates to Agent Builder allow lists (`allow_lists.ts`) and namespaces.
- **Tool registration**: New Streams-scoped tools (e.g. `streams.list_streams`, `streams.get_stream`, `streams.query_documents`, `streams.set_retention`, `streams.suggest_partitions`, etc.) registered via `agentBuilder.tools.register()`.
- **Dependencies**: The `streams_agent` plugin depends on the Streams plugin (for `StreamsService`/`StreamsClient`) and the Agent Builder plugin (for agent/tool registration). Requires an LLM connector for the agent's reasoning.
- **Existing Streams APIs**: No modifications needed. Tools are consumers of existing `StreamsClient` methods obtained via the Streams plugin's start contract.
