# LLM-Powered Alert Investigation - Production-Ready Spike Blueprint

**Created:** 2026-03-22
**Effort:** Foundation Spike (1 week) → Full Implementation (3-4 weeks)
**Target:** 10.1 GA
**Dependencies:** NONE (works on any alert)
**Scope:** ALL high-risk alerts (300K/month)

---

## Executive Summary

Autonomous multi-agent investigation system that transforms security alerts into fully investigated incidents in <10 minutes, matching Dropzone AI and Torq HyperSOC capabilities.

**Value Proposition:**
- **Time Savings:** 15-30 min/alert → <10 min autonomous investigation = 90% reduction
- **Throughput:** 300K investigations/month (vs 20K manual capacity)
- **Quality:** 6.5x better detection (Microsoft Copilot benchmark)
- **Cost:** $30/month LLM (vs $150K/month analyst time)

**ROI:** $500K/year savings (massive)

---

## Problem Statement

**Current State:**
Alert is created → Analyst manually:
1. Triages severity (3-5 min)
2. Looks up threat intel (5-10 min)
3. Maps to MITRE ATT&CK (2-3 min)
4. Investigates related activity (10-20 min)
5. Recommends remediation (5-10 min)

**Total: 25-48 min per alert**

**For 300K high-risk alerts/month:**
- Human capacity: ~20K investigations/month (10 analysts)
- **Backlog: 280K uninvestigated alerts** (93% coverage gap)

---

## Solution

**5-Agent Autonomous Investigation Pipeline**

```
High-Risk Alert Created
  ↓
Agent 1: Triage Agent (5-10s)
  - Classify: CRITICAL/HIGH/MEDIUM/LOW
  - Determine: Malware/Phishing/Lateral Movement/C2/Exfiltration
  - Confidence: 0-100%
  - Tool: ES query for similar past alerts
  ↓
Agent 2: Enrichment Agent (CTI RAG) (10-15s)
  - Query: MISP, VirusTotal, AlienVault (via connectors)
  - Extract: Threat actor, campaign, IOCs
  - Context: Have we seen this before?
  - Tool: ELSER embeddings + ES kNN for CTI lookup
  ↓
Agent 3: MITRE Mapper (3-5s)
  - Map: MITRE ATT&CK techniques
  - Identify: Attack phase, tactics
  - Visualize: ATT&CK Navigator layer
  - Tool: MITRE framework + LLM
  ↓
Agent 4: Investigation Agent (20-30s)
  - Hypothesis: What happened? What's next?
  - Evidence: Query ES for corroborating alerts/logs
  - Timeline: Build attack narrative
  - Tool: ES queries, entity graph traversal
  ↓
Agent 5: Remediation Agent (5-10s)
  - Recommend: Response actions (isolate, block, investigate)
  - Impact: Blast radius analysis
  - Runbook: Step-by-step remediation
  - Tool: Response actions API, case templates
  ↓
Update Case with Full Investigation
  - Investigation complete in <1 min
  - Analyst reviews (not investigates)
  - 90-95% time reduction
```

**Total Latency:** 43-70 seconds (target: <10 min for complex cases)

---

## Architecture (Reuse Attack Discovery Infrastructure)

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│  INVESTIGATION ORCHESTRATOR (LangGraph StateGraph)          │
│  x-pack/.../elastic_assistant/server/lib/                   │
│      alert_investigation/graphs/investigation_graph.ts       │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┴─────────────────┬─────────────────┬──────────┐
    │                            │                 │          │
┌───▼──────┐  ┌────────▼──────┐  ┌──────▼─────┐  ┌──▼──────┐
│ Triage   │  │  Enrichment   │  │   MITRE    │  │Remediate│
│  Agent   │  │  (CTI RAG)    │  │   Mapper   │  │  Agent  │
│          │  │               │  │            │  │         │
│Claude    │  │Claude + ELSER │  │Claude      │  │Claude   │
│Haiku     │  │+ Connectors   │  │Haiku       │  │Haiku    │
└───┬──────┘  └────────┬──────┘  └──────┬─────┘  └──┬──────┘
    │                  │                 │           │
    └──────────────────┴─────────────────┴───────────┘
                       │
            ┌──────────▼───────────┐
            │   TOOL REGISTRY      │
            │ - ES Query           │
            │ - CTI Connectors     │
            │ - ELSER Embeddings   │
            │ - Entity Graph       │
            │ - Response Actions   │
            └──────────────────────┘
