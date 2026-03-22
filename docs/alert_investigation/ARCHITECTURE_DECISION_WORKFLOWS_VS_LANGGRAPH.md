# Architecture Decision: Kibana Workflows vs LangGraph

**Question:** Should we use **Kibana Workflows** instead of **LangGraph** for alert investigation orchestration?

**Decision Date:** 2026-03-22
**Status:** Analysis Complete
**Recommendation:** ✅ **Use LangGraph for Foundation Spike**, Consider Workflows for Production

---

## Executive Summary

**Both are valid architectural choices**, but serve different purposes:

- **LangGraph**: Purpose-built for **AI agent orchestration** with LLM state management, retry logic, and observability
- **Kibana Workflows**: Purpose-built for **user-configurable automation** with UI management, event triggers, and business process orchestration

**Recommendation:**
1. **Foundation Spike (Current):** ✅ **LangGraph** - Faster to implement (reuse Attack Discovery), proves AI agent pattern
2. **Production (Weeks 2-4):** ⚠️ **Consider Workflows** - Better for user-configurable investigations, event-driven triggers
3. **Hybrid Approach:** 🎯 **Best of Both** - Workflows orchestrate investigation workflow, LangGraph orchestrates AI agents within workflow steps

---

## Capabilities Comparison

| Capability | LangGraph | Kibana Workflows | Winner |
|------------|-----------|------------------|--------|
| **AI Agent Orchestration** | ✅ Native (StateGraph, tools, prompts) | ⚠️ Possible (via custom steps) | **LangGraph** |
| **LLM State Management** | ✅ Built-in (Annotation) | ❌ Manual (pass via step outputs) | **LangGraph** |
| **Retry Logic** | ✅ Built-in | ⚠️ Manual (via step config) | **LangGraph** |
| **LangSmith Tracing** | ✅ Native integration | ❌ Not integrated | **LangGraph** |
| **Event-Driven Triggers** | ❌ None (must poll or manually invoke) | ✅ Native (trigger registry, emitEvent) | **Workflows** |
| **User Configuration** | ❌ Code-only | ✅ UI-based (Workflows Management app) | **Workflows** |
| **Conditional Branching** | ✅ Native (conditional edges) | ⚠️ Possible (via step logic) | **LangGraph** |
| **Parallel Execution** | ✅ Native (parallel edges) | ⚠️ Possible (via parallel step groups) | **LangGraph** |
| **Reusable Components** | ⚠️ Agents (code) | ✅ Steps (registered, reusable across workflows) | **Workflows** |
| **Observability** | ✅ LangSmith traces | ⚠️ Execution logs (via workflows engine) | **LangGraph** |
| **Error Boundaries** | ✅ Node-level error handling | ✅ Step-level error handling | **Tie** |
| **Proven in Production** | ✅ Attack Discovery uses it | ✅ Cases uses it | **Tie** |

---

## Architecture Patterns

### Option 1: Pure LangGraph (Current Implementation)

```
Alert Created
  ↓
API: POST /internal/.../alert_investigation
  ↓
┌──────────────────────────────────────┐
│      LangGraph StateGraph            │
│                                      │
│  Node: Triage                        │
│    ↓                                 │
│  Node: MITRE                         │
│    ↓                                 │
│  Node: Update Case (future)          │
└──────────────┬───────────────────────┘
               ↓
Investigation Result
```

**Pros:**
- ✅ Fast to implement (copy Attack Discovery pattern)
- ✅ AI-native (built for LLM agents)
- ✅ LangSmith observability out-of-box
- ✅ Proven (Attack Discovery uses it)
- ✅ Retry logic built-in

**Cons:**
- ❌ No UI configuration (hardcoded workflow)
- ❌ No event-driven triggers (must manually invoke)
- ❌ Not reusable across features (tightly coupled)

**Best for:** Foundation spike (prove AI agent pattern quickly)

---

### Option 2: Pure Workflows

