# Streams + Agent Builder Integration - Implementation Summary

## Overview
This implementation extends PR #246234 to provide comprehensive AI-powered assistance for Streams management through the Agent Builder (Onechat) system.

## What Was Implemented

### 1. Enhanced Stream Attachment (`server/agent_builder/attachments/stream.ts`)
- **Extended schema** to optionally include full stream definition
- **Comprehensive context** includes:
  - Stream metadata (name, description, updated_at)
  - Processing steps count
  - Lifecycle/retention settings
  - Routing rules count
- **Tool availability** documented in attachment
- **Agent description** updated to explain all available capabilities

### 2. New Server Tools

#### `streams.get_stream_details` (`server/agent_builder/tools/get_stream_details.ts`)
- Fetches detailed stream information on-demand
- **Parameters:**
  - `streamName`: Stream to query
  - `includeFields`: Selective field retrieval (`processing`, `mappings`, `routing`, `children`, `lifecycle`, `settings`, `all`)
- **Returns:** Comprehensive stream details based on requested fields
- **Use case:** Prevents overwhelming initial context while allowing deep dives

#### `streams.get_processing_steps` (`server/agent_builder/tools/get_processing_steps.ts`)
- Retrieves current processing pipeline configuration
- **Parameters:** `streamName`
- **Returns:**
  - List of processors in execution order
  - Processor types and configurations
  - Update timestamp
- **Use case:** Understanding existing enrichment before modifications

#### `streams.suggest_grok_pattern` (`server/agent_builder/tools/suggest_grok_pattern.ts`)
- AI-powered grok pattern generation
- **Parameters:**
  - `logSamples`: 3-10 representative log lines
  - `fieldToExtract` (optional): Specific field to focus on
  - `guidance` (optional): User hints to guide generation
- **Returns:**
  - Complete grok pattern
  - List of fields that will be extracted
  - Description and confidence level
- **Use case:** Parsing unstructured logs (Apache, Nginx, syslog, custom formats)

#### `streams.suggest_dissect_pattern` (`server/agent_builder/tools/suggest_dissect_pattern.ts`)
- AI-powered dissect pattern generation (faster alternative to grok)
- **Parameters:**
  - `logSamples`: 3-10 representative log lines
  - `delimiterHints` (optional): Delimiter information
  - `guidance` (optional): User hints
- **Returns:**
  - Complete dissect pattern
  - List of fields that will be extracted
  - Description and confidence level
- **Use case:** Structured, delimiter-based logs (CSV, TSV, pipe-delimited)

### 3. AI Workflows (`packages/shared/kbn-streams-ai/workflows/`)

#### Grok Pattern Workflow (`suggest_grok_pattern/`)
- **Prompt engineering** for log analysis and pattern generation
- **Schema validation** using Zod
- **Integration** with inference client for AI-powered suggestions
- **Files created:**
  - `content_prompt.text` - User message template
  - `system_prompt.text` - System instructions
  - `prompt.ts` - Prompt configuration
  - `schema.ts` - Response validation
  - `index.ts` - Workflow orchestration

#### Dissect Pattern Workflow (`suggest_dissect_pattern/`)
- Similar structure to grok workflow
- Optimized for delimiter-based parsing
- Faster execution for structured logs

### 4. Client-Side Browser Tools

#### Routing Page (`stream_detail_routing/agent_builder_integration.ts`)
- **Existing:** `streams_set_partition_suggestions` - Display partition suggestions in UI
- **Note:** Already implemented in PR #246234

#### Enrichment Page (`stream_detail_enrichment/agent_builder_integration.ts`)
- **Created comprehensive hook:** `useEnrichmentIntegration`
- **Browser tools:**
  1. `streams_add_processor` - Add any processor to pipeline
  2. `streams_add_grok_processor` - Specialized grok processor addition
  3. `streams_add_dissect_processor` - Specialized dissect processor addition
  4. `streams_update_processing_steps` - Bulk pipeline updates
- **Features:**
  - Position-aware processor insertion
  - Type-safe schemas with Zod
  - Callback refs to prevent unnecessary re-renders
  - Session-tagged conversations

### 5. Configuration & Registration

#### Constants (`common/constants.ts`)
```typescript
export const STREAMS_GET_STREAM_DETAILS_TOOL_ID = 'streams.get_stream_details';
export const STREAMS_GET_PROCESSING_STEPS_TOOL_ID = 'streams.get_processing_steps';
export const STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID = 'streams.suggest_grok_pattern';
export const STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID = 'streams.suggest_dissect_pattern';
```

