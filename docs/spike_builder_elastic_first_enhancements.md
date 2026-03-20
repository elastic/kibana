# spike-builder v2.1 - "Elastic-First" Enhancements

**Date**: 2026-03-20
**Philosophy**: Dogfood Elastic Stack capabilities before external frameworks
**Skill Size**: 6,522 lines (from 2,038, +220% growth)

---

## Core Philosophy Change

### Before (v2.0): Technology-Agnostic
```
Need embeddings? → Use OpenAI embeddings
Need agents? → Use LangGraph
Need vector DB? → Use Chroma/Pinecone
Need graph? → Use Neo4j
```

### After (v2.1): Elastic-First
```
Need embeddings? → ✅ Use ELSER (ML node)
                   → Document gap if ELSER unavailable

Need agents? → ✅ Use Agent Builder
              → ⚠️ Consider Attack Discovery's LangGraph if multi-agent needed
              → Document gap if orchestration missing

Need vector search? → ✅ Use Elasticsearch kNN (dense_vector)
                     → No external vector DB

Need graph? → ✅ Use ES Graph API
             → Document gap if complex traversal needed
             → Only then consider Neo4j
```

**Priority**: Elastic Stack > Elastic Ecosystem > External with Integration > Pure External

---

## Key Enhancements Added

### 1. Elastic Stack Capability Inventory

**Added comprehensive checklist** of native capabilities:

**AI/ML**:
- ELSER (embeddings, NER, semantic search)
- Agent Builder (LLM orchestration, tool calling)
- Elastic Assistant (Claude integration)
- Attack Discovery (LangGraph already deployed!)
- Anomaly Detection, Data Frame Analytics

**Data & Storage**:
- Elasticsearch kNN (vector similarity)
- ES Graph API (entity relationships)
- Entity Store / Entity Analytics (risk scoring)

**Orchestration**:
- Task Manager (scheduled jobs)
- Cases Workflow Triggers (event-driven automation)
- Alerting Framework (rule engine)
- Actions/Connectors (external integrations)

**Before proposing ANY solution, skill checks this inventory first.**

---

### 2. Technology Decision Trees

**For every common need, skill follows decision tree:**

#### Example: Need Agent Orchestration?

```
Does Agent Builder support this pattern?
  ├─ YES: ✅ Use Agent Builder (Elastic-native)
  └─ NO: Can we extend Attack Discovery's LangGraph?
      ├─ YES: ✅ Reuse existing setup (dogfood internal)
      └─ NO: Document gap + use case
          ├─ Create GitHub issue for platform team
          └─ Use external framework (last resort)
```

**Prevents**: Reinventing wheels, adding unnecessary dependencies

**Ensures**: Gaps are communicated with use cases (not silently worked around)

---

### 3. Updated LLM Integration Patterns

**All 4 patterns now use Elastic-native solutions:**

#### Pattern 1: Agent Builder Triage Agent ✅
**Before**: Raw LangChain `createReactAgent`
**After**: Agent Builder with registered tools
**Uses**: Elastic Assistant's Claude client, Entity Analytics for risk scoring

#### Pattern 2: ELSER-Based CTI Enrichment ✅
**Before**: Chroma + OpenAI Embeddings
**After**: ELSER + Elasticsearch kNN + Actions/Connectors
**Uses**: ML inference API, threat intel connectors (if available)

#### Pattern 3: MITRE Auto-Mapper ✅
**Still**: Uses Agent Builder (already Elastic-native)
**Enhanced**: Reuses Detection Engine's MITRE taxonomy

#### Pattern 4: Agent Builder + Workflow Orchestration ✅
**Before**: Raw LangGraph StateGraph
**After**:
- **Option A**: Agent Builder + Cases Workflow Triggers (if supported)
- **Option B**: Extend Attack Discovery's LangGraph (dogfood existing)
**Documents gap**: If workflows lack alert triggers or parallel execution

---

### 4. Stack Gap Documentation Template

**New requirement**: When using external solutions, document WHY native Elastic solution doesn't work