```
Alert Created
  ↓
Trigger: alert.created (emitEvent)
  ↓
┌──────────────────────────────────────┐
│      Workflow Execution Engine       │
│                                      │
│  Step: Triage (custom LLM step)      │
│    ↓                                 │
│  Step: MITRE (custom LLM step)       │
│    ↓                                 │
│  Step: Add Comment (built-in)        │
└──────────────┬───────────────────────┘
               ↓
Case Updated
```

**Implementation:**
```typescript
// Register custom workflow step: "Triage Alert"
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.triage',
  title: 'Triage Alert with AI',
  description: 'Classify alert severity and attack type using LLM',
  inputSchema: z.object({
    alertId: z.string(),
    connectorId: z.string(),
  }),
  outputSchema: z.object({
    classification: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    attackType: z.string(),
    confidence: z.number(),
  }),
  handler: async (input) => {
    // Call triage agent
    const result = await triageAgent.execute(alert);
    return result;
  },
});

// Register custom workflow step: "Map to MITRE"
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.mitre_mapper',
  title: 'Map Alert to MITRE ATT&CK',
  description: 'Identify tactics, techniques, and attack phase',
  inputSchema: z.object({
    alertId: z.string(),
    triageResult: z.object({ /* triage output */ }),
  }),
  outputSchema: z.object({
    techniques: z.array(/* ... */),
    tactics: z.array(/* ... */),
  }),
  handler: async (input) => {
    const result = await mitreMapper.execute(alert, input.triageResult);
    return result;
  },
});

// Users create workflow in UI:
// 1. Trigger: "Alert Created"
// 2. Step 1: Triage Alert with AI
// 3. Step 2: Map to MITRE ATT&CK
// 4. Step 3: Add Comment (built-in Cases step)
```

**Pros:**
- ✅ Event-driven (auto-trigger when alert created)
- ✅ User-configurable (Workflows Management UI)
- ✅ Reusable steps (triage step can be used in other workflows)
- ✅ No code changes for workflow modifications
- ✅ Built-in step library (Cases steps already exist)

**Cons:**
- ❌ Not AI-native (no LLM state management)
- ❌ No LangSmith tracing
- ❌ More complex setup (register steps, triggers, emit events)
- ❌ Debugging harder (workflow execution logs vs LangSmith traces)
- ❌ Passing LLM context between steps is manual

**Best for:** Production (user-configurable, event-driven, extensible)

---

### Option 3: Hybrid (Recommended for Production)

```
Alert Created
  ↓
Trigger: alert.created (Workflows)
  ↓
Workflow Execution Engine
  ↓
Step: "AI Investigation" (custom step)
  ↓
  ┌─────────────────────────────────────┐
  │   LangGraph Multi-Agent System       │  ← LangGraph inside workflow step
  │                                      │
  │   Node: Triage                       │
  │     ↓                                │
  │   Node: MITRE                        │
  │     ↓                                │
  │   Node: CTI (parallel)               │
  │   Node: Investigation (parallel)     │
  │     ↓                                │
  │   Node: Remediation                  │
  └──────────────┬──────────────────────┘
                 ↓
Step: "Add Comment to Case" (built-in)
  ↓
Step: "Execute Response Actions" (future)
```

**Implementation:**
```typescript
// Register LangGraph as a single workflow step
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.ai_investigate',
  title: 'AI-Powered Investigation (5 Agents)',
  description: 'Run autonomous investigation with Triage, MITRE, CTI, Investigation, and Remediation agents',
  inputSchema: z.object({
    alertId: z.string(),
    connectorId: z.string(),
  }),
  outputSchema: z.object({
    investigationText: z.string(),
    triage: z.object({ /* ... */ }),
    mitreMapping: z.object({ /* ... */ }),
    // ... all agent outputs
  }),
  handler: async (input, context) => {
    // Execute LangGraph (all 5 agents)
    const result = await executeInvestigation({
      alert: await fetchAlert(input.alertId),
      llmClient: await getLlmClient(input.connectorId),
      esClient: context.esClient,
      logger: context.logger,
    });
    return result;
  },
});

// Workflow configuration (UI or YAML):
// - Trigger: "Alert Created (High Risk)"
// - Step 1: AI-Powered Investigation (5 Agents) ← LangGraph runs here
// - Step 2: Add Comment to Case (investigation results)
// - Step 3: (Optional) Execute Response Action
```

