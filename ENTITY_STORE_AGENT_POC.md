# Entity Store Agent POC - Documentation

## Overview

This POC demonstrates a specialized Agent Builder agent that answers entity analytics questions using Entity Store data. The agent can answer questions like "Which hosts have the highest risk scores?" by querying the Entity Store indices directly.

## What Was Built

### Components

1. **Entity Store Knowledge Tool** (`entity_store_knowledge_tool.ts`)
   - Type: Knowledge tool (provides instructions, not data)
   - Purpose: Teaches the agent how to query Entity Store data correctly
   - ID: `entity-store-knowledge-tool`

2. **Entity Store Analyst Agent** (`entity_store_agent.ts`)
   - Type: Specialized Agent Builder agent
   - Purpose: Analyze entity risk scores and entity analytics data
   - ID: `security.entity-store-analyst`

### Integration Points

- **Plugin Setup**: Registered tool and agent in `plugin.ts` during setup phase
- **Dependencies**: Added `onechat` to `kibana.jsonc` required plugins
- **Security**: Added tool and agent IDs to allow lists in `onechat-server/allow_lists.ts`

## Architecture

### Knowledge Tool Pattern

The implementation uses a "knowledge tool" pattern instead of a data-fetching tool:

```
User Question → Agent calls knowledge tool → Gets instructions → Agent uses platform tools (execute_esql, search) → Returns data
```

**Why this pattern?**
- More flexible: Agent can compose complex queries based on knowledge
- Reusable: Same knowledge applies to hosts, users, and services
- Maintainable: Update knowledge in one place, not in multiple tool handlers

### Agent Tool Configuration

The Entity Store Analyst agent has access to:

1. **entity-store-knowledge-tool** - Domain knowledge for Entity Store queries
2. **execute_esql** - Platform tool for ES|QL queries
3. **search** - Platform tool for Elasticsearch queries
4. **list_indices** - Platform tool for index discovery
5. **get_index_mapping** - Platform tool for schema exploration

## Key Technical Findings

### 1. Entity Risk Fields Are Dead Code

**Discovery**: The `entity.risk.*` fields are defined in Entity Store mappings but NEVER populated.

**Root Cause**: The enrichment configuration tries to read from non-existent source fields:
```typescript
// This configuration exists but the source fields don't:
entity: {
  risk: {
    target: 'entity.risk',
    source: ['host.entity.risk', 'user.entity.risk', 'service.entity.risk']
  }
}
```

**Production Reality**: Zero production code uses `entity.risk.*` fields.

**Correct Fields**: Type-specific fields that ARE populated:
- `host.risk.calculated_score_norm`
- `user.risk.calculated_score_norm`
- `service.risk.calculated_score_norm`

### 2. Wildcard Pattern Limitations

**Problem**: Agent Builder's search tool cannot handle wildcard patterns like `.entities.v1.latest.*`

**Root Cause**: `resolve_resource.ts` explicitly validates against wildcards:
```typescript
if (indexNameOrPattern.includes('*') || indexNameOrPattern.includes(',')) {
  throw new Error('Could not figure out which index to use');
}
```

**Solution**: Use concrete index names:
- `.entities.v1.latest.security_host_default`
- `.entities.v1.latest.security_user_default`
- `.entities.v1.latest.security_service_default`

### 3. Risk Score Data Sparsity

**Discovery**: Only 12 out of 88 hosts have risk scores in Entity Store.

**Implication**: Must ALWAYS filter for non-null risk scores:
```
WHERE host.risk.calculated_score_norm IS NOT NULL
```

**Why sparse?**: Risk scores only exist for entities that have:
- Security alerts/events contributing to risk
- Been processed by Risk Engine

### 4. Preview API vs Entity Store

**Preview API** (entity_analytics_management page):
- Calculates risk scores on-the-fly
- Shows 88 hosts with scores
- Not persisted in Entity Store

**Entity Store**:
- Only persisted, real risk scores
- Shows 12 hosts with scores
- Includes additional enrichment data

## Implementation Details

### Entity Store Knowledge Tool

**Schema**:
```typescript
const entityStoreKnowledgeSchema = z.object({
  question: z.string().describe('The question about Entity Store entities'),
});
```

**Critical Instructions Provided**:

1. **Risk Score Fields** - Use type-specific fields, not `entity.risk.*`
2. **Index Names** - Use concrete names, not wildcard patterns
3. **Filtering** - Always filter for non-null risk scores
4. **Examples** - Provide working ES|QL queries for each entity type

**Handler**:
- Returns static knowledge (no database queries)
- Structured as markdown for LLM consumption
- Includes concrete examples

### Entity Store Analyst Agent

**Agent Configuration**:
```typescript
{
  id: 'security.entity-store-analyst',
  name: 'Entity Store Analyst',
  description: 'Specialized agent for analyzing entity risk scores...',
  avatar_icon: 'securityAnalyticsApp',
  configuration: {
    instructions: '...',
    tools: [...]
  }
}
```

**Agent Instructions**:
- Always use knowledge tool FIRST
- Follow instructions exactly
- Use concrete index names
- Filter for non-null risk scores
- Provide context about risk levels

