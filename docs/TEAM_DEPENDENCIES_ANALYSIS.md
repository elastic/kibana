# Team Dependencies Analysis - Path to Autonomous Shipping

**Date:** 2026-03-22
**Goal:** Ship all 3 spikes with MINIMAL cross-team dependencies
**Approach:** Self-contained implementation where possible

---

## Executive Summary

**Current Dependencies:** 6 teams involved (too many)
**Optimized Dependencies:** 2 teams (Security + AppSec only)
**Autonomous Path:** ✅ EXISTS (with trade-offs)

**Recommendation:** Use self-contained approach for 80% faster shipping

---

## Dependency Analysis by Spike

### Spike 1: XDR Correlation Engine

**Current Dependencies:**

| Team | Dependency | Blocking? | Can Remove? |
|------|------------|-----------|-------------|
| **AppSec** | Security review | 🔴 YES (GA blocker) | ❌ NO (required for GA) |
| **Cases** | Attachment API | 🟡 SOFT | ✅ YES (defer to v2) |
| **ResponseOps** | Workflow triggers | 🟡 SOFT | ✅ YES (use Task Manager) |
| **Entity Analytics** | Enrichment patterns | 🟢 NONE | ✅ YES (already independent) |

**Autonomous Path:**

**✅ REMOVE Cases Dependency:**
```typescript
// Current: Uses Cases Attachments API (depends on Cases team)
await cases.attachments.add(correlationAlert);

// Autonomous: Store correlation metadata in alert itself (no Cases dependency)
const correlationAlert = {
  ...alert,
  'kibana.alert.correlation.contributing_alerts': alertIds,
  'kibana.alert.correlation.group_id': groupId,
  // No external API call needed
};
```