**Pros:**
- ✅ Event-driven (Workflows triggers)
- ✅ AI-optimized (LangGraph for agents)
- ✅ User-configurable (workflow composition)
- ✅ Best observability (LangSmith for AI, Workflows logs for orchestration)
- ✅ Reusable (LangGraph step can be used in other workflows)
- ✅ Separation of concerns (Workflows = business process, LangGraph = AI reasoning)

**Cons:**
- ⚠️ More complex (two orchestration layers)
- ⚠️ Requires understanding both systems

**Best for:** Production system with event-driven triggers and user customization

---

## Detailed Analysis

### Use Case Fit Assessment

**Alert Investigation Requirements:**

| Requirement | LangGraph Fit | Workflows Fit | Winner |
|-------------|---------------|---------------|--------|
| **AI Agent Coordination** | ✅ Excellent (purpose-built) | ⚠️ Adequate (via custom steps) | **LangGraph** |
| **State Passing Between Agents** | ✅ Excellent (Annotation) | ⚠️ Manual (via step outputs) | **LangGraph** |
| **LLM Tool Calling** | ✅ Native | ❌ Must implement manually | **LangGraph** |
| **Event-Driven Trigger** (alert created) | ❌ Not supported | ✅ Native (trigger registry) | **Workflows** |
| **User Customization** (enable/disable agents) | ❌ Code changes required | ✅ UI configuration | **Workflows** |
| **Debugging AI Behavior** | ✅ LangSmith traces | ⚠️ Execution logs (less AI-specific) | **LangGraph** |
| **Reusability** (use agents elsewhere) | ⚠️ Agents are code | ✅ Steps are registered | **Workflows** |

**Conclusion:** **LangGraph** wins for AI agent orchestration, **Workflows** wins for event-driven automation and user control.

---

### Implementation Complexity

**Foundation Spike (2 Agents):**

#### LangGraph Implementation (Current)
```typescript
// ~500 lines of code

// 1. Define state (50 lines)
const graphState = Annotation.Root({ alert, triage, mitreMapping, errors });

// 2. Create agents (200 lines)
const triageAgent = createTriageAgent(llmClient, esClient);
const mitreAgent = createMitreMapperAgent(llmClient);

// 3. Create nodes (100 lines)
const triageNode = async (state) => { return { triage: await triageAgent.execute(state.alert) }; };
const mitreNode = async (state) => { return { mitreMapping: await mitreAgent.execute(state.alert) }; };

// 4. Build graph (50 lines)
workflow.addNode('triage', triageNode);
workflow.addNode('mitre', mitreNode);
workflow.addEdge('__start__', 'triage');
workflow.addEdge('triage', 'mitre');

// 5. Execute (50 lines)
const result = await graph.invoke({ alert });
```

**Estimated effort:** 1-2 days (reusing Attack Discovery pattern)

---

#### Workflows Implementation (Alternative)
```typescript
// ~800 lines of code

// 1. Register trigger (100 lines)
workflowsExtensions.registerTrigger({
  id: 'alert_investigation.alert_created',
  title: 'High-Risk Alert Created',
  eventSchema: z.object({ alertId, alertIndex, caseId }),
});

// 2. Register Triage step (200 lines)
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.triage',
  title: 'Triage Alert with AI',
  inputSchema: z.object({ alertId, connectorId }),
  outputSchema: z.object({ classification, attackType, confidence, reasoning }),
  handler: async (input, context) => {
    // Manual LLM setup (no LangGraph state management)
    const llmClient = await getLlmClient(input.connectorId);
    const alert = await fetchAlert(input.alertId);

    // Manual tool calling
    const similarAlerts = await context.esClient.search({ /* ... */ });

    // Manual LLM invocation
    const response = await llmClient.invoke([
      { role: 'system', content: triageSystemPrompt },
      { role: 'user', content: JSON.stringify({ alert, similarAlerts }) },
    ]);

    return parseTriageResponse(response);
  },
});

// 3. Register MITRE step (200 lines)
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.mitre_mapper',
  // ... similar pattern
});

// 4. Create workflow definition (100 lines)
const investigationWorkflow = {
  name: 'AI Alert Investigation',
  trigger: 'alert_investigation.alert_created',
  steps: [
    { type: 'alert_investigation.triage', config: { /* ... */ } },
    { type: 'alert_investigation.mitre_mapper', config: { /* ... */ } },
    { type: 'cases.add_comment', config: { comment: '${steps.mitre.output.markdown}' } },
  ],
};

// 5. Emit trigger when alert created (50 lines)
await workflowsClient.emitEvent('alert_investigation.alert_created', {
  alertId: alert._id,
  alertIndex: alert._index,
});
```

