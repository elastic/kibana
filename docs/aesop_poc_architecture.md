# AESOP PoC Architecture
# Agent-driven Exploration for Security Operations Proficiency

**Author:** Patryk Kopycinski + Claude
**Date:** 2026-03-21
**Paper:** "Beyond Prescribed Intelligence: Toward Self-Directed Skill Acquisition in LLM-Based Cybersecurity Agents" by Mika Ayenson (Elastic, March 2026)
**Status:** Architecture Design → Implementation Ready

---

## Executive Summary

This document outlines the architecture for an AESOP (Agent-driven Exploration for Security Operations Proficiency) proof-of-concept implementation in Kibana. The PoC demonstrates **self-directed skill acquisition** where an LLM agent autonomously explores a security environment, discovers patterns, generates Agent Builder skills, validates them through evaluations, and presents them for human review.

**Core Innovation:** Instead of human engineers manually creating skills (prescribed intelligence), the agent teaches itself by exploring real security data with read-only access, then proposes skills that humans review before deployment.

**Key Differentiators:**
- ✅ **100% Elastic-Native** - Zero external dependencies (no LangGraph, no external trace storage)
- ✅ **Workflows-Based Orchestration** - Declarative YAML (not imperative code) using Kibana Workflows
- ✅ **O11y Traces as PRIMARY Validation** - Uses OTEL traces in `traces-*` indices (not LangSmith)
- ✅ **Leverages Existing Infrastructure** - Extends evals plugin (PR #254845), Agent Builder, Workflows
- ✅ **Read-only safety** - Agent explores with zero write permissions during discovery
- ✅ **Human-in-the-loop** - All generated skills require explicit approval
- ✅ **LangSmith is OPTIONAL** - Used only for cross-validation (goal: drop it completely)

---

## 🎯 Architecture Changes (Based on Feedback)

### Change 1: Workflows Instead of LangGraph ✅

**Before**: Custom LangGraph implementation (~500 lines of Python/TS code)

**After**: Kibana Workflows YAML definition (~150 lines)

**Why**:
- Workflows is native to Kibana (Agent Builder already uses it)
- Declarative > imperative (easier to read/modify)
- Built-in Elasticsearch steps (`elasticsearch.request`, `elasticsearch.esql.query`)
- Native Agent Builder integration (`ai.agent` step type)
- ~60% less code

---

### Change 2: O11y Traces as PRIMARY (Not LangSmith) ✅

**Before**: LangSmith as primary trace storage and validation

**After**: OTEL traces in Elasticsearch `traces-*` indices (LangSmith only for cross-validation)

**Why**:
- Data sovereignty (traces stay in-cluster)
- Zero cost (vs $500+/month for LangSmith)
- Already integrated (evals plugin reads from `traces-*`)
- More powerful querying (ES|QL vs LangSmith API)
- Strategic: **Goal is to DROP LangSmith completely**

**From PR #254845**:
- Evals plugin already reads from `traces-*`
- TraceWaterfall component visualizes OTEL spans
- Trace-based evaluators extract metrics (tokens, latency, tools)

---

### Change 3: Extend Existing Evals Plugin (Don't Build New) ✅

**Before**: Build new `aesop_ui` plugin from scratch

**After**: Extend existing `evals` plugin with AESOP pages

**Why**:
- Evals plugin (PR #254845) already has 90% of what we need:
  - ✅ UI for viewing eval runs (`/app/evals`)
  - ✅ TraceWaterfall component (OTEL trace visualization)
  - ✅ Dataset management (CRUD APIs + UI)
  - ✅ API routes for runs, scores, traces
- We just ADD:
  - 🆕 AESOP exploration monitoring
  - 🆕 Proposed skills review workflow
  - 🆕 Skill approval/deployment UI
- **Saves ~48 hours of UI development**

---

## Revised Effort Estimate

**Original plan**: 6 weeks, 240 hours

**With Workflows + Existing Evals Plugin**: **5 weeks, ~176 hours**

**Savings breakdown**:
- -8 hours (Workflows YAML vs LangGraph code)
- -8 hours (trace evaluators already exist)
- -48 hours (extend evals plugin vs build new)
- **Total savings**: 64 hours (~1.5 weeks)

---

## Research Paper Context

### Five Limitations of Prescribed Intelligence (From Paper)

| Limitation | Description | AESOP Solution |
|------------|-------------|----------------|
| **L1: Tool Brittleness** | Static integrations break when tools evolve | Agent re-explores on environment changes |
| **L2: Expert Bottleneck** | Requires expert articulation + engineer encoding | Agent explores directly, bypasses decomposition |
| **L3: Tacit Knowledge** | Pattern recognition resists explicit formulation | Telemetry-driven pattern discovery (partial) |
| **L4: Scalability Collapse** | Human effort doesn't scale with threat landscape | Exploration replaces enumeration |
| **L5: Adversarial Fragility** | Static integrations create predictable attack surfaces | Versioned, signed skill library with audit |

### AESOP Framework (From Paper, Section 6)

```
┌──────────────────────────────────────────────────┐
│              AESOP Architecture                   │
│                                                    │
│  Self-Exploring Agent (read-only)                 │
│         ↓                                          │
│  Discovers: APIs, schemas, tools, relationships    │
│         ↓                                          │
│  Proposes: Executable skill specifications        │
│         ↓                                          │
│  Human Review Gate (approve/reject/feedback)      │
│         ↓                                          │
│  Skill Library (versioned, auditable)             │
│         ↓                                          │
│  Deploy to Production (only approved skills)      │
│                                                    │
│  Cycle: Explore → Propose → Review → Deploy →     │
│         Improve (continuous)                       │
└──────────────────────────────────────────────────┘
```

**Empirical Evidence (From Tables 2-4 in Paper):**
- CASCADE: 93.3% vs 35.4% (self-evolving vs static)
- SEAgent: +23.2% improvement through experiential learning
- MCP-Zero: 98% token reduction via active discovery
- Frontier models: Only 33-44% success on complex MCP tasks

---

## AESOP-in-Kibana Architecture

### High-Level System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                     AESOP PoC - Kibana Implementation                  │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  1. DEMO ENVIRONMENT (Multi-Persona Synthetic Data)                   │
├──────────────────────────────────────────────────────────────────────┤
│  Elasticsearch Cluster                                                │
│  ├─ Security Alerts (ep1-ep8 episodes + synthetic data)               │
│  ├─ SIEM Events (.siem-signals-*, .alerts-security.alerts-*)         │
│  ├─ APM Traces (multiple services)                                    │
│  ├─ Logs (observability, security, platform)                          │
│  ├─ Metrics (infrastructure, application)                             │
│  └─ Persona Behaviors (SOC analyst, SRE, developer query patterns)    │
│                                                                        │
│  Purpose: Provide rich, diverse data for agent exploration            │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (read-only access)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  2. SELF-EXPLORATION AGENT (Read-Only Discovery)                      │
├──────────────────────────────────────────────────────────────────────┤
│  LangGraph Workflow (extends Attack Discovery pattern)                │
│                                                                        │
│  Nodes:                                                                │
│  ┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐│
│  │ Schema         │ ──→ │ Pattern         │ ──→ │ Skill            ││
│  │ Discovery      │     │ Mining          │     │ Synthesis        ││
│  └────────────────┘     └─────────────────┘     └──────────────────┘│
│         │                       │                        │            │
│         ↓                       ↓                        ↓            │
│  Tools:                  Tools:                   Tools:              │
│  - ES Schema API         - ES Query (read-only)   - Agent Builder API│
│  - Mappings API          - Aggregations           - Skill Templates  │
│  - Index Stats           - Process Mining         - Pattern Matching │
│                          - Correlation Analysis                       │
│                                                                        │
│  Output: Proposed Agent Builder skills (JSON + markdown)              │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (proposed skills)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  3. SKILL VALIDATION PIPELINE (@kbn/evals Integration)                │
├──────────────────────────────────────────────────────────────────────┤
│  For each proposed skill:                                             │
│                                                                        │
│  ┌──────────────┐     ┌─────────────┐     ┌────────────────┐        │
│  │ Generate     │ ──→ │ Run Evals   │ ──→ │ Analyze        │        │
│  │ Eval Dataset │     │ (K ibana)    │     │ Results        │        │
│  └──────────────┘     └─────────────┘     └────────────────┘        │
│                              │                      │                 │
│                              │                      ↓                 │
│                              │         ┌──────────────────────┐      │
│                              │         │ Pass Threshold?      │      │
│                              │         └──────┬───────┬───────┘      │
│                              │                │ YES   │ NO           │
│                              │                ↓       ↓              │
│                              │         ┌────────┐  ┌──────────┐     │
│                              │         │ Ready  │  │ Improve  │     │
│                              │         │for     │  │ & Retry  │     │
│                              │         │Review  │  └────┬─────┘     │
│                              │         └────────┘       │            │
│                              │                          │            │
│                              └──────────────────────────┘            │
│                                    (iterative improvement)            │
│                                                                        │
│  Uses: @kbn/evals executor, LangSmith integration, convergence logic │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (validated skills)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  4. KIBANA EVALS UI (New Plugin)                                      │
├──────────────────────────────────────────────────────────────────────┤
│  React Application in Kibana                                          │
│                                                                        │
│  Features:                                                             │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │ Dashboard                                                  │       │
│  │  - Active eval runs (real-time progress)                  │       │
│  │  - Historical results (pass/fail over time)               │       │
│  │  - Skill quality metrics                                  │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │ Eval Execution                                             │       │
│  │  - Select skill to evaluate                               │       │
│  │  - Configure model/connector                              │       │
│  │  - Monitor real-time progress                             │       │
│  │  - View detailed results with reasoning                   │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────┐       │
│  │ Skill Review Workflow                                      │       │
│  │  - View proposed skill (markdown + JSON)                  │       │
│  │  - See eval results (scores, traces, failures)            │       │
│  │  - Approve / Reject / Request Changes                     │       │
│  │  - Add to Agent Builder (one-click deployment)            │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                        │
│  API: `/api/aesop/evals/...` (new routes in agent_builder plugin)    │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (approved skills)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  5. AGENT BUILDER SKILL LIBRARY                                       │
├──────────────────────────────────────────────────────────────────────┤
│  Versioned Skill Storage                                              │
│                                                                        │
│  ┌───────────────────────────────────────────────────────┐           │
│  │ Skill Metadata                                         │           │
│  │  - id, name, description                              │           │
│  │  - source: "aesop" (vs "manual")                       │           │
│  │  - confidence_score (from evals)                      │           │
│  │  - eval_results (historical)                          │           │
│  │  - approval_metadata (who, when, notes)               │           │
│  │  - provenance (exploration trace_id)                  │           │
│  └───────────────────────────────────────────────────────┘           │
│                                                                        │
│  ┌───────────────────────────────────────────────────────┐           │
│  │ Skill Content                                          │           │
│  │  - markdown (instructions for LLM)                    │           │
│  │  - tools (list of tool IDs)                           │           │
│  │  - examples (few-shot demonstrations)                 │           │
│  └───────────────────────────────────────────────────────┘           │
│                                                                        │
│  Integration: Existing Agent Builder skills API + new metadata fields │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### Component 1: Demo Environment with Multi-Persona Simulation

**Purpose**: Generate rich, diverse security data that mimics real SOC environments with different user behaviors

**Architecture**:

```typescript
// Data Generation Pipeline

interface Persona {
  id: string;
  role: 'soc_analyst' | 'sre' | 'developer' | 'security_engineer';
  behaviors: QueryPattern[];
  tools: string[]; // SIEM, APM, Logs, etc.
  skillLevel: 'junior' | 'mid' | 'senior';
}

// Personas to simulate
const personas: Persona[] = [
  {
    id: 'alice_soc_analyst',
    role: 'soc_analyst',
    behaviors: [
      { pattern: 'triage_high_severity_alerts', frequency: 'hourly' },
      { pattern: 'investigate_suspicious_ips', frequency: 'daily' },
      { pattern: 'correlate_related_alerts', frequency: 'daily' },
      { pattern: 'enrich_with_threat_intel', frequency: 'weekly' },
    ],
    tools: ['SIEM', 'Cases', 'Threat Intel', 'MITRE ATT&CK'],
    skillLevel: 'senior',
  },
  {
    id: 'bob_sre',
    role: 'sre',
    behaviors: [
      { pattern: 'monitor_service_performance', frequency: 'continuous' },
      { pattern: 'investigate_anomalies', frequency: 'hourly' },
      { pattern: 'trace_errors', frequency: 'daily' },
    ],
    tools: ['APM', 'Logs', 'Metrics', 'Traces'],
    skillLevel: 'mid',
  },
  {
    id: 'charlie_developer',
    role: 'developer',
    behaviors: [
      { pattern: 'debug_application_errors', frequency: 'daily' },
      { pattern: 'analyze_performance', frequency: 'weekly' },
    ],
    tools: ['Logs', 'APM', 'Discover'],
    skillLevel: 'junior',
  },
];
```

**Data Types to Generate**:

1. **Security Alerts** (MITRE ATT&CK aligned):
   - Episodes 1-8 (existing ep1-ep8 data) - ~13MB of attack scenarios
   - Synthetic alerts for additional TTPs (T1059 PowerShell, T1071 C2, T1003 Credential Dumping, etc.)
   - Mix of true positives (70%) and false positives (30%)
   - Risk scores distributed: Critical (5%), High (15%), Medium (30%), Low (50%)

2. **APM Traces** (distributed tracing):
   - 10 microservices (auth, api-gateway, data-processor, ml-service, etc.)
   - Normal behavior: 95% success rate, p50 latency <200ms
   - Anomalies: sudden latency spikes, error rate increases, dependency failures
   - OTEL-compatible traces for @kbn/evals integration

3. **Logs** (structured + unstructured):
   - Application logs (INFO, WARN, ERROR, DEBUG)
   - Security logs (authentication, authorization, audit)
   - Infrastructure logs (nginx, kubernetes, docker)
   - 1M+ log entries spanning 30 days

4. **Metrics** (time-series):
   - Infrastructure: CPU, memory, disk, network
   - Application: request rate, error rate, latency
   - Business: user activity, feature usage

5. **Persona Query Patterns** (simulated user behavior):
   - Alice (SOC analyst): 100+ SIEM queries per day
   - Bob (SRE): 50+ APM/logs queries per day
   - Charlie (Developer): 20+ debug queries per day

**Implementation**:

```bash
# Data generation script
# x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo_data_generator.ts

import { Client } from '@elastic/elasticsearch';
import { generateMITREAttackScenario } from './generators/mitre_scenarios';
import { generatePersonaQueries } from './generators/persona_simulation';
import { generateAPMTraces } from './generators/apm_traces';

async function generateDemoData(esClient: Client) {
  // 1. Load existing episode data (ep1-ep8)
  await loadEpisodeData(esClient, 'episodes/attacks/');

  // 2. Generate additional MITRE scenarios (cover all 14 tactics)
  for (const tactic of MITRE_TACTICS) {
    const scenario = await generateMITREAttackScenario(tactic);
    await ingestScenario(esClient, scenario);
  }

  // 3. Simulate persona behaviors (30 days of activity)
  for (const persona of personas) {
    const queries = generatePersonaQueries(persona, 30); // days
    await recordPersonaBehavior(esClient, persona, queries);
  }

  // 4. Generate APM traces (1M spans)
  await generateAPMTraces(esClient, {
    services: 10,
    spansPerDay: 100000,
    days: 10,
  });

  // 5. Generate logs (structured + unstructured)
  await generateLogs(esClient, {
    entriesPerDay: 50000,
    days: 30,
  });

  console.log('✅ Demo environment ready with multi-persona data');
}
```

**Storage Requirements**: ~500MB (compressed NDJSON) → ~2GB in Elasticsearch

---

### Component 2: Self-Exploration Agent (Read-Only Mode)

**Purpose**: Autonomously discover Elasticsearch schemas, data relationships, and query patterns WITHOUT write access

**Safety Constraints** (From Paper Section 8: Threat Model):
- ✅ READ-ONLY credentials (no write, update, delete permissions)
- ✅ Network segmentation (agent cannot reach external APIs during exploration)
- ✅ Audit logging (all queries logged with trace IDs)
- ✅ Scoped access (only indices relevant to SOC role)

**Architecture**: Kibana Workflows (YAML-based declarative orchestration)

```yaml
# Self-Exploration Workflow (YAML-based, not Python/TS code)
# File: x-pack/platform/plugins/shared/aesop_ui/workflows/self_exploration.yaml

version: '1'
name: AESOP Self-Exploration
description: Autonomously explores Elasticsearch (read-only) to discover schemas, relationships, patterns, and propose Agent Builder skills

triggers:
  - type: manual  # Triggered from AESOP UI
  - type: scheduled  # Weekly re-exploration
    schedule:
      rrule: FREQ=WEEKLY;BYDAY=MO;BYHOUR=2

inputs:
  - name: agent_role
    type: string
    default: "SOC analyst"
  - name: scoped_indices
    type: array
    default: [".alerts-*", ".siem-signals-*", "logs-*"]

steps:
  # ────────────────────────────────────────────
  # STEP 1: SCHEMA DISCOVERY
  # ────────────────────────────────────────────
  - name: discover_indices
    type: elasticsearch.request
    with:
      method: GET
      path: /_cat/indices
      params: { format: json }

  - name: get_mappings
    type: foreach
    iterate: steps.discover_indices.output
    steps:
      - name: fetch_mapping
        type: elasticsearch.request
        with:
          method: GET
          path: /{{ item.index }}/_mapping

  - name: categorize_schemas
    type: ai.agent
    agent-id: aesop.schema_categorizer
    with:
      message: "Categorize indices: {{ steps.get_mappings.output | json }}"

  # ────────────────────────────────────────────
  # STEP 2: DATA PROFILING
  # ────────────────────────────────────────────
  - name: profile_data
    type: foreach
    iterate: steps.categorize_schemas.output.security_indices
    steps:
      - name: sample_docs
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ item }}/_search
          body: { size: 100, query: { match_all: {} } }

      - name: run_aggs
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ item }}/_search
          body:
            size: 0
            aggs:
              by_severity: { terms: { field: kibana.alert.severity } }

  # ────────────────────────────────────────────
  # STEP 3: RELATIONSHIP MAPPING
  # ────────────────────────────────────────────
  - name: discover_relationships
    type: ai.agent
    agent-id: aesop.relationship_mapper
    with:
      message: "Find joins: {{ steps.profile_data.output | json }}"

  # ────────────────────────────────────────────
  # STEP 4: PATTERN MINING
  # ────────────────────────────────────────────
  - name: mine_patterns
    type: elasticsearch.request
    with:
      method: POST
      path: /.aesop-persona-behaviors/_search
      body:
        size: 0
        aggs:
          patterns: { terms: { script: "..." } }

  - name: analyze_patterns
    type: ai.agent
    agent-id: aesop.pattern_analyzer
    with:
      message: "Identify automation opportunities: {{ steps.mine_patterns.output | json }}"

  # ────────────────────────────────────────────
  # STEP 5: SKILL SYNTHESIS
  # ────────────────────────────────────────────
  - name: generate_skills
    type: foreach
    iterate: steps.analyze_patterns.output.proposals
    steps:
      - name: synthesize_skill
        type: ai.agent
        agent-id: aesop.skill_synthesizer
        with:
          message: "Generate Agent Builder skill: {{ item | json }}"

      - name: store_proposed_skill
        type: elasticsearch.index
        with:
          index: .aesop-proposed-skills
          body:
            name: "{{ item.name }}"
            markdown: "{{ steps.synthesize_skill.output }}"
            status: proposed
```

**Why Workflows > LangGraph:**
- ✅ Declarative YAML (not imperative code)
- ✅ Built-in Elasticsearch steps (`elasticsearch.request`, `elasticsearch.esql.query`)
- ✅ Native Agent Builder integration (`ai.agent` step type)
- ✅ Conditional logic (`if/then/else`, `foreach`, `on-failure`)
- ✅ Variable templating (`{{steps.X.output.Y}}`)
- ✅ Already proven in Kibana (Cases workflows, data source connectors)
- ✅ ~60% less code than LangGraph implementation

**Workflow Variable Management** (Workflows use Liquid templating, not state objects):

```yaml
# Workflows automatically pass outputs between steps via {{steps.X.output.Y}} syntax
# No manual state management needed!

# Example: Access previous step outputs
steps:
  - name: discover_indices
    type: elasticsearch.request
    # ... returns: [{ index: ".alerts-*", docs: 1000 }, ...]

  - name: categorize
    type: ai.agent
    with:
      # Access previous step output via Liquid template
      message: "Categorize: {{ steps.discover_indices.output | json }}"
      # Output: { categories: {...}, relationships: [...] }

  - name: profile_security
    type: foreach
    # Iterate over categorized indices
    iterate: steps.categorize.output.categories.security
    steps:
      - name: sample_docs
        type: elasticsearch.request
        with:
          path: /{{ item }}/_search  # item = current iteration value
```

**Proposed Skill Storage** (Elasticsearch document):

```typescript
// Stored in .aesop-proposed-skills index

interface ProposedSkillDocument {
  id: string; // UUID
  name: string;
  description: string;
  markdown: string; // Agent Builder skill content
  tools: string[]; // Tool IDs to attach
  examples: Example[];
  confidence: number; // 0-1, how confident agent is this skill is useful
  source: {
    patterns: string[]; // Which patterns led to this skill
    data: string[]; // Which indices informed this skill
    rationale: string; // Why agent thinks this skill is needed
  };
  metadata: {
    discovery_trace_id: string;  // OTEL trace ID from exploration workflow
    discovery_workflow_execution_id: string;  // Workflow execution ID
    created_at: string;
    exploration_depth: number;
  };
  validation: {
    status: 'pending' | 'validating' | 'passed' | 'failed';
    eval_run_id?: string;  // Links to kibana-evaluations* run
    eval_trace_id?: string;  // OTEL trace ID from validation
    final_score?: number;
    iterations?: ValidationIteration[];
  };
  review: {
    status: 'pending_review' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
  };
  deployment: {
    deployed: boolean;
    agent_builder_skill_id?: string;  // ID in Agent Builder after deployment
    deployed_at?: string;
  };
}
```

**Workflow Definition** (Full YAML - see Section "Concrete Example" below for complete workflow):

Instead of writing 500+ lines of TypeScript code for state management and node functions, we define the exploration logic in **~150 lines of declarative YAML**.

**Key Workflow Features Used**:

1. **Sequential Steps**: Steps run in order (schema → profile → relationships → patterns → skills)
2. **Conditional Logic**: `if` steps for branching (e.g., skip profiling if no indices found)
3. **Loops**: `foreach` to iterate over discovered indices
4. **Agent Invocation**: `ai.agent` step calls Agent Builder agents (schema_categorizer, pattern_analyzer, skill_synthesizer)
5. **Variable Passing**: `{{steps.previous.output.field}}` Liquid templating
6. **Elasticsearch Integration**: Built-in `elasticsearch.request` and `elasticsearch.esql.query` steps
7. **Error Handling**: `on-failure` steps for graceful degradation
8. **Timeouts**: Per-step timeouts prevent infinite loops

**Example: Skill Synthesis Step** (YAML, not code):

```yaml
steps:
  # ... previous steps (discover, profile, mine patterns) ...

  - name: generate_skills
    type: foreach
    iterate: steps.analyze_patterns.output.proposals
    steps:
      - name: synthesize_skill
        type: ai.agent
        agent-id: aesop.skill_synthesizer
        with:
          message: |
            Generate Agent Builder skill for pattern:
            {{ item | json }}

            Return skill markdown in Agent Builder format.
        timeout: 120s

      - name: store_proposed_skill
        type: elasticsearch.index
        with:
          index: .aesop-proposed-skills
          id: skill-{{ item.id }}
          body:
            name: "{{ item.name }}"
            markdown: "{{ steps.synthesize_skill.output }}"
            tools: "{{ item.tools }}"
            confidence: "{{ item.confidence }}"
            status: proposed
            metadata:
              discovery_workflow_execution_id: "{{ workflow.execution_id }}"
              created_at: "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}"
```

**Workflow Execution** (triggered via API):

```typescript
// server/routes/aesop/exploration/run_exploration.ts

router.post({
  path: '/api/aesop/exploration/run',
  // ...
}, async (context, request, response) => {
  const { workflowApi } = context.plugins.workflowsManagement;

  // Execute the self-exploration workflow
  const result = await executeWorkflow({
    workflowId: 'aesop.self_exploration',
    workflowParams: {
      agent_role: request.body.role,
      scoped_indices: request.body.scopedIndices,
    },
    request,
    spaceId: 'default',
    workflowApi,
    waitForCompletion: true,
    completionTimeoutSec: 7200, // 2 hours max
  });

  return response.ok({ body: result });
});
```

---

## Complete Self-Exploration Workflow (YAML)

**File**: `x-pack/platform/plugins/shared/evals/server/workflows/aesop/self_exploration.yaml`

```yaml
version: '1'
name: AESOP Self-Exploration Agent
description: Autonomously explores Elasticsearch environment (read-only) to discover schemas, relationships, patterns, and propose Agent Builder skills. Implements framework from "Beyond Prescribed Intelligence" paper (Ayenson, 2026).
enabled: true
tags:
  - aesop
  - self-exploration
  - skill-generation
  - agent-builder

triggers:
  - type: manual
  - type: scheduled
    schedule:
      rrule: FREQ=WEEKLY;BYDAY=MO;BYHOUR=2;BYMINUTE=0

inputs:
  - name: agent_role
    type: string
    default: "SOC analyst"
    description: "Role description for the exploring agent"

  - name: scoped_indices
    type: array
    default:
      - ".alerts-security.alerts-*"
      - ".siem-signals-*"
      - "logs-endpoint.*"
      - "logs-system.*"
    description: "Indices to explore (agent gets READ-ONLY access to these)"

  - name: exploration_depth
    type: integer
    default: 5
    description: "How many sample documents per index (1-100)"

  - name: min_pattern_frequency
    type: integer
    default: 10
    description: "Minimum occurrences to consider a pattern"

consts:
  max_samples: 100
  min_confidence: 0.7

steps:
  # ══════════════════════════════════════════════════════════════
  # PHASE 1: SCHEMA DISCOVERY (Read-Only Elasticsearch Exploration)
  # ══════════════════════════════════════════════════════════════

  - name: discover_indices
    type: elasticsearch.request
    with:
      method: GET
      path: /_cat/indices
      params:
        format: json
        h: index,docs.count,store.size
    timeout: 30s

  - name: get_all_mappings
    type: foreach
    iterate: steps.discover_indices.output
    steps:
      - name: fetch_index_mapping
        type: elasticsearch.request
        with:
          method: GET
          path: /{{ item.index }}/_mapping

  - name: categorize_indices_with_llm
    type: ai.agent
    agent-id: aesop.schema_categorizer
    with:
      message: |
        You are a SOC analyst exploring an Elasticsearch cluster.

        Discovered {{ steps.discover_indices.output | size }} indices:
        {{ steps.discover_indices.output | json }}

        Mappings:
        {{ steps.get_all_mappings.output | json }}

        Categorize by purpose: security, observability, infrastructure, business_logic.
        Identify security-relevant indices.
        Suggest relationships (e.g., alerts ref hosts via host.name).

        Return JSON:
        {
          "categories": {
            "security": ["index1", ...],
            "observability": [...],
            ...
          },
          "prioritized_security_indices": [...],
          "suggested_relationships": [
            { "from": "index1", "to": "index2", "via": "field", "confidence": 0.9 }
          ]
        }
    timeout: 180s

  # ══════════════════════════════════════════════════════════════
  # PHASE 2: DATA PROFILING (Understanding Data Characteristics)
  # ══════════════════════════════════════════════════════════════

  - name: profile_security_indices
    type: foreach
    iterate: steps.categorize_indices_with_llm.output.prioritized_security_indices
    steps:
      - name: sample_documents
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ item }}/_search
          body:
            size: {{ inputs.exploration_depth }}
            query: { match_all: {} }
            sort: [{ '@timestamp': desc }]

      - name: analyze_field_distribution
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ item }}/_search
          body:
            size: 0
            aggs:
              by_severity:
                terms: { field: kibana.alert.severity, size: 10 }
              by_rule:
                terms: { field: kibana.alert.rule.name, size: 20 }
              by_host:
                cardinality: { field: host.name }
              by_user:
                cardinality: { field: user.name }
              over_time:
                date_histogram:
                  field: '@timestamp'
                  calendar_interval: day

  # ══════════════════════════════════════════════════════════════
  # PHASE 3: RELATIONSHIP VALIDATION (Testing Join Hypotheses)
  # ══════════════════════════════════════════════════════════════

  - name: test_suggested_relationships
    type: foreach
    iterate: steps.categorize_indices_with_llm.output.suggested_relationships
    steps:
      - name: sample_join_keys
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ item.from }}/_search
          body:
            size: 10
            _source: ["{{ item.via }}"]

      - name: validate_relationship
        type: elasticsearch.esql.query
        with:
          query: |
            FROM {{ item.from }}
            | WHERE {{ item.via }} IS NOT NULL
            | LIMIT 10
            | LOOKUP {{ item.to }} ON {{ item.via }}
            | STATS match_count = COUNT()
          format: json

      - name: store_validated_relationship
        type: elasticsearch.index
        with:
          index: .aesop-discovered-relationships
          body:
            from: "{{ item.from }}"
            to: "{{ item.to }}"
            via: "{{ item.via }}"
            validated: "{{ steps.validate_relationship.output.values[0][0] > 0 }}"
            match_count: "{{ steps.validate_relationship.output.values[0][0] }}"

  # ══════════════════════════════════════════════════════════════
  # PHASE 4: PATTERN MINING (Query Pattern Discovery)
  # ══════════════════════════════════════════════════════════════

  - name: mine_persona_query_patterns
    type: elasticsearch.request
    with:
      method: POST
      path: /.aesop-persona-behaviors/_search
      body:
        size: 0
        aggs:
          common_query_types:
            terms:
              script:
                source: "doc['query_type'].value + ':' + doc['target_index'].value"
              size: 50
          frequent_entities:
            terms:
              field: entity_queried
              size: 100

  - name: analyze_patterns_for_skills
    type: ai.agent
    agent-id: aesop.pattern_analyzer
    with:
      message: |
        Analyze query patterns from persona behaviors:

        Common queries:
        {{ steps.mine_persona_query_patterns.output.aggregations.common_query_types | json }}

        Frequent entities:
        {{ steps.mine_persona_query_patterns.output.aggregations.frequent_entities | json }}

        Identify:
        1. Investigation workflows (multi-step queries)
        2. Enrichment patterns (repeated lookups)
        3. Correlation techniques
        4. Automation opportunities

        For each pattern with frequency > {{ inputs.min_pattern_frequency }}, propose a skill.

        Return JSON array:
        [
          {
            "id": "pattern-1",
            "name": "Investigate High-Severity Alerts",
            "description": "Automated investigation workflow for critical alerts",
            "frequency": 45,
            "query_sequence": [...],
            "tools_needed": ["elasticsearch_query", "entity_analytics"],
            "confidence": 0.92
          },
          ...
        ]
    timeout: 300s

  # ══════════════════════════════════════════════════════════════
  # PHASE 5: SKILL SYNTHESIS (Generate Agent Builder Skills)
  # ══════════════════════════════════════════════════════════════

  - name: generate_agent_builder_skills
    type: foreach
    iterate: steps.analyze_patterns_for_skills.output
    steps:
      - name: synthesize_skill_markdown
        type: ai.agent
        agent-id: aesop.skill_synthesizer
        with:
          message: |
            Generate an Agent Builder skill for this pattern:

            Pattern:
            {{ item | json }}

            Discovery context:
            - Indices explored: {{ steps.discover_indices.output | size }}
            - Relationships found: {{ steps.test_suggested_relationships.output | size }}
            - Agent role: {{ inputs.agent_role }}

            Generate skill in Agent Builder markdown format:

            ---
            name: [kebab-case-name]
            description: [1-sentence description of when to use]
            tools:
              - [tool-id-1]
              - [tool-id-2]
            ---

            # [Skill Title]

            [Clear instructions for LLM on how to execute this skill]

            ## When to Use

            - [Trigger condition 1]
            - [Trigger condition 2]

            ## Steps

            1. [Step 1 with specific tool usage]
            2. [Step 2]
            3. [Step 3]

            ## Example

            **User request**: "[Example user query]"

            **Agent response**:
            [Few-shot demonstration]

            Return ONLY the skill markdown (with frontmatter).
        timeout: 180s

      - name: store_proposed_skill
        type: elasticsearch.index
        with:
          index: .aesop-proposed-skills
          id: skill-{{ item.id }}
          body:
            # Skill content
            name: "{{ item.name }}"
            description: "{{ item.description }}"
            markdown: "{{ steps.synthesize_skill_markdown.output }}"
            tools: "{{ item.tools_needed }}"
            confidence: "{{ item.confidence }}"

            # Discovery provenance
            source:
              pattern_id: "{{ item.id }}"
              pattern_frequency: "{{ item.frequency }}"
              query_sequence: "{{ item.query_sequence | json }}"
              discovered_from: "persona_behaviors"
              rationale: "Discovered {{ item.frequency }} instances of this pattern in {{ inputs.agent_role }} behaviors"

            # Metadata (for audit trail)
            metadata:
              discovery_workflow_execution_id: "{{ workflow.execution_id }}"
              discovery_trace_id: "{{ workflow.trace_id }}"  # OTEL trace ID
              created_at: "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}"
              agent_role: "{{ inputs.agent_role }}"
              exploration_depth: "{{ inputs.exploration_depth }}"

            # Validation status (initial)
            validation:
              status: pending
              eval_run_id: null
              eval_trace_id: null
              final_score: null

            # Review status (initial)
            review:
              status: pending_review
              reviewed_by: null
              reviewed_at: null

            # Deployment status (initial)
            deployment:
              deployed: false
              agent_builder_skill_id: null

  # ══════════════════════════════════════════════════════════════
  # PHASE 6: SUMMARY & NOTIFICATION
  # ══════════════════════════════════════════════════════════════

  - name: log_exploration_summary
    type: console
    with:
      message: |
        ✅ AESOP Self-Exploration Complete!

        📊 Discovery Summary:
        - Indices discovered: {{ steps.discover_indices.output | size }}
        - Relationships validated: {{ steps.test_suggested_relationships.output | size }}
        - Patterns identified: {{ steps.analyze_patterns_for_skills.output | size }}
        - Skills proposed: {{ steps.generate_agent_builder_skills.output | size }}

        📍 Workflow Execution ID: {{ workflow.execution_id }}
        📍 OTEL Trace ID: {{ workflow.trace_id }}

        🎯 Next Step: Run evaluations on proposed skills via /app/evals
```

**This workflow:**
- ✅ Runs autonomously (no human intervention during exploration)
- ✅ Read-only operations (all ES steps are GET/POST /_search)
- ✅ Emits OTEL traces automatically (via Kibana's telemetry system)
- ✅ Stores all discoveries in Elasticsearch (for querying from UI)
- ✅ Integrates with Agent Builder (invokes custom agents for reasoning)
- ✅ ~150 lines of YAML vs ~500+ lines of LangGraph Python/TS code

---

**API Route** (Trigger Workflow):

```typescript
// server/routes/aesop/exploration/run_exploration.ts

router.versioned
  .post({
    path: '/api/aesop/exploration/run',
    access: 'internal',
    security: {
      authz: {
        requiredPrivileges: ['agent_builder', 'read'], // NO write permissions!
      },
    },
  })
  .addVersion(
    {
      version: '1',
      validate: {
        request: {
          body: schema.object({
            role: schema.string(), // e.g., "SOC analyst"
            scopedIndices: schema.arrayOf(schema.string()), // Limit exploration scope
            explorationDepth: schema.number({ defaultValue: 5 }),
          }),
        },
      },
    },
    async (context, request, response) => {
      const { esClient, llmClient } = await getClients(context);

      // CRITICAL: Use READ-ONLY esClient (no write, update, delete methods)
      const readOnlyClient = createReadOnlyElasticsearchClient(esClient);

      const graph = getExplorationGraph({
        esClient: readOnlyClient,
        llm: llmClient,
        logger: context.logger,
        agentRole: request.body.role,
      });

      const result = await graph.invoke({
        traceId: randomUUID(),
        agentRole: request.body.role,
        explorationDepth: request.body.explorationDepth,
      });

      return response.ok({
        body: {
          discoveredIndices: result.discoveredIndices.length,
          discoveredSchemas: Object.keys(result.discoveredSchemas).length,
          discoveredRelationships: result.discoveredRelationships.length,
          proposedSkills: result.proposedSkills.length,
          skills: result.proposedSkills,
        },
      });
    }
  );
```

---

### Component 3: Skill Validation Pipeline (O11y Traces + @kbn/evals)

**Purpose**: Validate proposed skills through automated evaluations BEFORE human review

**Integration Points** (100% Elastic-Native):
- ✅ **PRIMARY**: O11y traces from `traces-*` indices (OTEL format) - [PR #254845](https://github.com/elastic/kibana/pull/254845)
- ✅ Use `@kbn/evals` executor (KibanaEvalsClient) - writes to `kibana-evaluations*`
- ✅ Generate eval datasets automatically from discovered patterns
- ✅ Run experiments with multiple models (via connectors)
- ✅ Extract metrics from OTEL spans (tokens, latency, tool calls)
- ⚠️ **SECONDARY**: LangSmith cross-validation (verify Elastic solution matches LangSmith - goal is to DROP LangSmith)

**Architecture** (O11y Traces as PRIMARY validation):

```typescript
// server/lib/aesop/validation/skill_validator.ts

import { KibanaEvalsClient } from '@kbn/evals/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProposedSkill } from '../types';

export async function validateSkill(
  skill: ProposedSkill,
  {
    evalsClient,
    traceEsClient,  // For querying traces-* indices
    langsmithClient,  // OPTIONAL - for cross-validation only
    model,
    convergenceThreshold = 0.85,
    maxIterations = 5,
  }: SkillValidationParams
): Promise<SkillValidationResult> {
  const iterations: ValidationIteration[] = [];
  let currentSkill = skill;
  let iteration = 0;

  // Iterative improvement loop (from paper: Explore → Propose → Review → Improve)
  while (iteration < maxIterations) {
    iteration++;

    // 1. Generate evaluation dataset from skill's source patterns
    const dataset = await generateEvalDataset(currentSkill);

    // 2. Run experiment via @kbn/evals (writes to kibana-evaluations* + emits OTEL traces)
    const experiment = await evalsClient.runExperiment(
      {
        dataset,
        task: async (example) => {
          // Execute skill against example input
          // This will emit OTEL traces automatically via @kbn/inference-tracing
          return await executeSkill(currentSkill, example.input);
        },
      },
      [
        // PRIMARY: Trace-based evaluators (extract from OTEL spans in traces-*)
        { name: 'input_tokens', kind: 'CODE', evaluate: extractInputTokensFromTrace },
        { name: 'output_tokens', kind: 'CODE', evaluate: extractOutputTokensFromTrace },
        { name: 'latency', kind: 'CODE', evaluate: extractLatencyFromTrace },
        { name: 'tool_calls', kind: 'CODE', evaluate: extractToolCallsFromTrace },

        // SECONDARY: LLM-as-judge evaluators (for quality assessment)
        { name: 'correctness', kind: 'LLM', evaluate: evaluateCorrectness },
        { name: 'groundedness', kind: 'LLM', evaluate: evaluateGroundedness },
      ]
    );

    // 3. PRIMARY: Analyze results from O11y traces (Elastic-native)
    const traceMetrics = await analyzeOTELTraces(experiment, traceEsClient);
    const avgScore = computeAverageScore(experiment);
    const failures = identifyFailures(experiment);

    // 4. SECONDARY: Cross-validate with LangSmith (optional, goal is to drop this)
    let langsmithComparison;
    if (langsmithClient) {
      langsmithComparison = await crossValidateWithLangSmith(
        experiment,
        traceMetrics,
        langsmithClient
      );
      console.log('[AESOP] LangSmith cross-validation:', langsmithComparison);
      // TODO: Eventually remove LangSmith dependency - o11y traces are ground truth
    }

    iterations.push({
      iteration,
      skill: currentSkill,
      avgScore,
      failures,
      traceMetrics,  // From O11y traces (PRIMARY)
      langsmithComparison,  // From LangSmith (SECONDARY - optional)
    });

    // 5. Convergence check (from paper: smart audit loops)
    if (avgScore >= convergenceThreshold) {
      if (iterations.length >= 2 &&
          iterations[iterations.length - 1].avgScore >= convergenceThreshold &&
          iterations[iterations.length - 2].avgScore >= convergenceThreshold) {
        // 2 consecutive passes → converged
        return {
          status: 'PASSED',
          finalSkill: currentSkill,
          finalScore: avgScore,
          traceMetrics,  // Include o11y trace metrics in result
          iterations,
        };
      }
    }

    // 6. Improve skill based on failures (if not converged)
    if (iteration < maxIterations) {
      currentSkill = await improveSkillFromFailures(
        currentSkill,
        failures,
        traceMetrics,  // Use trace data to inform improvements
        { llm }
      );
    }
  }

  // Max iterations reached
  return {
    status: avgScore >= convergenceThreshold ? 'PASSED' : 'FAILED',
    finalSkill: currentSkill,
    finalScore: avgScore,
    traceMetrics,
    iterations,
  };
}

// PRIMARY: Extract metrics from OTEL traces (Elastic-native)
async function analyzeOTELTraces(
  experiment: RanExperiment,
  traceEsClient: ElasticsearchClient
): Promise<TraceMetrics> {
  const traceIds = Object.values(experiment.runs)
    .map((run) => run.traceId)
    .filter(Boolean);

  // Query traces-* indices for span data
  const traces = await traceEsClient.search({
    index: 'traces-*',
    body: {
      query: {
        terms: { 'trace.id': traceIds },
      },
      size: 10000,
    },
  });

  // Extract metrics from spans (same logic as trace-based evaluators in @kbn/evals)
  return {
    totalInputTokens: sumSpanAttribute(traces, 'gen_ai.usage.prompt_tokens'),
    totalOutputTokens: sumSpanAttribute(traces, 'gen_ai.usage.completion_tokens'),
    avgLatencyMs: avgSpanDuration(traces),
    toolCallCount: countSpansByType(traces, 'TOOL'),
    errorCount: countSpansByStatus(traces, 'ERROR'),
  };
}

// SECONDARY: Cross-validate with LangSmith (optional - goal is to remove)
async function crossValidateWithLangSmith(
  experiment: RanExperiment,
  elasticMetrics: TraceMetrics,
  langsmithClient: any  // From LangSmith MCP server
): Promise<LangSmithComparison> {
  // Run same experiment in LangSmith
  const langsmithRun = await langsmithClient.runExperiment(/* ... */);

  // Compare metrics
  return {
    tokenCountMatch: Math.abs(elasticMetrics.totalInputTokens - langsmithRun.inputTokens) < 10,
    latencyMatch: Math.abs(elasticMetrics.avgLatencyMs - langsmithRun.avgLatency) < 100,
    scoreMatch: Math.abs(experiment.avgScore - langsmithRun.avgScore) < 0.05,
    verdict: allMetricsMatch ? 'ELASTIC_MATCHES_LANGSMITH' : 'DIVERGENCE_DETECTED',
  };
}

// Generate eval dataset from skill's discovered patterns
async function generateEvalDataset(skill: ProposedSkill): Promise<EvaluationDataset> {
  // Convert discovered patterns into test examples

  return {
    name: `${skill.name}_validation`,
    description: `Validation dataset for ${skill.name}`,
    examples: skill.source.patterns.map((pattern) => ({
      input: {
        query: pattern.exampleQuery,
        context: pattern.context,
      },
      output: {
        expectedResult: pattern.expectedOutcome,
      },
      metadata: {
        pattern_id: pattern.id,
        difficulty: pattern.complexity,
      },
    })),
  };
}

// Improve skill based on eval failures AND trace analysis
async function improveSkillFromFailures(
  skill: ProposedSkill,
  failures: EvalFailure[],
  traceMetrics: TraceMetrics,  // NEW: Use o11y trace data
  { llm }: { llm: ActionsClientLlm }
): Promise<ProposedSkill> {
  const improvement = await llm.invoke(`You are improving an Agent Builder skill that failed some evaluations.

Current skill:
${skill.markdown}

Evaluation failures:
${JSON.stringify(failures, null, 2)}

OTEL Trace Analysis (from traces-* indices):
- Total input tokens: ${traceMetrics.totalInputTokens}
- Total output tokens: ${traceMetrics.totalOutputTokens}
- Average latency: ${traceMetrics.avgLatencyMs}ms
- Tool calls made: ${traceMetrics.toolCallCount}
- Errors encountered: ${traceMetrics.errorCount}

Trace insights:
${analyzeTracePatterns(traceMetrics)}

Improve the skill to:
1. Fix evaluation failures
2. Reduce token usage if excessive (>10K tokens)
3. Reduce latency if slow (>5s)
4. Fix tool call errors

Return the improved skill markdown.`);

  return {
    ...skill,
    markdown: improvement,
    confidence: skill.confidence * 0.95, // Slightly reduce confidence after iteration
    metadata: {
      ...skill.metadata,
      improvement_iterations: (skill.metadata.improvement_iterations || 0) + 1,
      last_improved_at: new Date().toISOString(),
    },
  };
}

// NEW: Analyze trace patterns to inform skill improvements
function analyzeTracePatterns(traceMetrics: TraceMetrics): string {
  const insights: string[] = [];

  if (traceMetrics.totalInputTokens > 10000) {
    insights.push('⚠️ High input token count - consider breaking into smaller queries');
  }

  if (traceMetrics.avgLatencyMs > 5000) {
    insights.push('⚠️ High latency - consider caching or reducing LLM calls');
  }

  if (traceMetrics.errorCount > 0) {
    insights.push('🔴 Tool call errors detected - check tool configurations');
  }

  if (traceMetrics.toolCallCount > 10) {
    insights.push('⚠️ Many tool calls - consider composing into fewer operations');
  }

  return insights.length > 0 ? insights.join('\n') : '✅ Trace metrics look good';
}
```

**Convergence Logic** (From Paper + User's Global Rules):

```typescript
// From ~/.agents/rules/smart-audit-loops.md

function checkConvergence(iterations: ValidationIteration[]): ConvergenceStatus {
  if (iterations.length < 2) {
    return { converged: false, reason: 'Need at least 2 iterations' };
  }

  const lastTwo = iterations.slice(-2);

  // Check: 2 consecutive clean passes
  if (
    lastTwo[0].avgScore >= 0.85 &&
    lastTwo[1].avgScore >= 0.85
  ) {
    return { converged: true, reason: '2 consecutive clean passes' };
  }

  // Check: max iterations cap
  if (iterations.length >= 5) {
    return {
      converged: true, // Stop iterating
      reason: 'Max iterations reached (safety cap)',
      warning: 'Skill may not be ready - final score below threshold',
    };
  }

  return { converged: false };
}
```

---

### Component 4: Kibana Evals UI (EXISTING - Extend, Don't Rebuild!)

**Purpose**: View evaluation results and OTEL traces in Kibana UI

**✅ ALREADY EXISTS** in PR #254845:
- `x-pack/platform/plugins/shared/evals/` - Evals plugin (feature-flagged)
- UI for viewing eval runs (`/app/evals`)
- TraceWaterfall component (visualizes OTEL traces from `traces-*`)
- Dataset management (create/update/delete datasets and examples)
- API routes: `/internal/evals/runs`, `/internal/evals/traces/{traceId}`, etc.

**What we ADD for AESOP** (extend existing plugin):

```
x-pack/platform/plugins/shared/evals/  # EXISTING
├── public/
│   ├── pages/
│   │   ├── runs_list/           # ✅ EXISTING - List eval runs
│   │   ├── run_detail/          # ✅ EXISTING - Run details + traces
│   │   ├── datasets_list/       # ✅ EXISTING - Dataset management
│   │   ├── dataset_detail/      # ✅ EXISTING - Dataset examples
│   │   └── aesop/               # 🆕 ADD - AESOP-specific pages
│   │       ├── exploration_dashboard.tsx    # Monitor self-exploration runs
│   │       ├── proposed_skills.tsx          # Review proposed skills
│   │       └── skill_approval_workflow.tsx  # Approve/reject UI
│   └── components/
│       ├── trace_waterfall/     # ✅ EXISTING - O11y trace viewer
│       └── skill_preview/       # 🆕 ADD - Preview generated skills
└── server/
    ├── routes/
    │   ├── runs/                # ✅ EXISTING - Eval runs API
    │   ├── traces/              # ✅ EXISTING - Trace fetching API
    │   ├── datasets/            # ✅ EXISTING - Dataset CRUD API
    │   └── aesop/               # 🆕 ADD - AESOP-specific routes
    │       ├── exploration/
    │       │   └── run_exploration.ts       # Trigger self-exploration workflow
    │       └── skills/
    │           ├── list_proposed.ts         # List proposed skills
    │           ├── approve_skill.ts         # Approve → deploy to Agent Builder
    │           └── reject_skill.ts          # Reject with feedback
    └── lib/
        └── aesop/               # 🆕 ADD - AESOP logic
            ├── workflows/       # Workflow YAML definitions
            ├── validation/      # Skill validation using o11y traces
            └── deployment/      # Deploy to Agent Builder
```

**Integration with Existing Evals Plugin**:
- ✅ Reuse TraceWaterfall component for skill execution traces
- ✅ Reuse dataset storage (`kibana-evaluations*` datastream)
- ✅ Reuse trace fetching API (`GET /internal/evals/traces/{traceId}`)
- ✅ Add AESOP-specific pages as new routes in existing plugin

**UI Components**:

**1. Evals Dashboard**:
```tsx
// public/application/components/evals_dashboard.tsx

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useEvalsHistory } from '../hooks/use_evals_history';

export const EvalsDashboard = () => {
  const { history, loading } = useEvalsHistory();

  if (loading) return <EuiLoadingSpinner />;

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="AESOP Evaluations"
          description="Monitor skill quality and evaluation results"
        />

        {/* Summary Stats */}
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={history.totalSkillsProposed}
                description="Skills Proposed"
                titleColor="primary"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={history.skillsPassedEvals}
                description="Passed Evaluations"
                titleColor="success"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiStat
                title={`${(history.approvalRate * 100).toFixed(1)}%`}
                description="Approval Rate"
                titleColor="accent"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Active Evaluations Table */}
        <EuiSpacer />
        <EuiPanel>
          <EuiTitle size="m"><h2>Active Evaluations</h2></EuiTitle>
          <EuiSpacer />
          <EuiBasicTable
            items={history.activeEvals}
            columns={[
              { field: 'skillName', name: 'Skill' },
              { field: 'status', name: 'Status', render: renderStatus },
              { field: 'progress', name: 'Progress', render: renderProgress },
              { field: 'currentScore', name: 'Score' },
              { field: 'actions', name: 'Actions', render: renderActions },
            ]}
          />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
```

**2. Eval Runner** (Execute evaluations from UI):
```tsx
// public/application/components/eval_runner.tsx

export const EvalRunner = () => {
  const { runEval, loading } = useRunEval();
  const [selectedSkill, setSelectedSkill] = useState<ProposedSkill | null>(null);

  const handleRunEval = async () => {
    if (!selectedSkill) return;

    const result = await runEval({
      skillId: selectedSkill.id,
      connectorId: selectedConnector,
      convergenceThreshold: 0.85,
      maxIterations: 5,
    });

    // Show results in modal/flyout
    setEvalResults(result);
  };

  return (
    <EuiPanel>
      <EuiTitle><h2>Run Evaluation</h2></EuiTitle>
      <EuiSpacer />

      <EuiFormRow label="Select Proposed Skill">
        <EuiSuperSelect
          options={proposedSkills.map(s => ({
            value: s.id,
            inputDisplay: s.name,
          }))}
          valueOfSelected={selectedSkill?.id}
          onChange={(id) => setSelectedSkill(find(proposedSkills, { id }))}
        />
      </EuiFormRow>

      <EuiFormRow label="LLM Model/Connector">
        <EuiSuperSelect options={connectors} />
      </EuiFormRow>

      <EuiButton
        onClick={handleRunEval}
        isLoading={loading}
        fill
      >
        Run Evaluation
      </EuiButton>

      {evalResults && (
        <EuiModal onClose={() => setEvalResults(null)}>
          <EuiModalHeader>
            <EuiTitle><h2>Evaluation Results</h2></EuiTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText>
              <h3>Final Score: {evalResults.finalScore.toFixed(2)}</h3>
              <p>Status: {evalResults.status}</p>
              <p>Iterations: {evalResults.iterations.length}</p>
            </EuiText>

            {/* Show iteration history */}
            <EuiSpacer />
            <EuiTitle size="s"><h4>Iteration History</h4></EuiTitle>
            {evalResults.iterations.map((iter, idx) => (
              <EuiPanel key={idx}>
                <strong>Iteration {iter.iteration}</strong>
                <p>Score: {iter.avgScore}</p>
                <p>Failures: {iter.failures.length}</p>
              </EuiPanel>
            ))}
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiPanel>
  );
};
```

**3. Skill Review Interface**:
```tsx
// public/application/components/skill_review.tsx

export const SkillReview = ({ skill }: { skill: ProposedSkill }) => {
  const { approveSkill, rejectSkill } = useSkillReview();

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle><h2>{skill.name}</h2></EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Skill Content */}
        <EuiPanel>
          <EuiTitle size="s"><h3>Skill Description</h3></EuiTitle>
          <EuiText>{skill.description}</EuiText>
        </EuiPanel>

        <EuiSpacer />

        {/* Skill Markdown (preview) */}
        <EuiPanel>
          <EuiTitle size="s"><h3>Skill Content</h3></EuiTitle>
          <EuiCodeBlock language="markdown">
            {skill.markdown}
          </EuiCodeBlock>
        </EuiPanel>

        <EuiSpacer />

        {/* Evaluation Results */}
        <EuiPanel>
          <EuiTitle size="s"><h3>Evaluation Results</h3></EuiTitle>
          <EuiStat
            title={`${(skill.evalResults.finalScore * 100).toFixed(1)}%`}
            description="Quality Score"
            titleColor={skill.evalResults.status === 'PASSED' ? 'success' : 'danger'}
          />
          <EuiSpacer />
          <EuiText size="s">
            <ul>
              <li>Correctness: {skill.evalResults.scores.correctness}</li>
              <li>Groundedness: {skill.evalResults.scores.groundedness}</li>
              <li>Efficiency: {skill.evalResults.scores.efficiency}</li>
            </ul>
          </EuiText>
        </EuiPanel>

        <EuiSpacer />

        {/* Source Metadata */}
        <EuiPanel>
          <EuiTitle size="s"><h3>Discovery Source</h3></EuiTitle>
          <EuiDescriptionList
            listItems={[
              { title: 'Discovered from', description: skill.source.patterns.join(', ') },
              { title: 'Data sources', description: skill.source.data.join(', ') },
              { title: 'Rationale', description: skill.source.rationale },
              { title: 'Confidence', description: `${(skill.confidence * 100).toFixed(1)}%` },
              { title: 'Trace ID', description: skill.metadata.discovery_trace_id },
            ]}
          />
        </EuiPanel>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={rejectSkill} color="danger">
              Reject
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => approveSkill(skill)}
              fill
              color="success"
              disabled={skill.evalResults.status !== 'PASSED'}
            >
              Approve & Add to Agent Builder
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
```

---

### Component 5: End-to-End AESOP Cycle Orchestration

**Purpose**: Coordinate full Explore → Propose → Review → Deploy → Improve cycle

**Master Orchestration Graph**:

```typescript
// server/lib/aesop/orchestration/aesop_master_graph.ts

type AESOPState = {
  // Input
  role: string;
  scopedIndices: string[];

  // Exploration phase
  explorationResult: ExplorationResult;

  // Validation phase
  proposedSkills: ProposedSkill[];
  validationResults: Record<string, SkillValidationResult>;

  // Review phase
  approvedSkills: string[]; // Skill IDs
  rejectedSkills: string[];
  pendingReview: string[];

  // Deployment phase
  deployedSkills: DeployedSkill[];

  // Metrics
  cycleCount: number;
  totalSkillsProposed: number;
  totalSkillsApproved: number;
  approvalRate: number;
};

export function getAESOPMasterGraph({
  esClient,
  llm,
  evalsClient,
  agentBuilderClient,
}: AESOPMasterGraphParams) {
  const graph = new StateGraph<AESOPState>({
    channels: { /* ... */ },
  })
    // Phase 1: Exploration
    .addNode('explore', async (state) => {
      const explorationGraph = getExplorationGraph({ esClient, llm });
      const result = await explorationGraph.invoke({
        role: state.role,
        scopedIndices: state.scopedIndices,
      });
      return {
        explorationResult: result,
        proposedSkills: result.proposedSkills,
      };
    })

    // Phase 2: Validation (parallel for all skills)
    .addNode('validate', async (state) => {
      const validationResults: Record<string, SkillValidationResult> = {};

      await Promise.all(
        state.proposedSkills.map(async (skill) => {
          const result = await validateSkill(skill, { evalsClient });
          validationResults[skill.id] = result;
        })
      );

      return {
        validationResults,
        pendingReview: state.proposedSkills
          .filter((s) => validationResults[s.id].status === 'PASSED')
          .map((s) => s.id),
      };
    })

    // Phase 3: Human Review (blocking - wait for human approval)
    .addNode('await_review', async (state) => {
      // This node pauses execution until human reviews skills
      // In practice, this would be an async wait or webhook
      return state; // No state change, just waiting
    })

    // Phase 4: Deploy approved skills
    .addNode('deploy', async (state) => {
      const deployedSkills: DeployedSkill[] = [];

      for (const skillId of state.approvedSkills) {
        const skill = state.proposedSkills.find((s) => s.id === skillId)!;

        // Create skill in Agent Builder via API
        const created = await agentBuilderClient.createSkill({
          name: skill.name,
          description: skill.description,
          content: skill.markdown,
          tools: skill.tools,
          metadata: {
            source: 'aesop',
            aesop_trace_id: skill.metadata.discovery_trace_id,
            eval_score: state.validationResults[skillId].finalScore,
            approved_at: new Date().toISOString(),
          },
        });

        deployedSkills.push(created);
      }

      return {
        deployedSkills,
        cycleCount: state.cycleCount + 1,
        totalSkillsApproved: state.totalSkillsApproved + state.approvedSkills.length,
      };
    })

    // Edges
    .addEdge(START, 'explore')
    .addEdge('explore', 'validate')
    .addEdge('validate', 'await_review')
    .addEdge('await_review', 'deploy')
    .addEdge('deploy', END);

  return graph.compile();
}
```

---

## Technology Stack (100% Elastic-Native - Zero External Dependencies!)

### Core Infrastructure (All Existing in Kibana)

| Component | Technology | Location | Usage |
|-----------|------------|----------|-------|
| **Workflow Orchestration** | Kibana Workflows | `@kbn/workflows` + `workflowsManagement` plugin | ✅ YAML-based sequential + conditional logic |
| **Agent Invocation** | Workflows `ai.agent` step | Built into Workflows | ✅ Native Agent Builder integration |
| **Eval Execution** | @kbn/evals | `x-pack/platform/packages/shared/kbn-evals/` | ✅ REUSE executor + trace-based evaluators |
| **Eval UI** | Evals plugin (PR #254845) | `x-pack/platform/plugins/shared/evals/` | ✅ EXTEND existing UI (don't rebuild!) |
| **Trace Validation (PRIMARY)** | O11y traces | `traces-*` indices (OTEL format) | ✅ Extract metrics from spans (tokens, latency, tools) |
| **Cross-Validation (SECONDARY)** | LangSmith | Optional via MCP server | ⚠️ GOAL: Drop LangSmith, use pure Elastic |
| **Skill Storage** | Agent Builder API | `x-pack/platform/plugins/shared/agent_builder/` | ✅ REUSE skills CRUD |
| **LLM Integration** | Elastic Assistant | `elastic_assistant/server/lib/langchain/` | ✅ REUSE Claude client via connectors |
| **Read-Only ES Client** | Core Elasticsearch | `@kbn/core/server` | ✅ CREATE read-only wrapper |
| **UI Framework** | EUI + React | Kibana platform | ✅ Standard Kibana plugin |

**✅ 100% Elastic-Native Stack:**
- Zero external orchestration frameworks (Workflows replaces LangGraph)
- Zero external trace storage (O11y traces in Elasticsearch replace LangSmith primary)
- Zero external UI frameworks (Extend existing evals plugin)
- LangSmith is OPTIONAL for cross-validation during development only

---

## Data Flow: Full AESOP Cycle

```
┌──────────────────────────────────────────────────────────────────────┐
│  Step 1: EXPLORATION (Autonomous)                                     │
├──────────────────────────────────────────────────────────────────────┤
│  User triggers: POST /api/aesop/exploration/run { role: "SOC analyst" }│
│       ↓                                                                │
│  Self-Exploration Graph (LangGraph):                                  │
│    1. Schema Discovery  → discovers .alerts-*, logs-*, traces-apm*    │
│    2. Data Profiling    → samples data, understands distributions     │
│    3. Relationship Map  → finds joins (alerts ↔ hosts ↔ users)       │
│    4. Pattern Mining    → extracts common query patterns              │
│    5. Skill Synthesis   → generates 5 Agent Builder skills            │
│       ↓                                                                │
│  Output: 5 ProposedSkill objects stored in ES                         │
│          (.aesop-proposed-skills index)                                │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │ (proposed skills)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Step 2: VALIDATION (Automated)                                       │
├──────────────────────────────────────────────────────────────────────┤
│  For each proposed skill (parallel):                                  │
│       ↓                                                                │
│  Validation Pipeline:                                                 │
│    1. Generate eval dataset (from discovery patterns)                 │
│    2. Run @kbn/evals experiment (task = execute skill)               │
│    3. Evaluate with 3 evaluators (correctness, groundedness, efficiency)│
│    4. Check convergence (2 clean passes or max 5 iterations)          │
│    5. If fails: Improve skill based on failures, retry                │
│       ↓                                                                │
│  Output: SkillValidationResult for each skill                         │
│          Status: PASSED (3/5 skills) | FAILED (2/5 skills)            │
│          Stored in: .aesop-eval-results index                         │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │ (3 skills passed)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Step 3: HUMAN REVIEW (Manual)                                        │
├──────────────────────────────────────────────────────────────────────┤
│  User navigates to: AESOP UI → Pending Skills                         │
│       ↓                                                                │
│  UI shows:                                                             │
│    - Skill name + description                                          │
│    - Evaluation score (0.87 / 0.92 / 0.89)                           │
│    - Discovery source (which patterns led to this)                    │
│    - Skill markdown (full content preview)                            │
│       ↓                                                                │
│  User reviews skill 1:                                                 │
│    - Reads content ✅                                                  │
│    - Reviews eval results ✅                                           │
│    - Checks tools attached ✅                                          │
│    - Decision: APPROVE                                                 │
│       ↓                                                                │
│  POST /api/aesop/skills/{id}/approve                                   │
│       ↓                                                                │
│  Skill marked as "approved" in .aesop-proposed-skills                 │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │ (approved skill)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Step 4: DEPLOYMENT (Automated)                                       │
├──────────────────────────────────────────────────────────────────────┤
│  POST /api/agent-builder/skills (existing Agent Builder API)          │
│       ↓                                                                │
│  Skill created in Agent Builder:                                      │
│    - ID: skill-aesop-001                                               │
│    - Name: "Investigate High-Severity Alerts"                         │
│    - Content: [skill markdown]                                         │
│    - Tools: ["elasticsearch_query", "entity_analytics"]               │
│    - Metadata: { source: "aesop", eval_score: 0.87, ... }            │
│       ↓                                                                │
│  Skill now available in Agent Builder UI                              │
│  Users can attach to agents immediately                               │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │ (deployed skill)
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Step 5: CONTINUOUS IMPROVEMENT (Optional)                            │
├──────────────────────────────────────────────────────────────────────┤
│  Monitor skill usage in production:                                   │
│    - Track invocation count                                            │
│    - Collect user feedback (thumbs up/down)                           │
│    - Analyze failure cases                                            │
│       ↓                                                                │
│  If skill performance degrades:                                        │
│    - Trigger re-exploration (tools/data may have changed)             │
│    - Generate improved version                                         │
│    - Re-validate + re-propose for review                              │
│       ↓                                                                │
│  Versioned skill evolution (skill-001 → skill-002 → ...)              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases (REVISED with Workflows + Existing Evals Plugin)

### Phase 1: Demo Environment Setup (Week 1)

**Deliverables**:
- ✅ Elasticsearch cluster with synthetic multi-persona data
- ✅ 1M+ security events (alerts, logs, traces, metrics)
- ✅ 3 simulated personas (Alice SOC, Bob SRE, Charlie Dev)
- ✅ Data generation scripts (`scripts/aesop_demo_data_generator.ts`)
- ✅ EDOT collector configured (for OTEL trace collection)

**Key Tasks**:
1. Extend existing episode data (ep1-ep8) with additional MITRE scenarios
2. Generate persona query patterns (store in `.aesop-persona-behaviors` index)
3. Create APM traces for 10 microservices
4. Generate structured logs (application + security + infrastructure)
5. Automated setup script (`./scripts/aesop_demo_setup.sh`)
6. **Configure telemetry + EDOT collector** (for o11y traces)

**Config needed** (`kibana.dev.yml`):
```yaml
xpack.evals.enabled: true  # Enable evals plugin

telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1  # Capture ALL traces during eval
telemetry.tracing.exporters:
  - http:
      url: "http://localhost:4318/v1/traces"  # EDOT collector endpoint
```

**Success Criteria**:
- 14/14 MITRE tactics represented in data
- 1M+ events indexed
- 3 personas with distinct query patterns (≥50 queries each)
- EDOT collector receiving traces successfully

---

### Phase 2: Self-Exploration Workflow (Week 2)

**Deliverables**:
- ✅ Workflows YAML definition (`self_exploration.yaml`)
- ✅ Custom Agent Builder agents (schema_categorizer, pattern_analyzer, skill_synthesizer)
- ✅ Workflow execution API route
- ✅ Read-only Elasticsearch wrapper (safety)
- ✅ Proposed skills stored in `.aesop-proposed-skills` index

**Key Tasks**:
1. Create `self_exploration.yaml` workflow (~150 lines)
2. Register 3 custom Agent Builder agents for reasoning steps
3. Implement workflow execution route: `POST /api/aesop/exploration/run`
4. Create read-only ES client wrapper (blocks write operations)
5. Test workflow execution end-to-end

**Tech Stack**:
- ✅ Kibana Workflows (not LangGraph) - YAML-based
- ✅ Agent Builder `ai.agent` steps (not custom nodes)
- ✅ Built-in `elasticsearch.request` steps (not custom code)

**Success Criteria** (From Paper H1):
- Discovers ≥70% of documented tool relationships
- Generates ≥5 distinct skills
- All queries are read-only (verified via audit logs)
- Workflow completes in <2 hours

---

### Phase 3: Skill Validation with O11y Traces (Week 3)

**Deliverables**:
- ✅ Validation workflow (`skill_validation.yaml`)
- ✅ Trace-based evaluators (reuse from @kbn/evals)
- ✅ O11y trace analysis (extract tokens, latency, tool calls from `traces-*`)
- ✅ Iterative improvement loop (convergence logic)
- ⚠️ LangSmith cross-validation (optional, for parity checking)

**Key Tasks**:
1. Create `skill_validation.yaml` workflow (eval → analyze traces → improve loop)
2. Implement trace query logic (fetch from `traces-*` indices)
3. Use existing trace-based evaluators from @kbn/evals
4. Build convergence checker (2 clean passes or max 5 iterations)
5. **Optional**: Add LangSmith cross-validation (compare metrics)

**Tech Stack**:
- ✅ **PRIMARY**: OTEL traces in `traces-*` (Elastic-native)
- ✅ @kbn/evals trace-based evaluators (inputTokens, outputTokens, latency, toolCalls)
- ⚠️ **SECONDARY**: LangSmith (for cross-validation only - goal is to remove)

**Success Criteria** (From Paper H2):
- Validated skills match hand-authored quality (≥0.85 score)
- Convergence within 3 iterations (avg)
- **O11y traces provide same insights as LangSmith** (≥95% parity)

---

### Phase 4: AESOP UI Extensions (Week 4) ✅ LEVERAGE EXISTING!

**Deliverables**:
- ✅ **REUSE**: Existing evals plugin UI (`/app/evals`) from PR #254845
- ✅ **REUSE**: TraceWaterfall component for viewing skill execution traces
- 🆕 **ADD**: AESOP-specific pages (exploration dashboard, proposed skills, review workflow)
- 🆕 **ADD**: Skill approval/rejection UI

**Key Tasks**:
1. **Extend existing evals plugin** (don't create new plugin!)
2. Add AESOP pages under `/app/evals/aesop/`
3. Reuse TraceWaterfall for skill trace visualization
4. Add skill review workflow (approve/reject with notes)
5. Real-time exploration monitoring

**What we DON'T need to build** (already exists):
- ❌ Evals runs list UI (already exists)
- ❌ Trace fetching API (already exists: `GET /internal/evals/traces/{traceId}`)
- ❌ TraceWaterfall component (already exists)
- ❌ Dataset management UI (already exists)

**What we ADD** (AESOP-specific):
- 🆕 Exploration monitoring page (`/app/evals/aesop/exploration`)
- 🆕 Proposed skills list (`/app/evals/aesop/skills/proposed`)
- 🆕 Skill review interface (approve/reject workflow)
- 🆕 Skill deployment button (create in Agent Builder)

**Success Criteria**:
- Can trigger exploration from UI (no CLI)
- Can view proposed skills with eval scores + traces
- Can approve skill → auto-deploys to Agent Builder
- TraceWaterfall shows skill execution spans

---

### Phase 5: End-to-End Integration & Demo (Week 5)

**Deliverables**:
- ✅ Full AESOP cycle working end-to-end
- ✅ Demo script showing: Explore → Propose → Validate → Review → Deploy
- ✅ Professional screenshots (10+ images with TraceWaterfall!)
- ✅ O11y traces vs LangSmith parity report
- ✅ Documentation (architecture, API reference, user guide)

**Key Tasks**:
1. Integration testing (E2E workflow execution)
2. Performance optimization (caching, parallel execution)
3. LangSmith parity validation (compare 50 validation runs)
4. Demo script generation (automated setup + walkthrough)
5. Screenshot capture including TraceWaterfall visualization
6. Documentation (architecture + o11y traces guide)

**Success Criteria** (From Paper H4):
- Generates ≥3 net-new skills (not previously documented)
- Full cycle completes in <2 hours (explore → deploy)
- **O11y traces match LangSmith within 5%** (tokens, latency, tool calls)
- Demo runs successfully without manual intervention

---

**REVISED TIMELINE**: **5 weeks** (down from 6 weeks)

**Effort savings**:
- ✅ -1 week (don't build evals UI, extend existing)
- ✅ -40% code (Workflows YAML vs LangGraph TypeScript)
- ✅ -2 days (trace-based evaluators already exist)

**Total effort**: ~200 hours (down from ~240 hours)

---

## Success Metrics & Validation

### Hypothesis Validation (From Paper Section 7)

| Hypothesis | Metric | Target | Measurement Method |
|------------|--------|--------|-------------------|
| **H1: Discovery Coverage** | % of tool relationships discovered | ≥70% | Compare discovered relationships vs documented (runbooks, wikis) |
| **H2: Skill Quality** | Correctness vs hand-authored | ≥Match | Blind evaluation by SOC experts (same examples) |
| **H3: Improvement Over Time** | Rejection rate trajectory | Decreasing | Track approval rate across cycles (cycle 1, 2, 3, ...) |
| **H4: Net-New Capabilities** | Skills not previously documented | ≥3 skills | SOC team confirms "we didn't have this" |

### Performance Benchmarks

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Exploration Time** | <2 hours | Competitive with human onboarding (days) |
| **Skills Generated** | 5-10 per cycle | Meaningful coverage without overwhelming reviewers |
| **Eval Validation Time** | <30 min per skill | Fast feedback loop for iterative improvement |
| **Convergence Rate** | ≥60% within 3 iterations | Most skills should stabilize quickly |
| **Approval Rate** | ≥50% (cycle 1) → ≥70% (cycle 3) | Learning curve: agent improves proposals over time |

---

## Safety & Security (From Paper Section 8: Threat Model)

### Security Invariants

1. **✅ Read-Only Exploration**: Agent has ZERO write permissions during discovery
   - Implementation: Custom ES client wrapper that throws on write operations
   - Validation: Unit tests assert all methods are read-only

2. **✅ No Production Execution Without Approval**: Every skill requires human review
   - Implementation: Skills stored in "proposed" state, only deployed after approval
   - Enforcement: Agent Builder API checks `source=aesop` → requires `approved=true`

3. **✅ Comprehensive Audit Logging**: All agent queries logged with trace IDs
   - Implementation: Elasticsearch audit log + OTEL tracing
   - Retention: 90 days minimum

4. **✅ Scoped Credentials**: Agent accesses minimum data required
   - Implementation: Role-based access (SOC analyst sees .alerts-*, .siem-signals-*)
   - Validation: RBAC tests

### Attack Surface Mitigations (From Paper Section 8)

| Attack | Mitigation | Implementation |
|--------|------------|----------------|
| **Prompt Injection (via SIEM data)** | Input sanitization + anomaly detection | Sanitize alert fields before LLM ingestion; detect unusual outputs |
| **Skill Poisoning** | Human code review + static analysis | Mandatory approval + automated security scanning |
| **Model Exfiltration** | Self-hosted LLM (or contractual guarantees) | Use Elastic's own LLM infrastructure |
| **Read-Path Data Exposure** | Context sanitization + output filtering | Redact PII before LLM context; filter sensitive fields from outputs |
| **Query Pattern Leakage** | Audit log monitoring | Alert on anomalous query patterns (sudden increase, unusual indices) |

---

## Competitive Positioning (From Paper Tables 3-5)

### AESOP vs Prescribed Intelligence

| Approach | Skill Authoring | Scalability | Adaptability | Human Effort |
|----------|-----------------|-------------|--------------|--------------|
| **Prescribed (Current)** | Manual (days/skill) | O(n) with tools | Low (static) | High (expert + engineer) |
| **AESOP (Proposed)** | Autonomous (hours) | O(1) after setup | High (re-explores) | Low (review only) |

### AESOP in Kibana vs Competitive Solutions

| Feature | Dropzone AI | Torq HyperSOC | Microsoft Copilot | **AESOP (Kibana)** |
|---------|-------------|---------------|-------------------|-------------------|
| **Autonomous Exploration** | ❌ Prescribed | ⚠️ Partial | ❌ Prescribed | ✅ **Full (Read-Only)** |
| **Self-Generated Skills** | ❌ | ❌ | ❌ | ✅ **Core Innovation** |
| **Multi-Persona Learning** | ❌ | ❌ | ❌ | ✅ **Unique** |
| **Eval-Driven Quality** | ⚠️ Internal | ⚠️ Internal | ⚠️ Internal | ✅ **Open (@kbn/evals)** |
| **In-Platform Execution** | ❌ (SaaS only) | ❌ (SaaS only) | ⚠️ (Cloud-only) | ✅ **On-Prem + Cloud** |
| **Cost** | $XXK/year | $XXK/year | Bundled E5 | **Zero LLM cost** (self-hosted) |

**Unique Value Proposition**:
> "AESOP is the only solution that learns your SOC environment by exploring it, generates skills autonomously, and runs evaluations transparently—all within your own Elasticsearch cluster."

---

## Risks & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **LLM hallucination in skill generation** | 40% | HIGH (broken skills) | Mandatory eval validation before review; human approval gate |
| **Exploration discovers sensitive data** | 30% | MEDIUM (data exposure) | Scoped credentials + PII redaction + audit logging |
| **Eval validation expensive (LLM calls)** | 50% | MEDIUM (cost) | Use Haiku for evaluators; cache results; limit iterations to 5 |
| **Agent doesn't converge (infinite loop)** | 20% | MEDIUM (waste compute) | Max 5 iterations safety cap; timeout after 2 hours |
| **Generated skills are too generic** | 35% | MEDIUM (low value) | Require pattern frequency >10 instances; filter low-confidence skills |

### Mitigation Strategy:

**Week 1-2** (During implementation):
- ✅ Implement read-only client wrapper (no write methods exposed)
- ✅ Add PII redaction layer before LLM ingestion
- ✅ Set iteration caps + timeouts

**Week 3** (Validation):
- ✅ Security review of proposed skills (check for injection risks)
- ✅ Performance benchmarking (measure LLM call volume + cost)
- ✅ Convergence rate analysis (do skills stabilize within 3 iterations?)

**Week 4+** (Production readiness):
- ✅ Penetration testing (red team tries to inject via SIEM data)
- ✅ Cost analysis (monthly LLM spend estimate)
- ✅ Scalability testing (can handle 100K+ events?)

---

## Open Questions & Decisions Needed

### Decision 1: Eval Execution Location

**Options**:
- **A) In-Kibana Executor** (existing @kbn/evals default)
  - ✅ Pros: No external dependencies, data stays in-cluster, faster setup
  - ⚠️ Cons: Limited to Kibana's LLM integrations

- **B) Phoenix Executor** (LangSmith-backed)
  - ✅ Pros: Advanced features (experiment comparison, public datasets)
  - ⚠️ Cons: External dependency, data egress, requires setup

**Recommendation**: **Option A** (In-Kibana) for PoC, document Phoenix integration for production

---

### Decision 2: UI Plugin Location

**Options**:
- **A) Standalone plugin** (`x-pack/platform/plugins/shared/aesop_ui/`)
  - ✅ Pros: Clean separation, easy to remove if PoC doesn't proceed
  - ⚠️ Cons: Extra plugin boilerplate

- **B) Extend Agent Builder** (`x-pack/platform/plugins/shared/agent_builder/public/aesop/`)
  - ✅ Pros: Integrated experience, reuses Agent Builder UI components
  - ⚠️ Cons: Couples AESOP to Agent Builder

**Recommendation**: **Option B** (Extend Agent Builder) - AESOP generates Agent Builder skills, so tight integration makes sense

---

### Decision 3: Persona Simulation Realism

**Options**:
- **A) Synthetic queries (generated by LLM)**
  - ✅ Pros: Fast, fully automated, deterministic
  - ⚠️ Cons: May not reflect real SOC analyst behavior

- **B) Replay real queries** (from production logs, anonymized)
  - ✅ Pros: Realistic, discovers actual workflows
  - ⚠️ Cons: Privacy concerns, requires data access

**Recommendation**: **Option A** (Synthetic) for PoC with caveat in docs: "Production would use anonymized real queries"

---

## Timeline Estimate (REVISED - with Workflows + Existing Evals Plugin)

**Total effort**: **5 weeks** (1 engineer full-time) for comprehensive PoC

| Week | Phase | Deliverable | Hours | Changes from Original |
|------|-------|-------------|-------|----------------------|
| 1 | Demo Environment | Synthetic data + personas + EDOT | 40h | +EDOT setup (4h) |
| 2 | Self-Exploration | **Workflows YAML** (not LangGraph) | 32h | **-8h** (YAML simpler) |
| 3 | Validation | O11y traces + convergence loop | 32h | **-8h** (trace evaluators exist) |
| 4 | AESOP UI | **Extend evals plugin** (not new) | 32h | **-48h** (reuse existing!) |
| 5 | Integration & Demo | E2E + traces parity + docs | 40h | +o11y vs LangSmith comparison |

**Total**: ~**176 hours** (~**4.5 weeks**)

**Effort savings vs original plan**:
- ✅ **-64 hours** (~1.5 weeks faster)
- ✅ **-40% code** (Workflows YAML vs LangGraph)
- ✅ **-60% UI work** (extend existing vs build new)

**Note**: Still ambitious, but more realistic with infrastructure reuse.

---

## What's Next (Production Roadmap)

### Phase 1-Complete (PoC): Weeks 1-6
**Goal**: Demonstrate feasibility of AESOP framework in Kibana

### Phase 2 (Months 7-12): Production Hardening
**Must-haves**:
- Full RBAC (privilege checks for exploration, review, deployment)
- Comprehensive error handling (network failures, LLM timeouts, malformed data)
- Performance optimization (caching, batching, parallel execution)
- Security hardening (penetration testing, adversarial auditing)
- Monitoring & alerting (APM instrumentation, anomaly detection on agent behavior)

### Phase 3 (Months 13-18): Advanced Capabilities
**Enhancements from Paper Section 5.2**:
- Telemetry-driven pattern discovery (process mining from SIEM logs)
- Selective screen observation (record analyst workflows, extract skills)
- GraphRAG for attack path reasoning
- RLHF continuous learning (analyst feedback improves skills)

---

## Success Criteria for PoC

**The PoC is successful if:**

1. ✅ **Technical Feasibility Validated**: Self-exploration agent discovers ≥70% of documented relationships (H1)
2. ✅ **Skill Quality Demonstrated**: Generated skills pass automated evals at ≥85% (H2)
3. ✅ **Human Review Works**: Review workflow is intuitive, approvals are traceable
4. ✅ **Safety Proven**: Agent operates in read-only mode, no security incidents
5. ✅ **Stakeholder Buy-In**: Demo convinces security leadership this approach is viable
6. ✅ **Net-New Value**: Agent discovers ≥3 skills SOC team didn't have (H4)

**Measuring success**:
- Weekly demo to security team (show progress)
- Hypothesis validation (H1-H4 from paper)
- ROI analysis (time saved: agent exploration vs manual skill authoring)

---

## Next Steps (Immediate)

**This week**:
1. Create feature branch: `spike/aesop-self-directed-skill-acquisition`
2. Add feature flag: `agent_builder:aesop_enabled` (default: false)
3. Set up demo environment (Elasticsearch + synthetic data)
4. Begin Phase 1 implementation (Demo Environment Setup)

**Coordination needed**:
- AI Infra team (@ai-infra): Confirm Agent Builder APIs support AESOP metadata
- Security team (@security-solution): Validate synthetic data represents real threats
- Observability team (@obs-ai-assistant): Share @kbn/evals best practices

**Questions for user**:
1. Timeline expectations? (6 weeks is ambitious - should we descope?)
2. Deployment target? (Cloud only, on-prem, both?)
3. LLM model preference? (Claude Opus for quality, Haiku for speed, mix?)

---

## Appendix: Research Paper References

**Full citation**:
> Ayenson, M. (2026). Beyond Prescribed Intelligence: Toward Self-Directed Skill Acquisition in LLM-Based Cybersecurity Agents. Elastic. March 2026.

**Key Sections**:
- Section 3: Five Limitations (L1-L5)
- Section 5: Self-Directed Skill Acquisition recommendation
- Section 6: AESOP Framework architecture
- Section 7: Research Agenda with hypotheses H1-H4
- Section 8: Threat Model and security invariants
- Section 10.4: Immediate Practical Recommendations (5-step guide)

**Supporting Evidence**:
- CASCADE: 93.3% vs 35.4% (Table 4)
- MCP-Bench: 33-44% success rates (Table 3)
- Self-evolving agents: +20-93% gains (Table 2)

---

## File Structure

```
x-pack/platform/plugins/shared/
├── aesop_ui/                              # NEW: Kibana UI plugin
│   ├── kibana.jsonc
│   ├── public/
│   │   ├── application/
│   │   │   ├── components/
│   │   │   │   ├── evals_dashboard.tsx
│   │   │   │   ├── eval_runner.tsx
│   │   │   │   ├── skill_review.tsx
│   │   │   │   └── exploration_monitor.tsx
│   │   │   └── hooks/
│   │   │       ├── use_run_eval.ts
│   │   │       └── use_exploration.ts
│   │   └── plugin.ts
│   └── server/
│       ├── routes/
│       │   ├── exploration/
│       │   ├── evals/
│       │   └── skills/
│       ├── lib/
│       │   ├── exploration/             # LangGraph exploration agent
│       │   │   ├── graphs/
│       │   │   │   └── exploration_graph/
│       │   │   │       ├── index.ts     # Main graph definition
│       │   │   │       ├── nodes/
│       │   │   │       │   ├── schema_discovery.ts
│       │   │   │       │   ├── data_profiling.ts
│       │   │   │       │   ├── relationship_mapping.ts
│       │   │   │       │   ├── pattern_mining.ts
│       │   │   │       │   └── skill_synthesis.ts
│       │   │   │       └── state.ts
│       │   │   └── clients/
│       │   │       └── read_only_es_client.ts
│       │   ├── validation/             # Skill validation pipeline
│       │   │   ├── skill_validator.ts
│       │   │   ├── convergence.ts
│       │   │   └── dataset_generator.ts
│       │   └── integration/            # Agent Builder integration
│       │       ├── skill_deployer.ts
│       │       └── skill_versioning.ts
│       └── plugin.ts

x-pack/solutions/security/plugins/security_solution/
├── scripts/
│   ├── aesop_demo_data_generator.ts    # NEW: Generate multi-persona data
│   ├── aesop_demo_setup.sh             # NEW: Automated environment setup
│   └── data/
│       ├── episodes/attacks/            # EXISTING: ep1-ep8 data
│       └── personas/                    # NEW: Persona query patterns
│           ├── soc_analyst_alice.json
│           ├── sre_bob.json
│           └── developer_charlie.json

docs/
├── aesop_poc_architecture.md           # THIS DOCUMENT
├── aesop_api_reference.md              # API documentation
├── aesop_demo_script.md                # Demo walkthrough
└── aesop_user_guide.md                 # How to use AESOP UI
```

---

**END OF ARCHITECTURE DOCUMENT**

This architecture provides a comprehensive blueprint for implementing AESOP in Kibana, leveraging existing infrastructure (Agent Builder, @kbn/evals, LangGraph) while introducing the novel self-exploration and skill synthesis capabilities described in the research paper.

Next step: Begin Phase 1 implementation (Demo Environment Setup).