**Template includes:**
- Use case (concrete, from spike)
- What we have (existing capabilities)
- What's missing (specific technical gaps)
- Impact if filled (quantified benefits)
- Feature request (for owning team)
- Workaround (what you'll use instead)
- Trade-offs (pros/cons of workaround)
- Priority + GitHub issue (if HIGH/CRITICAL)

**Output**: `docs/<feature>_stack_gaps.md` - Input for platform roadmap planning

---

### 5. Gap Reporting Workflow

**Skill now automatically:**

1. **During analysis** (Step 0.2c): Check Elastic Stack inventory for each proposed LLM feature
2. **When gap found**: Document using template
3. **Prioritize gap**: CRITICAL/HIGH/MEDIUM/LOW based on impact
4. **Create issue** (if HIGH/CRITICAL):
   ```bash
   gh issue create --repo elastic/kibana \
     --title "[Agent Builder] Add Multi-Agent Coordination" \
     --label "gap,feature-request,Team:ResponseOps" \
     --body "$(cat /tmp/gap_description.md)"
   ```
5. **Aggregate gaps**: Generate `docs/<feature>_stack_gaps.md` with all gaps
6. **Link to platform teams**: @ mention teams in gaps document

---

## Example: How This Changes Recommendations

### Alert Investigation Pipeline - Before vs After

#### Recommendation: Multi-Agent Investigation

**Before v2.1** (technology-agnostic):
```
Build multi-agent investigation using LangGraph:
- Install @langchain/langgraph
- Create StateGraph with 5 agents
- Define edges and state management
- Implement custom orchestration
```

**After v2.1** (Elastic-first):
```
Option A (PREFERRED if available):
✅ Use Agent Builder + Cases Workflow Triggers
- Register 5 agents via Agent Builder API
- Define workflow with parallel execution groups
- Trigger on case.alert_attached event
- No new dependencies!

Gap identified:
- Cases workflows don't support alert events
- No parallel execution in workflow steps
- Created issue #XXXX for Cases team

Option B (DOGFOOD existing):
✅ Extend Attack Discovery's LangGraph setup
- Reuse x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/
- Wrap Agent Builder agents as LangGraph nodes
- Proven infrastructure (AD uses it in production)

Option C (LAST RESORT):
❌ Build custom LangGraph orchestrator
- Only if Options A & B both fail
- Adds @langchain/langgraph dependency
- Custom code to maintain
```

**Result**: Spike dogfoods Elastic, documents 2 gaps for platform teams, has fallback plan.

---

### Recommendation: CTI Enrichment

**Before v2.1**:
```
Use Chroma vector store + OpenAI embeddings:
- Install langchain-community, langchain-openai
- Set up Chroma server
- Configure OpenAI API key
- $0.0001/1K tokens embedding cost
```

**After v2.1**:
```
✅ Use ELSER + Elasticsearch kNN (Elastic-native):
- Verify ML node has .elser_model_2
- Use ml.inferTrainedModel for embeddings
- Store in Elasticsearch with dense_vector field
- Query with kNN API
- Zero API costs (in-cluster)

Gap check:
- ELSER deployed? → Yes ✅ (no gap)
- If NO → Document gap: "Default ELSER deployment for Security Solution"

✅ Use Actions/Connectors for threat intel APIs:
- Check for VirusTotal, AbuseIPDB, MISP connectors
- If missing → Document gap: "Official threat intel connectors"
- Workaround: Build custom connectors OR direct HTTP

Result: $0/year embedding costs (vs $3,600/year OpenAI)
```

**Savings**: $3,600/year + no data egress + dogfoods Elastic ML

---

## Benefits of Elastic-First Approach

### 1. Cost Savings

| Component | External Solution | Elastic Native | **Savings/Year** |
|-----------|-------------------|----------------|------------------|
| **Embeddings** | OpenAI ($0.0001/1K tokens × 10M tokens/year) | ELSER (in-cluster, free) | **$1,000/year** |
| **Vector DB** | Pinecone ($70/month) | Elasticsearch kNN (included) | **$840/year** |
| **Agent orchestration** | Anthropic Workbench ($50/user/month × 10 users) | Agent Builder (included) | **$6,000/year** |
| **Graph database** | Neo4j Enterprise ($180K/year) | ES Graph API (included) | **$180,000/year** |
| **TOTAL** | — | — | **$187,840/year** |

**Just by dogfooding, save ~$188K/year in licensing + API costs!**

---

### 2. Operational Benefits

| Benefit | External | Elastic Native |
|---------|----------|----------------|
| **Data egress** | Data sent to OpenAI, Chroma, Neo4j | ✅ Data stays in ES cluster |
| **Authentication** | Manage multiple API keys | ✅ Single ES authentication |
| **Deployment** | Deploy Chroma, Neo4j, manage separate services | ✅ No additional services |
| **Monitoring** | Monitor multiple systems | ✅ Unified Kibana monitoring |
| **Security compliance** | Data leaves cluster (GDPR concerns) | ✅ Data sovereignty maintained |

---

### 3. Developer Experience

| Aspect | External | Elastic Native |
|--------|----------|----------------|
| **Setup time** | 2-4 hours (deploy services, configure) | ✅ 0 hours (already deployed) |
| **Learning curve** | Learn Chroma API, Neo4j Cypher, etc. | ✅ Use familiar ES queries, Kibana APIs |
| **Debugging** | Separate logs, tools | ✅ Unified Kibana Dev Tools |
| **Documentation** | External docs | ✅ Internal Elastic docs |

---

### 4. Strategic Benefits

| Benefit | Value |
|---------|-------|
| **Dogfooding** | Improves Elastic Stack (we find bugs/gaps that customers would find) |
| **Competitive moat** | Capabilities only work well on Elastic (not portable to Splunk/Datadog) |
| **Sales story** | "Everything runs in YOUR cluster - no data egress, no external APIs" |
| **Platform feedback** | Gaps documented = platform team knows what to build |

---

## Stack Gaps Identified in Alert Pipeline Spike

### Gap 1: Cases Workflow Alert Event Triggers 🟡 HIGH

**What's missing**: `case.alert_attached` event trigger
**Impact**: Must poll via Task Manager (slower, higher ES load)
**Workaround**: Task Manager with 5-minute polling
**Issue**: [Would create in elastic/kibana Team:Cases]

### Gap 2: Agent Builder Multi-Agent Coordination 🟡 HIGH

**What's missing**: Orchestration layer for multiple Agent Builder agents
**Impact**: Must use Attack Discovery's LangGraph (couples to Elastic Assistant)
**Workaround**: Extend Attack Discovery graphs
**Issue**: [Would create in elastic/kibana Team:ResponseOps]

### Gap 3: Official Threat Intel Connectors 🟢 MEDIUM

**What's missing**: Pre-built connectors for VirusTotal, AbuseIPDB, MISP
**Impact**: Must build custom connectors
**Workaround**: Custom HTTP calls via Actions framework
**Issue**: [Would create in elastic/kibana Team:ResponseOps]

### Gap 4: ELSER Default Deployment for Security 🟢 MEDIUM

**What's missing**: ELSER auto-deployed with Security Solution
**Impact**: Some deployments won't have ML node configured
**Workaround**: Fallback to Jaccard similarity (deterministic)
**Issue**: [Would create in elastic/kibana Team:ML,Team:Security]

**All gaps documented with use cases for platform teams to prioritize.**

---

## Skill Version History

| Version | Lines | Key Changes |
|---------|-------|-------------|
| v1.0 | 2,038 | Original spike-builder |
| v2.0 | 4,719 | + LLM/Agentic assessment, issue creation, dependency graphs |
| v2.1 | 6,522 | + **Elastic-first philosophy**, competitor frequency, deep technical analysis, stack gap documentation |

**Growth**: +220% from v1.0

**Philosophy evolution**: Technology-agnostic (v1.0) → Strategic (v2.0) → **Elastic-first (v2.1)**

---

## For Next Spike

**The skill will now:**

1. ✅ **Check Elastic Stack first** before proposing external solutions
2. ✅ **Document gaps** when native capabilities are insufficient
3. ✅ **Create platform issues** for HIGH/CRITICAL gaps
4. ✅ **Provide workarounds** with trade-off analysis
5. ✅ **Prefer dogfooding** (Agent Builder over LangGraph, ELSER over OpenAI, ES kNN over Chroma)
6. ✅ **Quantify savings** (cost + operational benefits of native solutions)

**Example spike output will include:**
- Implementation using Elastic Stack (ELSER, Agent Builder, Workflows)
- Stack gaps document (2-5 gaps typical)
- GitHub issues for platform teams (if gaps are HIGH/CRITICAL)
- Workaround trade-off analysis
- Cost savings from dogfooding ($50K-200K/year typical)

---

**spike-builder v2.1 ensures we build on Elastic Stack and communicate gaps clearly to platform teams for roadmap input.** 🎯