**Estimated effort:** 3-4 days (new pattern, more boilerplate, event wiring)

---

## Code Complexity Comparison

### LangGraph (Current Implementation)

**Total Files:** 15
**Total Lines:** ~1,200

**Breakdown:**
- Agents: 2 files, ~400 lines (triage + MITRE)
- Graph: 3 files, ~300 lines (state + orchestrator + nodes)
- Helpers: 3 files, ~200 lines (LLM client + formatters)
- Types: 1 file, ~100 lines
- Routes: 1 file, ~150 lines
- Tests: 5 files, ~850 lines

**Complexity:** Medium (graph concepts require learning curve)

---

### Workflows (Alternative Implementation)

**Total Files:** 20-25
**Total Lines:** ~1,800-2,000

**Breakdown:**
- Step definitions: 2 files, ~600 lines (triage + MITRE steps with manual LLM handling)
- Trigger definitions: 1 file, ~150 lines (alert.created trigger)
- Event emitters: 2 files, ~200 lines (emit on alert creation)
- Workflow definitions: 1 file, ~150 lines (workflow config)
- Step registration: 1 file, ~100 lines (register steps in plugin setup)
- Routes: 1 file, ~150 lines (trigger endpoint)
- Helpers: 3 files, ~200 lines (same as LangGraph)
- Types: 1 file, ~150 lines (more types for step I/O)
- Tests: 8 files, ~1,200 lines (more tests for step registry)

**Complexity:** High (workflow concepts + LLM integration + event wiring)

---

## Performance Analysis

### Latency Comparison (2 Agents)

#### LangGraph
- **Triage Node:** 5-10s (LLM call + tool execution)
- **MITRE Node:** 3-5s (LLM call)
- **Graph Overhead:** <1s (state management)
- **Total:** 8-16s

#### Workflows
- **Triage Step:** 5-10s (same LLM call)
- **MITRE Step:** 3-5s (same LLM call)
- **Workflow Engine Overhead:** 1-2s (step resolution, output passing)
- **Total:** 9-17s

**Winner:** Tie (within 1s difference)

---

### Scalability (5 Agents, Parallel Execution)

#### LangGraph
```typescript
// Parallel execution is native
workflow.addNode('cti', ctiNode);
workflow.addNode('investigation', investigationNode);

// These run in parallel
workflow.addEdge('triage', 'cti');
workflow.addEdge('triage', 'investigation');
```

**Latency:** ~30s (parallel execution of agents 2-4)

---

#### Workflows
```typescript
// Parallel execution possible via parallel_group (if supported)
{
  steps: [
    { type: 'triage' },
    {
      type: 'parallel_group',
      steps: [
        { type: 'cti' },
        { type: 'investigation' },
      ],
    },
  ],
}
```

**Latency:** ~30s (IF parallel_group supported, otherwise ~60s sequential)

**Winner:** LangGraph (parallel execution is native and proven)

---

## Observability & Debugging

### LangGraph
- ✅ **LangSmith Traces:** See every LLM call, tool use, state transition
- ✅ **Token Usage:** Track costs per agent
- ✅ **Latency Breakdown:** P50, P95, P99 per node
- ✅ **Error Tracking:** Which node failed, why
- ✅ **Replay:** Re-run investigation with same inputs

**Debug Experience:** ⭐️⭐️⭐️⭐️⭐️ (purpose-built for AI debugging)

---