```

---

## Foundation Spike Scope (1 Week - Proof of Concept)

**Implement 2 Core Agents (Proves Pattern):**

### Agent 1: Triage Agent (Day 1-2)

**Purpose:** Classify alert severity and type

**Implementation:**
```typescript
// server/lib/elastic_assistant/server/lib/alert_investigation/agents/triage_agent.ts

export async function createTriageAgent(llmClient: ChatAnthropic) {
  const tools = [
    {
      name: 'query_similar_alerts',
      description: 'Query Elasticsearch for similar past alerts',
      schema: z.object({
        entityValue: z.string(),
        entityType: z.enum(['ip', 'user', 'host', 'process']),
        limit: z.number().default(10),
      }),
      execute: async ({ entityValue, entityType, limit }) => {
        const esClient = getEsClient();
        const results = await esClient.search({
          index: '.alerts-security.alerts-*',
          body: {
            query: {
              bool: {
                should: [
                  { term: { [`${entityType}.name`]: entityValue } },
                  { term: { [`${entityType}.ip`]: entityValue } },
                ],
              },
            },
            size: limit,
            sort: [{ '@timestamp': 'desc' }],
          },
        });
        return JSON.stringify(results.hits.hits.map(h => h._source));
      },
    },
  ];

  const systemPrompt = `You are an expert security analyst triaging alerts.

Your task:
1. Query for similar past alerts (use query_similar_alerts tool)
2. Classify severity: CRITICAL, HIGH, MEDIUM, or LOW
3. Determine attack type: Malware, Phishing, Lateral Movement, C2, Exfiltration, Brute Force, or Unknown
4. Provide confidence score (0-100%)

Think step-by-step and explain your reasoning.

Return JSON:
{
  "classification": "HIGH",
  "attackType": "Lateral Movement",
  "confidence": 85,
  "reasoning": "User executed suspicious commands on 5 different hosts in 1 hour - clear lateral movement pattern"
}`;

  return {
    name: 'alert-triage-agent',
    systemPrompt,
    tools,
    llmClient,
  };
}
```

---

### Agent 2: MITRE Mapper (Day 3)

**Purpose:** Map to MITRE ATT&CK (reuse from MITRE Auto-Map spike)

**Implementation:**
```typescript
// Reuse from MITRE Auto-Map spike
import { mapAlertToMitre } from '../../../detection_engine/enrichments/mitre_mapping';

export async function createMitreMapperAgent(llmClient: ChatAnthropic) {
  return {
    name: 'mitre-mapper-agent',
    execute: async (alert: Alert) => {
      return await mapAlertToMitre(alert, llmClient);
    },
  };
}
```

---

### Orchestrator (Day 4-5)

**File:** `investigation_graph.ts`

```typescript
import { StateGraph } from '@langchain/langgraph';

interface InvestigationState {
  alert: Alert;
  triage?: TriageResult;
  mitreMapping?: MitreMapping;
  caseId?: string;
}

