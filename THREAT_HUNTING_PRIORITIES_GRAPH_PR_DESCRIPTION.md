# Threat Hunting Priorities Graph Implementation

## Overview

This PR implements a **LangGraph-based state machine** for generating threat hunting priorities from entity analytics data. 

## Graph Structure

The threat hunting priorities graph follows a **5-node pipeline** with conditional routing:

```
START
  ↓
[FIND_CANDIDATE_ENTITIES] → Finds entities with risk spikes, high alert counts, etc.
  ↓ (conditional: if candidates found)
[SELECT_CANDIDATES] → LLM chooses which candidates to enrich (cost optimization)
  ↓ (conditional: if candidates selected)
[ENRICH_ENTITIES] → Fetches entity store data, alerts, risk scores, asset criticality, vulnerabilities, anomalies
  ↓ (always)
[FINALIZE_PRIORITIES] → LLM generates prioritized threat hunting priorities from enriched data
  ↓ (conditional: if unrefined results exist)
[REFINE_PRIORITIES] → LLM refines priorities (max 2 attempts)
  ↓
END
```

### Key Design Decisions

1. **Separation of Data Retrieval and LLM Processing**: We separate finding candidates (data-heavy) from selecting them (LLM-heavy), allowing us to filter candidates before expensive LLM calls.

2. **Conditional Edges Prevent Unnecessary Work**: Each edge checks state before proceeding:
   - No candidates found? → End early
   - No candidates selected? → Skip enrichment
   - No unrefined results? → Skip refinement

3. **Limited Refinement Loop**: Refinement is capped at 2 attempts to prevent infinite loops while still allowing quality improvement.

4. **State-Driven Flow Control**: The graph never hardcodes paths - all routing decisions are based on the current state, making it resilient to edge cases.

## State Management

### What is State?

State is a **shared data structure** that flows through the graph. Each node receives the current state, can read any field, and returns an updated state (only the fields it changes). LangGraph automatically merges these updates.

### State Structure

The `ThreatHuntingPrioritiesGraphState` contains:

**Core Data:**
- `candidateEntities: CandidateEntity[]` - Entities found with risk indicators (risk spikes, high alert counts)
- `selectedCandidateIds: string[]` - Entity IDs chosen by LLM for enrichment
- `enrichedEntities: Map<string, EnrichedData>` - Enriched data keyed by entity ID (risk scores, alerts, asset criticality, vulnerabilities, anomalies)
- `priorities: ThreatHuntingPriority[] | null` - Final prioritized list
- `unrefinedResults: ThreatHuntingPriority[] | null` - Initial priorities before refinement

**Control Flow:**
- `generationAttempts: number` - Tracks total LLM generation attempts
- `hallucinationFailures: number` - Counts detected hallucinations (placeholder patterns in responses)
- `refinements: string[]` - Array of refinement attempts (used to detect repeating generations)
- `maxGenerationAttempts: number` - Limit for total attempts (default: 10)
- `maxHallucinationFailures: number` - Limit for hallucinations (default: 5)
- `maxRepeatedGenerations: number` - Limit for detecting repeating outputs (default: 3)

**Configuration:**
- `prompt`, `refinePrompt`, `continuePrompt: string` - LLM prompts
- `filter`, `start`, `end` - Query parameters
- `replacements: Replacements` - Anonymization replacements
- `errors: string[]` - Accumulated errors

**Intermediate Data:**
- `combinedGenerations: string` - Accumulated generation text (for chunking)
- `combinedRefinements: string` - Accumulated refinement text

### How State Flows

1. **Initialization**: Graph starts with default values (empty arrays, null priorities, etc.)

2. **Node Execution**: Each node receives state, performs its work, returns partial updates:
   ```typescript
   // Example: FIND_CANDIDATE_ENTITIES node
   return {
     ...state,
     candidateEntities: [...foundEntities] // Only updates this field
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
   // Example: If candidates found, go to SELECT_CANDIDATES, else END
   if (state.candidateEntities.length > 0) {
     return 'select_candidates';
   }
   return 'end';
   ```