### Workflows
- ⚠️ **Execution Logs:** See step success/failure, outputs
- ❌ **No LLM-specific traces:** Can't see LLM reasoning
- ⚠️ **Token Usage:** Must instrument manually
- ⚠️ **Latency Breakdown:** Per-step timing available
- ⚠️ **Error Tracking:** Which step failed, but less AI context

**Debug Experience:** ⭐️⭐️⭐️ (adequate for workflow debugging, weak for AI debugging)

**Winner:** **LangGraph** (AI-specific observability is critical)

---

## Reusability Analysis

### LangGraph Agents
**Reuse Scenario:** "Use Triage Agent in different workflow"

**Current (LangGraph):**
```typescript
// Triage agent is a code module
import { createTriageAgent } from '@kbn/elastic-assistant/.../agents';

// Use in different context:
const agent = createTriageAgent(llmClient, esClient);
const result = await agent.execute(alert);
```

**Reusability:** ⚠️ Medium (requires code import, not discoverable in UI)

---

### Workflows Steps
**Reuse Scenario:** "Use Triage step in different workflow"

**With Workflows:**
```yaml
# Workflow 1: Alert Investigation
- type: alert_investigation.triage  # Registered step
  config: { connectorId: 'claude-connector' }

# Workflow 2: Bulk Alert Triage (different workflow)
- type: alert_investigation.triage  # Same step, reused
  config: { connectorId: 'claude-connector' }
```

**Reusability:** ✅ Excellent (registered once, used anywhere via UI)

**Winner:** **Workflows** (better component reusability)

---

## Event-Driven Capabilities

### LangGraph
**Trigger Method:** Manual invocation only

```typescript
// Must explicitly call
const result = await executeInvestigation({ alert, ... });

// OR schedule via Task Manager
taskManager.schedule({
  taskType: 'alert-investigation',
  schedule: { interval: '5m' },  // Poll every 5 min
});
```

**Limitations:**
- ❌ No event-driven triggers (must poll or manually invoke)
- ❌ Polling is inefficient (query for new alerts every X min)

---

### Workflows
**Trigger Method:** Event-driven (native)

```typescript
// Emit event when alert created
await workflowsClient.emitEvent('alert.created', {
  alertId: alert._id,
  alertIndex: alert._index,
  severity: alert._source['kibana.alert.severity'],
});

// Workflows subscribed to this trigger auto-execute
// No polling, instant response
```

**Benefits:**
- ✅ Event-driven (instant trigger, no polling)
- ✅ Scalable (only runs when alerts exist)
- ✅ User can subscribe workflows to triggers via UI

**Winner:** **Workflows** (event-driven is superior to polling)

---

## User Experience

### LangGraph
**Configuration:** Code changes required

To modify workflow:
1. Edit TypeScript files (add/remove nodes, change prompt)
2. Run tests
3. Deploy code
4. Restart Kibana

**User Customization:** ❌ None (hardcoded)

**Example:** "I want to disable MITRE mapping for low-severity alerts"
→ Requires code change + deployment

---

### Workflows
**Configuration:** UI-based (Workflows Management app)

To modify workflow:
1. Open Workflows Management UI
2. Edit workflow (add/remove steps, change config)
3. Save
4. Workflow updates immediately (no deployment)

**User Customization:** ✅ Full (via UI)

**Example:** "I want to disable MITRE mapping for low-severity alerts"
→ Add conditional step: `if severity == 'low', skip mitre_mapper`
→ Done in UI, no code change

**Winner:** **Workflows** (vastly better UX for customization)

---

## Stack Gap Analysis

### What Workflows Would Need for AI Agents

**Gap 1: LLM State Management**
- **Current:** Workflows pass JSON outputs between steps
- **Needed:** LLM conversation history, message threading
- **Workaround:** Manually pass in step outputs (not ideal)
- **Priority:** HIGH

**Gap 2: LangSmith Integration**
- **Current:** No LangSmith tracing for workflow steps
- **Needed:** Automatic tracing when step uses LLM
- **Workaround:** Manually add tracing in each step handler
- **Priority:** MEDIUM

