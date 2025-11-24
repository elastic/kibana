# Threat Hunting Priorities Graph Implementation

## Overview

This PR implements a **LangGraph-based state machine** for generating threat hunting priorities from entity analytics data. LangGraph is a framework for building stateful, multi-step AI workflows where each step (node) can read and modify a shared state object, and the flow between steps is controlled by conditional logic (edges).

## Graph Structure

The threat hunting priorities graph follows a **3-node pipeline** with minimal conditional routing:

```
START
  ↓
[FIND_AND_SELECT_CANDIDATES] → Finds entities with risk spikes, optionally uses LLM to select top candidates (if > 10 found)
  ↓ (conditional: if candidates selected)
[ENRICH_ENTITIES] → Fetches entity store data, alerts, risk scores, asset criticality, vulnerabilities, anomalies
  ↓ (always - direct edge)
[GENERATE_PRIORITIES] → LLM generates high-quality, refined prioritized threat hunting priorities from enriched data
  ↓ (always - direct edge)
END
```

### Key Design Decisions

1. **Merged Finding and Selection**: We combine finding candidates (data-heavy) with selecting them (LLM-heavy) into a single node. If ≤ 10 candidates are found, we auto-select all (no LLM call). If > 10, we use the LLM to select the top 10. This optimizes cost while maintaining simplicity.

2. **Merged Generation and Refinement**: We combine initial generation and refinement into a single `GENERATE_PRIORITIES` node. The LLM prompt asks for "high-quality, refined priorities" from the start, eliminating the need for a separate refinement step. This reduces from 2 LLM calls to 1, cutting cost and latency in half.

3. **Minimal Conditional Routing**: We only use conditional edges where necessary (after FIND_AND_SELECT to check if candidates were selected). All other edges are direct, making the graph simpler and more predictable.

4. **State-Driven Flow Control**: The graph uses state to make routing decisions, making it resilient to edge cases while keeping the structure simple.

## State Management

### What is State?

State is a **shared data structure** that flows through the graph. Each node receives the current state, can read any field, and returns an updated state (only the fields it changes). LangGraph automatically merges these updates.

### State Structure

The `ThreatHuntingPrioritiesGraphState` contains:

**Core Data:**
- `candidateEntities: CandidateEntity[]` - Entities found with risk indicators (risk spikes, high alert counts)
- `selectedCandidateIds: string[]` - Entity IDs chosen for enrichment (auto-selected if ≤ 10, LLM-selected if > 10)
- `enrichedEntities: Map<string, EnrichedData>` - Enriched data keyed by entity ID (risk scores, alerts, asset criticality, vulnerabilities, anomalies)
- `priorities: ThreatHuntingPriority[] | null` - Final prioritized list (generated in one pass)

**Control Flow:**
- `generationAttempts: number` - Tracks total LLM generation attempts
- `hallucinationFailures: number` - Counts detected hallucinations (placeholder patterns in responses)
- `maxGenerationAttempts: number` - Limit for total attempts (default: 10)
- `maxHallucinationFailures: number` - Limit for hallucinations (default: 5)
- `maxRepeatedGenerations: number` - Limit for detecting repeating outputs (default: 3)

**Configuration:**
- `prompt: string` - LLM prompt for generating priorities
- `filter`, `start`, `end` - Query parameters
- `replacements: Replacements` - Anonymization replacements
- `errors: string[]` - Accumulated errors

**Note:** Some state fields (like `unrefinedResults`, `refinements`, `combinedRefinements`) may still exist in the state definition for backward compatibility but are no longer used in the graph flow since generation and refinement were merged.

### How State Flows

1. **Initialization**: Graph starts with default values (empty arrays, null priorities, etc.)

2. **Node Execution**: Each node receives state, performs its work, returns partial updates:
   ```typescript
   // Example: FIND_AND_SELECT_CANDIDATES node
   return {
     ...state,
     candidateEntities: [...foundEntities], // Updates candidates
     selectedCandidateIds: [...selectedIds]  // Updates selected IDs
   }
   ```

3. **State Merging**: LangGraph automatically merges updates using reducers defined in annotations:
   ```typescript
   candidateEntities: Annotation<CandidateEntity[]>({
     reducer: (x: CandidateEntity[], y?: CandidateEntity[]) => y ?? x, // Use new value if provided
     default: () => [],
   })
   ```

4. **Edge Evaluation**: Edges receive the merged state and return routing decisions:
   ```typescript
   // Example: If candidates selected, go to ENRICH, else END
   if (state.selectedCandidateIds.length > 0) {
     return 'enrich';
   }
   return 'end';
   ```

## Benefits of This Architecture

1. **Simplicity**: Only 3 nodes with minimal conditional routing makes the graph easy to understand and maintain
2. **Cost Efficiency**: Single LLM call for generation (instead of 2) reduces API costs by ~50%
3. **Performance**: Fewer nodes and direct edges reduce latency
4. **Quality**: The merged generation node uses a prompt that asks for "high-quality, refined priorities" from the start, achieving the same quality as separate generation + refinement steps
5. **Testability**: Each node can be tested independently with mock state
6. **Observability**: State transitions are logged, making debugging straightforward

## Comparison to Attack Discovery Graph

The threat hunting priorities graph shares architectural patterns with the attack discovery graph but differs in purpose and flow:

### Similarities

Both graphs use:
- **State-based architecture** - Shared state object flows through nodes
- **Conditional routing** - Edges make decisions based on state
- **LLM + Data nodes** - Mix of data retrieval nodes and LLM generation nodes
- **Error handling** - Track generation attempts, hallucination failures

### Key Differences

| Aspect | Attack Discovery | Threat Hunting Priorities |
|--------|------------------|---------------------------|
| **Input** | Alerts (documents) | Entities (users/hosts) |
| **First Step** | Retrieve anonymized alerts | Find and select candidate entities (risk spikes, alerts) |
| **Selection** | N/A (processes all alerts) | LLM selects which entities to enrich if > 10 found (cost optimization) |
| **Enrichment** | Anonymization only | Multi-source: entity store, risk scores, asset criticality, vulnerabilities, anomalies |
| **Output** | Attack discoveries (narrative summaries) | Threat hunting priorities (prioritized actionable items with title, byline, description, tags, chat recommendations) |
| **Graph Complexity** | 3 nodes (retrieve → generate → refine) | 3 nodes (find_and_select → enrich → generate) |
| **LLM Calls** | 2 (generate + refine) | 1 (merged generate_priorities) |
| **Refinement** | Separate refinement loop | Merged into generation (prompt asks for refined output) |

### Why Different Approaches?

**Attack Discovery** needs separate refinement because:
- Processes potentially large sets of alerts
- Benefits from iterative improvement of narrative summaries
- Can refine multiple times to improve quality

**Threat Hunting Priorities** uses merged generation because:
- Works with a smaller, curated set of entities (max 10)
- Structured output (priorities with specific fields) is easier to get right in one pass
- Single high-quality prompt achieves the same result as generation + refinement
- Simpler architecture reduces complexity and cost