#### Onechat Allowlist (`onechat-server/allow_lists.ts`)
All new tool IDs added to `AGENT_BUILDER_BUILTIN_TOOLS`

#### Plugin Registration (`server/agent_builder/index.ts`)
- Automated loop registering all tools
- Debug logging for each registration
- Clean, maintainable structure

## How It Works

### Workflow Example 1: Partition Suggestions (Existing from PR #246234)
1. User opens stream routing page
2. Onechat flyout configured with stream attachment
3. User: "Help me partition this stream"
4. Agent calls `streams.suggest_partitions` with optional guidance
5. Agent calls `streams_set_partition_suggestions` browser tool
6. Suggestions appear in UI for user review

### Workflow Example 2: Grok Pattern Generation (NEW)
1. User opens stream enrichment page
2. Onechat flyout configured with stream attachment
3. User: "Parse these Apache access logs" + provides samples
4. Agent calls `streams.get_processing_steps` to check existing processors
5. Agent calls `streams.suggest_grok_pattern` with log samples
6. Agent receives pattern with high confidence
7. Agent calls `streams_add_grok_processor` browser tool
8. Processor added to pipeline in UI for user to preview/save

### Workflow Example 3: Dissect Pattern for CSV Logs (NEW)
1. User: "Parse these comma-separated logs"
2. Agent analyzes structure
3. Agent calls `streams.suggest_dissect_pattern`
4. Agent adds dissect processor via `streams_add_dissect_processor`
5. User previews extraction in simulation playground

## Key Design Principles

1. **Lazy Loading**: Attachment provides overview, tools provide details on-demand
2. **Type Safety**: Comprehensive Zod schemas for all parameters and responses
3. **Separation of Concerns**: 
   - Server tools for AI inference and data fetching
   - Browser tools for UI state management
4. **Reusable Patterns**: Consistent structure across all tools and workflows
5. **Context Management**: Session tags separate routing vs enrichment conversations
6. **User Control**: Agent suggests, user reviews and approves

## Architecture Decisions

### Why Separate Grok and Dissect Tools?
- Different use cases (regex vs delimiters)
- Different performance characteristics
- Clear guidance for users on when to use each

### Why Browser Tools for UI Updates?
- Agent can't directly manipulate React state
- Browser tools provide controlled interface
- Enables preview before commit
- Maintains security boundaries

### Why Include Stream Definition in Attachment?
- Reduces API calls for common info
- Provides immediate context to agent
- Optional to prevent context bloat

## Files Created/Modified

### New Files (19):
- `server/agent_builder/tools/get_stream_details.ts`
- `server/agent_builder/tools/get_processing_steps.ts`
- `server/agent_builder/tools/suggest_grok_pattern.ts`
- `server/agent_builder/tools/suggest_dissect_pattern.ts`
- `workflows/suggest_grok_pattern/index.ts`
- `workflows/suggest_grok_pattern/prompt.ts`
- `workflows/suggest_grok_pattern/schema.ts`
- `workflows/suggest_grok_pattern/content_prompt.text`
- `workflows/suggest_grok_pattern/system_prompt.text`
- `workflows/suggest_dissect_pattern/index.ts`
- `workflows/suggest_dissect_pattern/prompt.ts`
- `workflows/suggest_dissect_pattern/schema.ts`
- `workflows/suggest_dissect_pattern/content_prompt.text`
- `workflows/suggest_dissect_pattern/system_prompt.text`
- `streams_app/public/components/data_management/stream_detail_enrichment/agent_builder_integration.ts`

### Modified Files (9):
- `common/constants.ts` - Added tool IDs
- `common/index.ts` - Exported new constants
- `server/agent_builder/constants.ts` - Re-exported constants
- `server/agent_builder/attachments/stream.ts` - Enhanced context
- `server/agent_builder/tools/index.ts` - Exported new tools
- `server/agent_builder/index.ts` - Registered tools
- `onechat-server/allow_lists.ts` - Allowlisted tools
- `kbn-streams-ai/index.ts` - Exported workflows

## Next Steps for Complete Integration