**Gap 3: LLM Tool Calling Pattern**
- **Current:** No built-in tool calling support
- **Needed:** Register tools, automatic tool→LLM→tool loops
- **Workaround:** Manually implement tool calling in step handler
- **Priority:** HIGH

**Gap 4: Parallel Agent Execution**
- **Current:** Unknown if `parallel_group` step type exists
- **Needed:** Run multiple agents concurrently
- **Workaround:** Sequential execution (slower)
- **Priority:** MEDIUM

**These gaps make Workflows less ideal for AI orchestration** (at least today).

---

## Decision Matrix

| Factor | Weight | LangGraph Score | Workflows Score | Weighted |
|--------|--------|-----------------|-----------------|----------|
| **AI Orchestration Quality** | 35% | 10/10 | 5/10 | LG: 3.5, WF: 1.75 |
| **Implementation Speed** | 20% | 9/10 (reuse AD) | 4/10 (new pattern) | LG: 1.8, WF: 0.8 |
| **Event-Driven Triggers** | 15% | 2/10 (polling) | 10/10 (native) | LG: 0.3, WF: 1.5 |
| **User Customization** | 15% | 2/10 (code-only) | 10/10 (UI) | LG: 0.3, WF: 1.5 |
| **Debugging/Observability** | 10% | 10/10 (LangSmith) | 5/10 (logs) | LG: 1.0, WF: 0.5 |
| **Reusability** | 5% | 5/10 (code import) | 9/10 (step registry) | LG: 0.25, WF: 0.45 |
| **Total Score** | 100% | **7.15 / 10** | **6.5 / 10** | **LangGraph wins** |

**Winner for Foundation Spike:** **LangGraph** (7.15 vs 6.5)

**Rationale:**
- AI orchestration quality is the PRIMARY factor (35% weight)
- Implementation speed matters for spike (reuse Attack Discovery = fast)
- Event-driven and customization matter MORE for production

---

## Recommendation by Phase

### Foundation Spike (Week 1) - CURRENT

**Recommendation:** ✅ **Use LangGraph**

**Rationale:**
1. **Faster implementation:** Reuse Attack Discovery's LangGraph setup (1-2 days vs 3-4 days for Workflows)
2. **Proves AI pattern:** LangGraph is purpose-built for AI agents (better for validating AI approach)
3. **Better observability:** LangSmith tracing crucial for debugging LLM behavior
4. **Lower risk:** Attack Discovery already uses LangGraph (proven in production)

**Trade-offs Accepted:**
- ❌ No event-driven triggers (manual API invocation acceptable for spike)
- ❌ No user customization (spike is proof-of-concept, not production feature)

---

### Production Implementation (Weeks 2-4)

**Recommendation:** 🎯 **Hybrid Approach** (Workflows + LangGraph)

**Architecture:**
```
┌──────────────────────────────────────────────────────┐
│             Kibana Workflows                          │
│  (Event Triggers, User Config, Business Process)     │
│                                                       │
│  Trigger: alert.created                              │
│    ↓                                                  │
│  Step 1: Fetch Alert & Case                          │
│    ↓                                                  │
│  Step 2: AI Investigation (LangGraph)  ← Hybrid!     │
│    │                                                  │
│    │  ┌──────────────────────────────┐              │
│    └──│   LangGraph Multi-Agent      │              │
│       │   (5 agents, parallel,       │              │
│       │    LLM state, observability)  │              │
│       └──────────────────────────────┘              │
│    ↓                                                  │
│  Step 3: Add Comment to Case                         │
│    ↓                                                  │
│  Step 4: (Optional) Execute Response Actions         │
└──────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// Register LangGraph as a workflow step (wraps AI complexity)
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.ai_investigate',
  title: 'AI Investigation (5 Agents)',
  description: 'Autonomous multi-agent investigation using Triage, MITRE, CTI, Investigation, and Remediation agents',
  inputSchema: z.object({
    alertId: z.string(),
    caseId: z.string().optional(),
    connectorId: z.string(),
  }),
  outputSchema: z.object({
    investigationText: z.string(),
    triage: z.object({ /* ... */ }),
    mitreMapping: z.object({ /* ... */ }),
    // ... all agent outputs
  }),
  handler: async (input, context) => {
    // LangGraph handles AI agent orchestration
    const result = await executeInvestigation({
      alert: await fetchAlert(input.alertId),
      caseId: input.caseId,
      llmClient: await getLlmClient(input.connectorId),
      esClient: context.esClient,
      logger: context.logger,
    });
    return result;
  },
});

// Users create workflow in UI:
// Trigger: "Alert Created (High Risk)"
// Step 1: AI Investigation (5 Agents)  ← All LangGraph complexity hidden here
// Step 2: Add Comment to Case
// Step 3: (Optional) Assign to Analyst
```