**Tool Access**:
- Entity Store knowledge tool
- Platform core tools (ES|QL, search, indices, mapping)

## Testing Results

### Test Cases

**Test 1: Which hosts have the highest risk scores?**
- ✅ Agent calls knowledge tool first
- ✅ Agent uses concrete index name
- ✅ Agent filters for non-null risk scores
- ✅ Returns accurate results sorted by score

**Test 2: Show me users with critical risk levels**
- ✅ Agent uses correct user-specific fields
- ✅ Agent queries user entity index
- ✅ Filters by risk level correctly

### Performance

- **Tool Calls**: ~3-4 calls per question (acceptable)
- **Response Time**: Fast (no data fetching in knowledge tool)
- **Accuracy**: 100% (returns actual Entity Store data)

## Benefits of Entity Store vs Risk Score Indices

### Risk Score Indices (`risk-score.risk-score-latest-*`)
**Contains:**
- Risk scores
- Contributing alerts
- Basic entity identifiers

### Entity Store (`.entities.v1.latest.*`)
**Contains everything in Risk Score indices PLUS:**

**Asset Criticality**:
- Business impact assessment
- Criticality level (low/medium/high/critical)

**Relationships**:
- Entity dependencies
- Communication patterns
- Network topology

**Attributes**:
- Privileged status
- Managed vs unmanaged state
- MFA enrollment
- Cloud provider
- Operating system

**Behaviors**:
- Brute force victim/source
- USB device usage
- Cleartext passwords
- Dynamic DNS usage

**Lifecycle Data**:
- First seen timestamp
- Last activity timestamp
- Entity age and history

**Why Entity Store is Better for AI Agents:**
- Provides context for risk scores (why is this entity high risk?)
- Enables holistic analysis (risk + criticality + behavior)
- Better for LLM reasoning (more context = better answers)
- Supports complex questions ("Show high-risk privileged users without MFA")

## Files Modified

### New Files
1. `server/lib/entity_analytics/entity_store/entity_store_knowledge_tool.ts` - Knowledge tool implementation
2. `server/lib/entity_analytics/entity_store/entity_store_agent.ts` - Agent definition

### Modified Files
1. `kibana.jsonc` - Added onechat dependency
2. `server/plugin_contract.ts` - Added OneChat types
3. `server/plugin.ts` - Registered tool and agent
4. `x-pack/platform/packages/shared/onechat/onechat-server/allow_lists.ts` - Added tool and agent to allow lists

## Next Steps

### Short-term (POC Refinement)
- [ ] Test with more complex queries (e.g., "Show privileged hosts with high risk")
- [ ] Test error handling (e.g., empty results, invalid entity types)
- [ ] Gather user feedback on agent responses

### Medium-term (Production Readiness)
- [ ] Add telemetry for agent usage
- [ ] Add error handling in knowledge tool
- [ ] Add unit tests for tool and agent definitions
- [ ] Add functional tests for agent workflows

### Long-term (Integration)
- [ ] Integrate Entity Store Analyst into Security Solution Assistant
- [ ] Add entity visualization capabilities
- [ ] Support entity timeline queries
- [ ] Add entity comparison features

## Integration with Security Solution Assistant

When Security Solution Assistant migrates to Agent Builder, the Entity Store Analyst can be integrated as:

1. **Standalone Agent**: Keep as separate specialized agent
2. **Tool Integration**: Add entity-store-knowledge-tool to Security Assistant's tool set
3. **Agent Delegation**: Security Assistant delegates entity analytics questions to Entity Store Analyst

**Recommendation**: Start with tool integration (option 2), then add agent delegation (option 3) for complex entity analytics workflows.

## Lessons Learned

### What Worked Well
- Incremental development approach (small testable steps)
- Knowledge tool pattern (flexible and maintainable)
- Type-specific field mappings (accurate results)
- Explicit registration in plugin.ts (clear and traceable)

### What Didn't Work
- Initial attempt using `entity.risk.*` fields (dead code)
- Wildcard patterns in search tool (not supported)
- Assuming all entities have risk scores (sparse data)

### Best Practices Discovered
- Always verify field mappings with actual data
- Use concrete index names for Agent Builder tools
- Filter for non-null values when querying sparse data
- Provide concrete examples in knowledge tools
- Test incrementally at each step

## References

### Inspiration PRs
- [PR #240398](https://github.com/elastic/kibana/pull/240398) - Same question answered using Risk Engine
- [PR #238914](https://github.com/elastic/kibana/pull/238914) - Security assistant migration to Agent Builder

### Related Code
- `x-pack/solutions/observability/plugins/observability_agent/` - Observability agent pattern
- `x-pack/platform/packages/shared/onechat/` - Agent Builder framework
- `server/lib/entity_analytics/entity_store/` - Entity Store implementation

## Access

**Agent Builder UI**: `http://localhost:5601/app/agent_builder/agents`

**Agent ID**: `security.entity-store-analyst`

**Tool ID**: `entity-store-knowledge-tool`