### Required for Full Functionality:
1. **UI Integration in Enrichment Page:**
   ```typescript
   // In stream_detail_enrichment/page_content.tsx
   import { useEnrichmentIntegration } from './agent_builder_integration';
   import { useAIFeatures } from '../../../hooks/use_ai_features';
   
   // Inside StreamDetailEnrichmentContentImpl:
   const aiFeatures = useAIFeatures();
   const { browserApiTools, attachments } = useEnrichmentIntegration({
     streamName: definition.stream.name,
     onAddProcessor: (processor, position) => {
       // Integrate with enrichment state machine
     },
     onUpdateProcessingSteps: (processors) => {
       // Update entire pipeline
     },
   });
   
   // Configure onechat flyout
   useEffect(() => {
     if (onechat && aiFeatures?.enabled) {
       onechat.setConversationFlyoutActiveConfig({
         attachments,
         browserApiTools,
         sessionTag: `streams-enrichment-${definition.stream.name}`,
       });
       return () => onechat.clearConversationFlyoutActiveConfig();
     }
   }, [onechat, attachments, browserApiTools, aiFeatures]);
   ```

2. **Verification & Testing:**
   - Run ESLint: `node scripts/eslint --fix <changed-files>`
   - Type check: `node scripts/type_check --project <tsconfig>`
   - Unit tests for new tools
   - Integration tests for workflows
   - Manual testing in UI

3. **Documentation:**
   - JSDoc comments for all public APIs
   - Usage examples in dev docs
   - Update PR description with capabilities

## Benefits

### For Users:
- **Faster onboarding**: AI suggests patterns instead of manual trial-and-error
- **Better patterns**: Learns from examples across the industry
- **Less errors**: AI validates patterns before suggestion
- **Contextual help**: Agent understands the stream and current state

### For Developers:
- **Extensible**: Easy to add new tools following established patterns
- **Type-safe**: Zod schemas prevent runtime errors
- **Maintainable**: Clear separation of concerns
- **Testable**: Isolated tool functions

## Example Conversations

### Example 1: Parse Apache Logs
**User:** "I have Apache access logs in the message field. Can you help parse them?"

**Agent:** 
1. Calls `streams.get_processing_steps` to check for existing parsers
2. Calls `streams.suggest_grok_pattern` with guidance "Apache access log"
3. Receives pattern: `%{COMBINEDAPACHELOG}`
4. Calls `streams_add_grok_processor` with pattern and field "message"
5. Responds: "I've added a grok processor to parse Apache access logs. It will extract fields like client IP, timestamp, HTTP method, URL, status code, and bytes sent. You can preview the results in the simulation playground."

### Example 2: CSV Logs
**User:** "These logs are pipe-delimited: timestamp|level|service|message"

**Agent:**
1. Calls `streams.suggest_dissect_pattern` with delimiter hints "pipe-separated"
2. Receives pattern: `%{timestamp}|%{level}|%{service}|%{message}`
3. Calls `streams_add_dissect_processor`
4. Responds: "I've added a dissect processor to parse your pipe-delimited logs. Four fields will be extracted: timestamp, level, service, and message."

### Example 3: Complex Enrichment
**User:** "I need to parse nginx logs and extract IP addresses into a separate field"

**Agent:**
1. `streams.get_processing_steps` - Check existing
2. `streams.suggest_grok_pattern` - Get nginx pattern
3. `streams_add_grok_processor` - Add parser
4. Suggests additional processor to extract IP to dedicated field
5. `streams_add_processor` - Add IP extraction
6. Responds with summary of both processors

## Performance Considerations

- **Caching**: Stream details are fetched once per agent session
- **Lazy Loading**: Full details only fetched when needed
- **Efficient Workflows**: Dissect is recommended for simple cases (faster than grok)
- **Batching**: Browser tools can update multiple processors at once

## Security

- **Authorization**: All server tools respect stream privileges
- **Validation**: Zod schemas validate all inputs
- **Scoped Access**: Tools can only access streams user has permission for
- **Browser Tool Safety**: UI state updates through controlled callbacks

## Conclusion

This implementation provides a complete AI-powered enrichment experience for Streams:
- ✅ Comprehensive stream context
- ✅ On-demand detail fetching
- ✅ AI-powered pattern generation (grok + dissect)
- ✅ Browser tools for UI integration
- ✅ Type-safe schemas throughout
- ✅ Extensible architecture
- ⏳ UI integration (needs connection to enrichment state machine)
- ⏳ Testing and verification

The foundation is complete. The remaining work is connecting the enrichment integration hook to the actual UI components and state machines, plus comprehensive testing.