**Benefits:**
- ✅ **Event-driven:** Auto-triggers when alerts created
- ✅ **AI-optimized:** LangGraph orchestrates agents with proper state management
- ✅ **User-friendly:** Workflows UI for configuration (disable agents, change connectors)
- ✅ **Best observability:** LangSmith for AI (inside step), Workflows logs for business process
- ✅ **Reusable:** AI Investigation step can be used in other workflows
- ✅ **Separation of concerns:** Workflows = business automation, LangGraph = AI reasoning

**Trade-offs:**
- ⚠️ Two orchestration layers (complexity)
- ⚠️ Requires understanding both systems

**Estimated effort:** 2-3 days additional (register step + trigger, wire events)

---

## Migration Path: LangGraph → Hybrid

**If we start with LangGraph (foundation), how to migrate to Hybrid (production)?**

**Step 1: Wrap LangGraph as Workflow Step** (1 day)
```typescript
// Minimal change: Expose executeInvestigation as workflow step
workflowsExtensions.registerStepDefinition({
  id: 'alert_investigation.ai_investigate',
  handler: async (input) => {
    // Call existing LangGraph implementation
    return await executeInvestigation({ /* ... */ });
  },
});
```

**Step 2: Register Alert Trigger** (1 day)
```typescript
// Register trigger for alert creation
workflowsExtensions.registerTrigger({
  id: 'alert.created.high_risk',
  eventSchema: z.object({ alertId, alertIndex, severity, caseId }),
});

// Emit trigger in detection engine
await workflowsClient.emitEvent('alert.created.high_risk', { /* ... */ });
```

**Step 3: Create Default Workflow** (0.5 days)
```typescript
// Default workflow (can be customized by users)
const defaultInvestigationWorkflow = {
  name: 'Autonomous Alert Investigation',
  trigger: 'alert.created.high_risk',
  steps: [
    { type: 'alert_investigation.ai_investigate' }, // LangGraph wrapped
    { type: 'cases.add_comment' },
  ],
};
```

**Total Migration Effort:** 2-3 days

**Result:** LangGraph investment preserved, Workflows benefits added

---

## Recommendations

### For Foundation Spike (Current)

**✅ Keep LangGraph** - Already implemented, faster, AI-optimized

**No changes needed** - Current implementation is correct for spike scope

---

### For Production (Weeks 2-4)

**🎯 Adopt Hybrid Approach:**

**Phase 1 (Week 2):** Add Workflows Wrapper
1. Register LangGraph as workflow step
2. Create alert trigger
3. Create default workflow

**Phase 2 (Week 3):** Add User Customization
1. Expose agent enable/disable toggles in step config
2. Allow connector selection in workflow UI
3. Add conditional steps (if severity > HIGH, run deep investigation)

**Phase 3 (Week 4):** Production Hardening
1. Add more workflow templates (bulk triage, scheduled re-investigation)
2. Integrate with Response Actions (workflow step)
3. User feedback UI (rate investigation quality)

---

## Competitive Analysis: Workflows Advantage

**Dropzone AI, Torq, Microsoft Copilot all have:**
- ✅ Event-driven automation (trigger on alert)
- ✅ User-configurable workflows (enable/disable agents, change thresholds)
- ✅ No-code workflow creation (via UI)

**With pure LangGraph:**
- ❌ None of these (hardcoded workflow)

**With Hybrid (Workflows + LangGraph):**
- ✅ All of these (matches competitor UX)
- ✅ PLUS: Better AI observability (LangSmith)

**Conclusion:** Hybrid approach gives competitive advantage