**Benefit:** Ship without Cases team review
**Trade-off:** No native Cases integration (can add later)
**Effort:** Already done (current implementation doesn't require Cases approval)

---

**✅ REMOVE ResponseOps Dependency:**
```typescript
// Current Plan: Use workflow triggers (depends on ResponseOps)
await workflows.trigger('correlation.created', correlationAlert);

// Autonomous: Use built-in Task Manager (Security owns this)
taskManager.schedule({
  taskType: 'correlation-auto-investigation',
  schedule: { interval: '1m' },
});
```

**Benefit:** Ship without ResponseOps coordination
**Trade-off:** Polling vs event-driven (less efficient)
**Effort:** Zero (already using Task Manager pattern in correlation)

---

**❌ CANNOT REMOVE AppSec Dependency:**
- Required for all GA features (company policy)
- Security review is NON-NEGOTIABLE
- **Must have AppSec sign-off**

**Mitigation:** Prepare comprehensive security docs (already done)
**Timeline:** 1 week (parallel with other work, not blocking)

---

**Correlation Result:** ✅ **1 blocking dependency** (AppSec only)

**Ship Timeline:** 3-4 weeks (AppSec review is only external blocker)

---

### Spike 2: MITRE Auto-Map

**Current Dependencies:**

| Team | Dependency | Blocking? | Can Remove? |
|------|------------|-----------|-------------|
| **AppSec** | Security review | 🔴 YES | ❌ NO |
| **Elastic Assistant** | Claude API access | 🟡 MAYBE | ✅ YES (direct API) |
| **ML Team** | ELSER (if semantic) | 🟡 MAYBE | ✅ YES (pure LLM) |

**Autonomous Path:**

**✅ REMOVE Elastic Assistant Dependency:**
```typescript
// Option A: Use Elastic Assistant (depends on team)
const llmClient = elasticAssistant.getLLMClient();

// Option B: Direct Claude API (AUTONOMOUS)
import { ChatAnthropic } from '@langchain/anthropic';

const llmClient = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // User provides
  modelName: 'claude-3-5-haiku-20241022',
});

// No team dependency!
```

**Benefit:** Ship without Elastic Assistant team coordination
**Trade-off:** User must provide API key (but they likely have one)
**Effort:** Zero (LangChain handles this)

---

**✅ REMOVE ML Team Dependency:**
```typescript
// Option A: Use ELSER for embeddings (depends on ML team)
const embeddings = await ml.inferElser(text);

// Option B: Pure LLM approach (AUTONOMOUS)
// No embeddings needed - just LLM reasoning
const mapping = await llmClient.invoke(prompt);

// No ML team dependency!
```

**Benefit:** Ship without ML team review
**Trade-off:** No semantic deduplication (Phase 1 - can add later)
**Effort:** Zero (already planned as pure LLM)

---

**❌ CANNOT REMOVE AppSec:**
- LLM features require security review (prompt injection, data leakage)
- Non-negotiable

---

**MITRE Result:** ✅ **1 blocking dependency** (AppSec only)

**Ship Timeline:** 1-2 weeks (4-6 hour implementation + AppSec review)

---

### Spike 3: LLM Investigation

**Current Dependencies:**

| Team | Dependency | Blocking? | Can Remove? |
|------|------------|-----------|-------------|
| **AppSec** | Security review | 🔴 YES | ❌ NO |
| **Elastic Assistant** | Claude API, Agent Builder | 🔴 MAYBE | ✅ YES (direct API) |
| **Attack Discovery** | LangGraph patterns | 🟡 SOFT | ✅ YES (implement own) |
| **Cases** | Case updates | 🟡 SOFT | ✅ YES (use comments API) |
| **Connectors** | CTI integrations | 🟡 SOFT | ✅ YES (direct HTTP) |

**Autonomous Path:**

**✅ REMOVE Elastic Assistant Dependency:**
```typescript
// Option A: Use Agent Builder (depends on Elastic Assistant team)
const agent = await agentBuilder.create({...});

// Option B: Direct LangChain (AUTONOMOUS)
import { ChatAnthropic } from '@langchain/anthropic';
import { StateGraph } from '@langchain/langgraph';

const llmClient = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const graph = new StateGraph({...}); // Own orchestration

// No Elastic Assistant dependency!
```

**Benefit:** Ship without Elastic Assistant team coordination
**Trade-off:** No shared infrastructure (but cleaner separation)
**Effort:** Same (LangChain is well-documented)

---

**✅ REMOVE Attack Discovery Dependency:**
```typescript
// Option A: Copy Attack Discovery patterns (soft dependency on team)
import { getAnthropicClaude } from '../attack_discovery/graphs/helpers';

// Option B: Implement own patterns (AUTONOMOUS)
// Create own LangGraph setup following official LangChain docs
// No code copying needed

const investigationGraph = new StateGraph<InvestigationState>({
  // Our own implementation
});
```

**Benefit:** No dependency on Attack Discovery team
**Trade-off:** Can't reuse their helpers (but simple to implement)
**Effort:** +2 hours (implement own graph setup)

---

**✅ REMOVE Connectors Dependency:**
```typescript
// Option A: Use Connectors framework (depends on Connectors team)
const virusTotalConnector = await connectors.get('virustotal');
await virusTotalConnector.execute({ ioc });

// Option B: Direct HTTP calls (AUTONOMOUS)
const response = await fetch('https://www.virustotal.com/api/v3/...', {
  headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY },
});

// No Connectors team dependency!
```

**Benefit:** Ship without Connectors team review
**Trade-off:** User provides API keys (reasonable for power users)
**Effort:** +1 hour (HTTP calls are simpler than connector framework)

---

**✅ REMOVE Cases Dependency:**
```typescript
// Option A: Use Cases API (depends on Cases team)
await cases.client.addComment({ caseId, comment });

// Option B: Just log results (AUTONOMOUS)
ruleExecutionLogger.info(`Investigation: ${JSON.stringify(results)}`);

// Or create standalone "investigations" index:
await esClient.index({
  index: '.investigations-*',
  body: investigationResults,
});
```

**Benefit:** Ship without Cases team coordination
**Trade-off:** No native Case integration (but can add later)
**Effort:** Zero (logging is simpler)

---

**LLM Investigation Result:** ✅ **1 blocking dependency** (AppSec only)

**Ship Timeline:** 3-4 weeks (implementation + AppSec review)

---

## Recommended Autonomous Approach

### Strategy: Self-Contained Implementation

**Principle:** Build everything in Security Solution plugin, minimize external APIs

**Benefits:**
- ✅ Ship without coordination (only AppSec review needed)
- ✅ Faster iteration (no waiting for other teams)
- ✅ Clear ownership (Security team owns all code)
- ✅ Easier debugging (no cross-plugin complexity)

**Trade-offs:**
- ⚠️ No shared infrastructure (duplicate some code)
- ⚠️ User provides API keys (vs centralized connector management)
- ⚠️ Features are "batteries not included" (power user focused)

**Acceptable?** ✅ YES for spikes (can integrate with shared infra post-GA)

---

## Specific Implementation Recommendations

### For Correlation Spike (Already Optimal)

**Current Dependencies:** AppSec only ✅

**Already Autonomous:**
- ✅ Self-contained correlation logic
- ✅ No external plugin APIs
- ✅ Pure Elasticsearch + Detection Engine

**Action:** None needed (already minimal dependencies)

---

### For MITRE Auto-Map

**Recommended Approach: Direct LangChain**

```typescript
// File: server/lib/detection_engine/enrichments/mitre_mapping/llm_client.ts

import { ChatAnthropic } from '@langchain/anthropic';

/**
 * Create Claude client for MITRE mapping.
 * Uses API key from Kibana config (user-provided).
 *
 * Config: xpack.securitySolution.mitre.anthropicApiKey
 */
export function createMitreLLMClient(config: ConfigType): ChatAnthropic {
  const apiKey = config.mitre?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'MITRE Auto-Map requires Anthropic API key. ' +
      'Set xpack.securitySolution.mitre.anthropicApiKey in kibana.yml'
    );
  }

  return new ChatAnthropic({
    apiKey,
    modelName: 'claude-3-5-haiku-20241022',
    temperature: 0,
    maxRetries: 2,
  });
}
```

**Configuration:**
```yaml
# kibana.yml
xpack.securitySolution:
  mitre:
    anthropicApiKey: "sk-ant-..."  # User provides
    enabled: true
```

**Dependencies Removed:**
- ❌ Elastic Assistant team (no dependency)
- ❌ ML team (no ELSER dependency)

**Dependencies Remaining:**
- 🔴 AppSec (required)

**Team Reviews Needed:** 1 (AppSec only)

---

### For LLM Investigation

**Recommended Approach: Self-Contained Multi-Agent**

```typescript
// File: server/lib/detection_engine/investigation/llm_client.ts

import { ChatAnthropic } from '@langchain/anthropic';
import { StateGraph } from '@langchain/langgraph';

/**
 * Self-contained investigation system.
 * No dependencies on Elastic Assistant, Attack Discovery, or Connectors.
 *
 * User provides:
 * - Anthropic API key (for LLM)
 * - VirusTotal API key (for CTI - optional)
 */
export function createInvestigationGraph(config: ConfigType) {
  const llmClient = new ChatAnthropic({
    apiKey: config.investigation.anthropicApiKey,
    modelName: 'claude-3-5-haiku-20241022',
  });

  const graph = new StateGraph({...}); // Our own orchestration

  // Add agents (all self-contained)
  graph.addNode('triage', createTriageAgent(llmClient));
  graph.addNode('cti', createCTIAgent(llmClient, config.investigation.virusTotalApiKey));
  graph.addNode('mitre', createMitreAgent(llmClient));
  graph.addNode('investigate', createInvestigationAgent(llmClient));
  graph.addNode('remediate', createRemediationAgent(llmClient));

  return graph.compile();
}
```

**Configuration:**
```yaml
# kibana.yml
xpack.securitySolution:
  investigation:
    anthropicApiKey: "sk-ant-..."
    virusTotalApiKey: "..."  # Optional
    enabled: true
```

**Dependencies Removed:**
- ❌ Elastic Assistant (no dependency)
- ❌ Attack Discovery (no code reuse)
- ❌ Cases (just log results)
- ❌ Connectors (direct HTTP calls)

**Dependencies Remaining:**
- 🔴 AppSec (required)

**Team Reviews Needed:** 1 (AppSec only)

---

## Comparison: Shared Infrastructure vs Self-Contained

### Shared Infrastructure Approach

**Dependencies:**
```
XDR Correlation:
  - AppSec ✅
  - Cases (optional)
  - ResponseOps (optional)
  = 1-3 teams

MITRE Auto-Map:
  - AppSec ✅
  - Elastic Assistant
  - ML (if ELSER)
  = 2-3 teams

LLM Investigation:
  - AppSec ✅
  - Elastic Assistant
  - Attack Discovery
  - Cases
  - Connectors
  = 5 teams

TOTAL: 8-11 team dependencies
```

**Timeline:**
- Coordination meetings: 2-3 weeks
- Review cycles: 1-2 weeks per team
- **Total: 6-10 weeks to ship all features**

**Pros:**
- ✅ Reuses existing infrastructure
- ✅ Centralized API key management
- ✅ Shared monitoring/observability

**Cons:**
- ❌ Long coordination time
- ❌ Blocked on other teams' priorities
- ❌ Complex review process

---

### Self-Contained Approach (RECOMMENDED)

**Dependencies:**
```
All 3 Spikes:
  - AppSec ✅ (required for GA)

TOTAL: 1 team dependency
```

**Timeline:**
- AppSec review: 1 week (parallel for all 3)
- Implementation: Parallel (no blocking)
- **Total: 2-4 weeks to ship all features**

**Pros:**
- ✅ Fast shipping (minimal coordination)
- ✅ Clear ownership (Security team owns all code)
- ✅ Independent iteration (no blocking)
- ✅ Simpler debugging (all code in one plugin)

**Cons:**
- ⚠️ User provides API keys (vs centralized management)
- ⚠️ Some code duplication (LLM client setup)
- ⚠️ No integration with Cases/Connectors initially

---

## Trade-off Analysis

### Option A: Shared Infrastructure (SLOW)

**What You Get:**
- ✅ Integrated with Elastic Assistant
- ✅ Integrated with Cases
- ✅ Integrated with Connectors
- ✅ Centralized API keys

**What You Pay:**
- ❌ 6-10 weeks coordination
- ❌ 8-11 team dependencies
- ❌ Complex review process
- ❌ Blocked on other teams' roadmaps

**When to Use:** Production polish (post-GA integration)

---

### Option B: Self-Contained (FAST - RECOMMENDED)

**What You Get:**
- ✅ Ship in 2-4 weeks (6-10 weeks faster)
- ✅ 1 team dependency (AppSec only)
- ✅ Clear ownership
- ✅ Independent iteration

**What You Pay:**
- ⚠️ Users provide API keys
- ⚠️ ~100 lines code duplication (LLM setup)
- ⚠️ Manual CTI configuration (vs Connectors UI)

**When to Use:** Spikes and MVP (fast validation)

---

**My Recommendation: Option B for spikes, migrate to Option A post-GA**

**Rationale:**
1. **Spike goal:** Validate quickly, get feedback
2. **User base:** Power users (Security engineers) can handle API keys
3. **Integration:** Can add Cases/Connectors in 10.2 (after validation)
4. **Speed:** 60-70% faster to GA

---

## Implementation Pattern: Self-Contained

### Template for All 3 Spikes

**Configuration (kibana.yml):**
```yaml
xpack.securitySolution:
  llm:
    anthropicApiKey: "${ANTHROPIC_API_KEY}"  # Env var or direct value
    enabled: true

  mitre:
    anthropicApiKey: "${ANTHROPIC_API_KEY}"  # Can reuse same key
    enabled: true

  investigation:
    anthropicApiKey: "${ANTHROPIC_API_KEY}"
    virusTotalApiKey: "${VIRUSTOTAL_API_KEY}"  # Optional
    enabled: true
```

**LLM Client Pattern:**
```typescript
// Each spike creates own client (self-contained)
// File: server/lib/detection_engine/<feature>/llm_client.ts

import { ChatAnthropic } from '@langchain/anthropic';

export function createLLMClient(config: ConfigType): ChatAnthropic {
  const apiKey = config.<feature>.anthropicApiKey;

  if (!apiKey) {
    throw new Error('Anthropic API key required. Set in kibana.yml');
  }

  return new ChatAnthropic({
    apiKey,
    modelName: 'claude-3-5-haiku-20241022',
    temperature: 0,
    maxRetries: 2,
    timeout: 30000,
  });
}
```

**Benefit:** No dependency on Elastic Assistant

---

**Result Storage Pattern:**
```typescript
// Don't depend on Cases API - store in Elasticsearch directly

// Option 1: Store in alert metadata
const enrichedAlert = {
  ...alert,
  'kibana.alert.investigation': investigationResults,
};

// Option 2: Store in separate index (more flexible)
await esClient.index({
  index: '.investigations-security-*',
  body: {
    alertId: alert.id,
    investigation: investigationResults,
    timestamp: new Date().toISOString(),
  },
});

// Option 3: Add as alert comment (uses existing comments API, no Cases dependency)
await esClient.update({
  index: alert._index,
  id: alert._id,
  body: {
    doc: {
      'kibana.alert.comments': [
        {
          type: 'ai_investigation',
          content: investigationResults,
          timestamp: new Date().toISOString(),
        },
      ],
    },
  },
});
```

**Benefit:** No dependency on Cases team

---

## AppSec Review Strategy (The One Required Dependency)

**Since AppSec review is NON-NEGOTIABLE, optimize it:**

### Consolidate AppSec Reviews

**Instead of:**
- 3 separate reviews (Correlation, MITRE, Investigation) = 3 weeks

**Do:**
- 1 combined review (all 3 spikes together) = 1 week

**How:**
```
Week 1: Implement all 3 spikes (parallel)
Week 2: Submit all 3 to AppSec as "AI Security Package"
Week 3: AppSec reviews all together (shared security model)
Week 4: Address findings across all 3

Result: 4 weeks total (vs 9 weeks sequential)
```

**Prep for AppSec:**
- ✅ Comprehensive security doc (RBAC_SECURITY_MODEL.md) - DONE
- ✅ Common threats documented (injection, data leakage)
- ✅ Common mitigations (input validation, escaping)
- ⚡ Single review covers all 3 spikes

---

## Recommended Shipping Strategy

### Phase 1: Spike Development (Weeks 1-2) - PARALLEL

**All Self-Contained:**

**Correlation:**
- ✅ Already complete
- ✅ No team dependencies
- ✅ Ready for AppSec

**MITRE:**
- 🔲 Implement in 4-6 hours
- ✅ Direct LangChain (no Elastic Assistant)
- ✅ Pure LLM (no ML team)
- ✅ Ready for AppSec

**Investigation:**
- 🔲 Implement foundation in 1 week
- ✅ Direct LangChain (no Elastic Assistant)
- ✅ Own LangGraph (no Attack Discovery)
- ✅ Direct HTTP (no Connectors)
- ✅ ES storage (no Cases)
- ✅ Ready for AppSec

---

### Phase 2: AppSec Review (Week 3) - CONSOLIDATED

**Submit All 3 Together:**
- Shared security model documented
- Common threat mitigation strategies
- Single review cycle

**AppSec Reviews:**
- LLM prompt injection risks
- API key security
- Data leakage prevention

**Result:** 1 week review for all 3 (not 3 weeks)

---

### Phase 3: Ship (Week 4)

**All 3 spikes GA:**
- Correlation + MITRE + Investigation
- Behind experimental flags
- Minimal dependencies

**Total Timeline:** 4 weeks (vs 10+ weeks with full team coordination)

---

## Cost-Benefit: Self-Contained vs Integrated

### Development Cost

**Self-Contained:**
- Implementation: Same effort
- Coordination: Zero (no meetings)
- **Total: 4 weeks** (pure development)

**Integrated:**
- Implementation: Same effort
- Coordination: 6-8 weeks (meetings, reviews, waiting)
- **Total: 10-14 weeks**

**Time Savings: 6-10 weeks** (60-70% faster)

---

### Technical Debt

**Self-Contained Creates:**
- Duplicate LLM client setup (~50 lines × 3 = 150 lines)
- Direct HTTP calls vs Connectors (~100 lines)
- Manual API key management

**Can Migrate Later:**
```typescript
// 10.2: Migrate to shared infrastructure
// Replace direct LangChain with Elastic Assistant
// Replace HTTP calls with Connectors
// Migrate to Cases API

// Effort: 1-2 days per spike (3-6 days total)
// Benefit: Centralized management
```

**Is Debt Acceptable?** ✅ YES
- Small amount (~250 lines duplicate code)
- Easy to migrate later (1-2 days)
- **Worth it for 6-10 week time savings**

---

## Final Recommendations

### For Fastest Shipping (2-4 Weeks)

**Use Self-Contained Approach:**

**Correlation:**
- ✅ Already self-contained
- ✅ AppSec review only
- ✅ Ship in 3-4 weeks

**MITRE:**
- ✅ Direct LangChain (no Elastic Assistant)
- ✅ Pure LLM (no ML team)
- ✅ AppSec review only
- ✅ Ship in 1-2 weeks

**Investigation:**
- ✅ Direct LangChain (no Elastic Assistant)
- ✅ Own LangGraph (no Attack Discovery)
- ✅ Direct HTTP (no Connectors)
- ✅ ES storage (no Cases)
- ✅ AppSec review only
- ✅ Ship in 3-4 weeks

**All in parallel → 4 weeks total (only blocked on AppSec)**

---

### For Best Integration (6-10 Weeks)

**Use Shared Infrastructure:**
- Elastic Assistant for LLM
- Attack Discovery patterns
- Cases API
- Connectors framework

**Trade-off:** 6-10 weeks coordination

**When to Use:** Post-GA (10.2+) migration

---

## Bottom Line Answer

**Can you remove team dependencies?** ✅ **YES (except AppSec)**

**Should you?** ✅ **YES (for spikes)**

**Approach:**
1. Self-contained implementation (direct LangChain, no shared infra)
2. User-provided API keys (config file)
3. ES-native storage (no Cases API)
4. Direct HTTP for CTI (no Connectors)

**Result:**
- **1 team dependency** (AppSec only)
- **4 week timeline** (vs 10+ weeks)
- **60-70% faster shipping**

**Migration Path:**
- Ship spikes fast (self-contained)
- Validate with users (2-3 months)
- Migrate to shared infrastructure (10.2)
- Effort: 3-6 days migration (worth 6-10 week savings)

---

**Recommendation: GO AUTONOMOUS** ✅

Ship all 3 spikes self-contained, only AppSec review needed.
