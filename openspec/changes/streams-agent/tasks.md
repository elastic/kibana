## 1. Plugin Scaffolding & Agent Registration

- [x] 1.1 Create the `streams_agent` plugin at `x-pack/platform/plugins/shared/streams_agent/` with `kibana.jsonc`, `tsconfig.json`, and plugin class
- [x] 1.2 Declare plugin dependencies on Streams plugin and Agent Builder plugin in `kibana.jsonc`
- [x] 1.3 Add `streams` namespace to Agent Builder's `namespaces.ts`
- [x] 1.4 Add `streams.agent` to Agent Builder's `allow_lists.ts` (`AGENT_BUILDER_BUILTIN_AGENTS`)
- [x] 1.5 Register the agent definition in the plugin's `setup()` with name, description, avatar, and instructions
- [x] 1.6 Write agent system instructions covering: Streams specialist role, conversational context tracking, preview-confirm-apply protocol, next-step suggestions, and scope boundaries

## 2. Read Tools (stream-querying)

- [x] 2.1 Create helper to obtain a scoped `StreamsClient` from the Agent Builder tool handler context using `StreamsService.createClient(request)`
- [x] 2.2 Implement `streams.list_streams` tool — returns all streams with name, type, quality status, and storage size
- [x] 2.3 Implement `streams.get_stream` tool — returns full stream configuration (retention, storage, ingestion, processors, partitions, schema, data quality, features/systems)
- [x] 2.4 Implement `streams.get_data_quality` tool — returns degraded/failed doc counts, quality score, failure store status
- [x] 2.5 Implement `streams.get_schema` tool — returns mapped fields with types, unmapped fields, inherited fields
- [x] 2.6 Implement `streams.get_lifecycle_stats` tool — returns retention policy, ILM phase breakdown, data tier distribution
- [x] 2.7 Implement `streams.query_documents` tool — returns recent sample documents sorted by `@timestamp` desc, with optional count (default 20) and optional time range (no time filter by default)
- [x] 2.8 Add all read tool IDs to Agent Builder's `allow_lists.ts` (`AGENT_BUILDER_BUILTIN_TOOLS`)
- [x] 2.9 Add read tool IDs to the agent's `configuration.tools` list

## 3. Write Tools (stream-management)

- [x] 3.1 Implement `streams.set_retention` tool — updates retention (specific period, ILM policy, or inherit) with confirmation
- [x] 3.2 Implement `streams.fork_stream` tool — creates a child stream with routing condition, with confirmation
- [x] 3.3 Implement `streams.delete_stream` tool — deletes a stream, with confirmation
- [x] 3.4 Implement `streams.update_processors` tool — adds/edits/removes processors, with confirmation
- [x] 3.5 Implement `streams.map_fields` tool — updates field mappings, with confirmation
- [x] 3.6 Implement `streams.enable_failure_store` tool — enables/disables failure store, with confirmation
- [x] 3.7 Implement `streams.update_settings` tool — updates description and routing configuration, with confirmation
- [x] 3.8 Add all write tool IDs to Agent Builder's allow lists and agent tool configuration

## 4. AI Orchestration Tools

- [x] 4.1 Implement `streams.suggest_partitions` tool — calls `partitionStream` from `@kbn/streams-ai`, returns suggested partitions with names and conditions
- [ ] 4.2 Implement `streams.suggest_processing_pipeline` tool — requires simulation infrastructure; deferred to follow-up
- [ ] 4.3 Implement `streams.suggest_grok_patterns` tool — requires client-side heuristic input; deferred to follow-up
- [ ] 4.4 Implement `streams.suggest_dissect_patterns` tool — requires client-side heuristic input; deferred to follow-up
- [x] 4.5 Implement `streams.identify_features` tool — calls `identifyFeatures` from `@kbn/streams-ai`, returns detected features
- [x] 4.6 Implement `streams.identify_systems` tool — calls `identifySystems` from `@kbn/streams-ai`, returns detected systems
- [x] 4.7 Implement `streams.generate_description` tool — calls `generateStreamDescription` from `@kbn/streams-ai`, returns generated description
- [x] 4.8 Add all AI tool IDs to Agent Builder's allow lists and agent tool configuration
- [x] 4.9 Make `startMs`/`endMs` optional on all AI tools, defaulting to last 24 hours via `Date.now()` server-side
- [x] 4.10 Use `context.modelProvider.getDefaultModel()` for connector resolution instead of `connectorId` parameter

## 5. Integration & Testing

- [ ] 5.1 Verify the agent appears in Agent Builder's agent selector UI
- [ ] 5.2 Test read tool workflows end-to-end (list streams, get detail, follow-up questions)
- [ ] 5.3 Test write tool workflows end-to-end (set retention, create partition, add processor — verify preview-confirm-apply cycle)
- [ ] 5.4 Test AI orchestration workflows (suggest partitions → accept → create partitions)
- [ ] 5.5 Test conversational context tracking (ask about a stream, then ask follow-up without naming it)
- [ ] 5.6 Test permission scoping (verify tools respect the user's Streams/ES permissions)