---

## Risk Assessment

### Risk: Workflows System Not Mature Enough

**Concerns:**
- Workflows system is newer (less battle-tested than LangGraph)
- Step registry API may change
- Parallel execution support unclear
- LLM-specific features missing (gaps documented above)

**Mitigation:**
- ✅ Start with LangGraph (proven)
- ✅ Migrate to Hybrid when Workflows matures
- ✅ Document stack gaps for platform team

---

### Risk: Two Orchestration Layers Too Complex

**Concerns:**
- Developers must understand both LangGraph AND Workflows
- Debugging requires two tools (LangSmith + Workflows logs)
- More moving parts = more failure modes

**Mitigation:**
- ✅ Clear separation of concerns (Workflows = business automation, LangGraph = AI agents)
- ✅ Good documentation (when to use which)
- ✅ Abstraction (users only see Workflows UI, LangGraph is hidden)

---

## Final Recommendation

### Foundation Spike (Week 1)

**Decision:** ✅ **Keep LangGraph** (already implemented)

**Rationale:**
- Fastest path (reuse Attack Discovery)
- AI-optimized (purpose-built for agents)
- Proven (Attack Discovery production-ready)
- Event triggers not critical for spike (manual invocation OK)

**Do NOT migrate to Workflows for foundation spike** - would add 2-3 days with no spike value

---

### Production Implementation (Weeks 2-4)

**Decision:** 🎯 **Hybrid Approach** (Workflows wrap LangGraph)

**Rationale:**
- Best of both worlds (event-driven + AI-optimized)
- Competitive parity (user-configurable like Dropzone/Torq)
- Investment preserved (LangGraph agents reused)
- Scalable (event-driven > polling)

**Timeline:**
- Week 2: Wrap LangGraph as workflow step (2 days)
- Week 3: Add triggers + default workflow (1 day)
- Week 4: User customization UI (2 days)

---

## Summary Table

| Criteria | LangGraph Only | Workflows Only | Hybrid (Workflows + LangGraph) |
|----------|----------------|----------------|-------------------------------|
| **AI Orchestration** | ✅ Excellent | ⚠️ Adequate | ✅ Excellent |
| **LLM Observability** | ✅ LangSmith native | ❌ Must instrument | ✅ LangSmith native |
| **Event-Driven** | ❌ Manual/Polling | ✅ Native triggers | ✅ Native triggers |
| **User Customization** | ❌ Code-only | ✅ UI-based | ✅ UI-based |
| **Implementation Speed** | ✅ Fast (reuse AD) | ⚠️ Slower (new pattern) | ⚠️ Medium |
| **Competitive Parity** | ⚠️ Partial (missing UX) | ✅ Full (event + config) | ✅ Full + better AI |
| **For Foundation Spike** | ✅ **BEST** | ❌ Too slow | ❌ Overkill |
| **For Production** | ⚠️ Acceptable | ⚠️ Acceptable | ✅ **BEST** |

---

## Action Items

### Immediate (Foundation Spike)
- ✅ **Keep LangGraph** - Already implemented, don't change
- ✅ **Document decision** - This file

### Week 2 (Production Planning)
- [ ] **Evaluate Workflows maturity** - Test parallel execution, check stack gaps
- [ ] **Design Hybrid architecture** - Workflows wrapper for LangGraph
- [ ] **Coordinate with ResponseOps team** - Workflows system owners

### Week 3-4 (Production Implementation)
- [ ] **Implement Hybrid** - Register LangGraph as workflow step
- [ ] **Add triggers** - Alert creation events
- [ ] **User customization** - Workflow config UI

---

## Conclusion

**For Foundation Spike:** ✅ **LangGraph is the correct choice**
- Faster, AI-optimized, proven, sufficient for spike scope

**For Production:** 🎯 **Hybrid is superior**
- Event-driven (like competitors)
- User-configurable (like competitors)
- AI-optimized (better than competitors via LangSmith)
- Best of both worlds

**The foundation spike's LangGraph investment will NOT be wasted** - it becomes a workflow step in production, preserving all agent logic while gaining event-driven and customization capabilities.