export function createInvestigationGraph(llmClient: ChatAnthropic) {
  const workflow = new StateGraph<InvestigationState>({
    channels: {
      alert: null,
      triage: null,
      mitreMapping: null,
      caseId: null,
    },
  });

  // Add agents as nodes
  workflow.addNode('triage', async (state) => {
    const agent = await createTriageAgent(llmClient);
    const result = await agent.execute(state.alert);
    return { triage: result };
  });

  workflow.addNode('mitre', async (state) => {
    const agent = await createMitreMapperAgent(llmClient);
    const result = await agent.execute(state.alert);
    return { mitreMapping: result };
  });

  workflow.addNode('update_case', async (state) => {
    const caseUpdate = `
## 🤖 AI Investigation Results

**Classification:** ${state.triage.classification}
**Attack Type:** ${state.triage.attackType}
**Confidence:** ${state.triage.confidence}%

**MITRE ATT&CK:**
- Techniques: ${state.mitreMapping.techniques.map(t => `${t.id} (${t.name})`).join(', ')}
- Tactics: ${state.mitreMapping.tactics.map(t => t.name).join(', ')}
- Phase: ${state.mitreMapping.phase}

**Reasoning:**
${state.triage.reasoning}
`;

    await addCommentToCase(state.caseId, caseUpdate);
    return state;
  });

  // Define flow
  workflow.addEdge('__start__', 'triage');
  workflow.addEdge('triage', 'mitre');
  workflow.addEdge('mitre', 'update_case');
  workflow.addEdge('update_case', '__end__');

  return workflow.compile();
}
```

---

## Full Implementation Roadmap (3-4 Weeks)

**Foundation Spike (Week 1) - THIS DELIVERABLE:**
- ✅ Agent 1: Triage (classification)
- ✅ Agent 2: MITRE Mapper (reuse MITRE Auto-Map)
- ✅ LangGraph orchestrator
- ✅ Integration with Cases
- ✅ Proves multi-agent pattern

**Production Implementation (Weeks 2-4) - TEAM EXECUTES:**
- 🔲 Agent 3: CTI Enrichment (ELSER RAG + connectors)
- 🔲 Agent 4: Investigation (hypothesis, evidence, timeline)
- 🔲 Agent 5: Remediation (actions, runbook, impact)
- 🔲 Parallel execution (agents 3-5 run concurrently)
- 🔲 User feedback loop (RLHF)

---

## Integration with Existing Systems

### Reuse Attack Discovery Infrastructure ✅

**Already Exists in Kibana:**
```
x-pack/solutions/security/plugins/elastic_assistant/server/lib/
  attack_discovery/
    graphs/
      default_attack_discovery_graph/
        helpers/
          get_llm_client.ts  ← Reuse Claude client (auth, rate limiting)

  // Copy this pattern for alert_investigation:
  alert_investigation/     ← NEW (copy AD structure)
    graphs/
      investigation_graph.ts
    agents/
      triage_agent.ts
      enrichment_agent.ts
```

**Benefits:**
- ✅ No new auth setup (reuse Elastic Assistant Claude API key)
- ✅ No new LangGraph setup (copy proven patterns)
- ✅ Rate limiting already configured
- ✅ Error handling patterns established

---

## Cost-Benefit Analysis

**Investment:**
- Foundation spike: 1 week (1 engineer)
- Full implementation: 3 weeks (1 engineer)
- **Total: 4 weeks** (~$16K at $100/hr)

**Return:**
- Manual investigation: 300K alerts × 25 min × $50/hr = $150K/month
- Automated investigation: $30/month (LLM) + $50K/month (analyst review) = $50.03K/month
- **Savings: $100K/month** ($1.2M/year)

**ROI: 7,500%** (75x return)

**Payback Period:** 5 days

---

## Success Criteria

**Foundation Spike Complete When:**
1. ✅ 2 agents working (Triage + MITRE)
2. ✅ LangGraph orchestrator functioning
3. ✅ Integration with Cases
4. ✅ Feature flag (`llmInvestigationEnabled`)
5. ✅ Unit tests passing (20+ tests)
6. ✅ Manual validation: Alert → Auto-investigation → Case updated
7. ✅ Latency: <30s for 2-agent investigation

**Full Implementation Complete When:**
- All 5 agents implemented
- Parallel execution working
- User feedback UI
- Production monitoring

---

## Competitive Positioning

**After Foundation Spike:**
- ⚠️ Partial parity (2/5 agents vs Dropzone's full suite)
- ✅ Proves feasibility
- ✅ Establishes patterns

**After Full Implementation:**
- ✅ Matches Dropzone (<10 min investigations)
- ✅ Matches Torq (90% Tier-1 automation)
- ✅ Matches Microsoft (6.5x detection)
- ✅ Unique: Unified Elastic platform (no integration)

**Messaging:**
> "Dropzone-level autonomous investigation within your Elastic stack. <10 minute investigations, no data egress, no integration complexity."

---

**This blueprint provides clear path from foundation (1 week) to production (4 weeks total).**
