# Alert Investigation Pipeline - Refactoring for Minimal Dependencies

**Goal**: Ship feature with ZERO cross-team approvals required
**Strategy**: Use only what exists TODAY in Elastic Stack, defer enhancements requiring other teams

---

## Current Dependency Analysis

### Dependencies BLOCKING Ship

| Dependency | Blocking Team | Why Blocking | Avoidable? |
|------------|---------------|--------------|------------|
| Agent Builder integration | Team:ResponseOps, Team:AIInfra | Workflow step type doesn't exist | ✅ YES - Use functions, not agents |
| Alert event triggers | Team:Cases, Team:DetectionEngine | Event type doesn't exist | ✅ YES - Use Task Manager (polling) |
| ELSER deployment | Team:ML | Not default in Security | ✅ YES - Keep Jaccard (works fine) |
| Entity Store API | Team:EntityAnalytics | API doesn't exist yet | ✅ YES - Keep static risk_score |

**Result**: ✅ **ALL dependencies are avoidable!**

### Dependencies We CAN Use (No Approvals Needed)

| Capability | Location | Available? | Owner |
|------------|----------|------------|-------|
| **Elastic Workflows** | @kbn/workflows | ✅ YES | Already in plugin deps |
| **Task Manager** | @kbn/task-manager | ✅ YES | Already in plugin deps |
| **Cases API** | @kbn/cases-plugin | ✅ YES | Already in plugin deps |
| **Elasticsearch** | @kbn/core | ✅ YES | Core dependency |
| **Attack Discovery** | ../attack_discovery/ | ✅ YES | Same plugin |

**We can ship with ONLY these!**

---

## Refactoring Plan: Self-Contained Pipeline

### Phase 1: Restructure for Independence (2-3 hours)

**Goal**: Make pipeline independent module that HAPPENS to integrate with Attack Discovery (not child of AD)

#### Step 1: Move pipeline to independent directory (30 min)

**From:**
```
server/lib/
  └── attack_discovery/
      └── pipeline/  ← Under AD (implies dependency)
```

**To:**
```
server/lib/
  ├── attack_discovery/  (unchanged)
  └── alert_investigation/  ← NEW: Independent feature
      ├── pipeline/
      │   ├── deduplication/
      │   ├── entity_extraction/
      │   ├── case_matching/
      │   └── orchestrator.ts
      ├── workflows/
      │   └── steps/
      │       ├── fetch_alerts_step.ts
      │       ├── deduplicate_step.ts
      │       ├── extract_entities_step.ts
      │       ├── case_matching_step.ts
      │       └── tag_processed_step.ts
      └── integrations/
          └── attack_discovery_integration.ts  ← AD is ONE integration
```

**Migration**:
```bash
# Move pipeline directory
git mv server/lib/attack_discovery/pipeline server/lib/alert_investigation/pipeline

# Update imports (0 external imports = easy!)
find server/lib/alert_investigation -name "*.ts" -exec sed -i '' 's|attack_discovery/pipeline|alert_investigation/pipeline|g' {} \;

# Update test imports
find server/lib/alert_investigation -name "*.test.ts" -exec sed -i '' 's|attack_discovery/pipeline|alert_investigation/pipeline|g' {} \;
```

**Benefit**: Clear that this is independent of Attack Discovery

---

#### Step 2: Extract AD integration to separate module (30 min)

**Current**: AD trigger is embedded in orchestrator

**Refactor**: Make AD one optional integration

```typescript
// server/lib/alert_investigation/integrations/attack_discovery_integration.ts
import type { GenerateAdFn } from '../../attack_discovery/types';

export async function triggerAttackDiscoveryForCases(
  caseIds: string[],
  generateAdFn: GenerateAdFn,
  context: Context
): Promise<{ successCount: number; failureCount: number }> {
  // Moved from orchestrator - AD-specific logic isolated here
  const results = await Promise.all(
    caseIds.map(caseId => triggerCaseAttackDiscovery({ caseId, generateAdFn, context }))
  );

  return {
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
  };
}

// orchestrator.ts: Make AD optional!
export async function runInvestigationPipeline(params) {
  // ... stages 1-4 (always run)

  // Stage 5: OPTIONAL Attack Discovery integration
  if (params.generateAttackDiscoveriesFn) {
    const adResult = await triggerAttackDiscoveryForCases(
      affectedCaseIds,
      params.generateAttackDiscoveriesFn,
      context
    );
    adTriggered = adResult.successCount;
  } else {
    // Pipeline still works without AD! Just skips stage 5
    logger.info('Attack Discovery integration not provided - skipping stage 5');
  }

  return { /* results */ };
}
```

**Benefit**: Pipeline works standalone OR with AD integration (your choice)

---

#### Step 3: Make all cross-team features optional (1 hour)

**Remove blocking dependencies by making everything optional:**

```typescript
export interface PipelineIntegrations {
  attackDiscovery?: {
    generateFn: GenerateAdFn;
    enabled: boolean;
  };
  entityAnalytics?: {
    getRiskScore: (entity: string, type: string) => Promise<RiskScore>;
    enabled: boolean;
  };
  agentBuilder?: {
    invokeAgent: (agentId: string, input: unknown) => Promise<unknown>;
    enabled: boolean;
  };
  // All optional! Pipeline works with zero integrations
}

export async function runInvestigationPipeline(
  params: RunPipelineParams,
  integrations: PipelineIntegrations = {} // Default: no integrations
) {
  // Stage 1-4: Always run (deterministic, no dependencies)
  const { leaders, entities, caseIds } = await runDeterministicPipeline(params);

  // Stage 5+: Optional integrations (only if provided)
  const results = {
    adTriggered: 0,
    entitiesEnriched: 0,
    // ...
  };

  if (integrations.attackDiscovery?.enabled) {
    results.adTriggered = await integrations.attackDiscovery.generateFn(/* ... */);
  }

  if (integrations.entityAnalytics?.enabled) {
    results.entitiesEnriched = await enrichWithEntityRisk(entities, integrations.entityAnalytics);
  }

  return results;
}
```

**Benefit**: Ship deterministic pipeline (stages 1-4) immediately, add integrations later

---

### Phase 2: Scheduled Execution WITHOUT Cross-Team Dependencies (1 hour)

**Goal**: Use Task Manager (already available) instead of waiting for alert event triggers

**Current approach**: Manual API invocation only

**Self-contained approach**: Task Manager scheduling (no Team:Cases approval needed)

```typescript
// server/lib/alert_investigation/task_manager/pipeline_task.ts
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

const PIPELINE_TASK_TYPE = 'elastic_assistant:alert_investigation_pipeline';

export function registerPipelineTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [PIPELINE_TASK_TYPE]: {
      title: 'Alert Investigation Pipeline Runner',
      description: 'Runs alert investigation pipeline every 15 minutes',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }) => ({
        async run() {
          const { logger, elasticsearch, savedObjects } = await getServices();

          // Run pipeline
          const result = await runInvestigationPipeline({
            // ... params
            uiSettings, // Feature flag check happens here
          });

          logger.info(`Pipeline run complete: ${result.alertsProcessed} alerts processed`);

          // Reschedule for next run (15 min)
          return { state: {}, runAt: new Date(Date.now() + 15 * 60 * 1000) };
        },
      }),
    },
  });
}

export async function schedulePipelineExecution(
  taskManager: TaskManagerStartContract,
  uiSettings: IUiSettingsClient
) {
  // Check feature flag
  const isEnabled = await uiSettings.get(ALERT_INVESTIGATION_PIPELINE_ENABLED);
  if (!isEnabled) {
    return; // Don't schedule if disabled
  }

  // Schedule task (runs every 15 min)
  await taskManager.ensureScheduled({
    id: 'alert_investigation_pipeline_default_space',
    taskType: PIPELINE_TASK_TYPE,
    schedule: { interval: '15m' },
    params: {},
    state: {},
  });
}
```

**Dependencies**: ✅ Task Manager only (already in plugin.json)

**NO approval needed from**: Team:Cases, Team:DetectionEngine, Team:ResponseOps

**Trade-off**: Polling (15 min delay) vs event-driven (instant) - acceptable for spike

**Future enhancement**: When Team:Cases adds alert event triggers, switch from polling to events (1 hour migration)

---

## Minimal Dependency Architecture

### What We Ship (Phase 1 - No External Approvals)

```
┌────────────────────────────────────────────┐
│   Alert Investigation Pipeline             │
│   (self-contained in elastic_assistant)    │
│                                            │
│   Stages 1-4: Deterministic                │
│   - Fetch (ES query)                       │
│   - Dedup (Jaccard)                        │
│   - Extract (ECS mappings)                 │
│   - Match (weighted scoring)               │
│                                            │
│   Stage 5: Optional Integration            │
│   - Attack Discovery (same plugin)         │
│                                            │
│   Orchestration:                            │
│   - Task Manager (polling, 15 min)         │
│   - Feature flag (UI settings)             │
│                                            │
│   Dependencies: ZERO external teams        │
└────────────────────────────────────────────┘
```

**Can ship today with approvals from**: elastic_assistant maintainers only (your team!)

---

### What We Defer (Phase 2 - Requires Platform Teams)

**Deferred enhancements** (roadmap for Q3-Q4):
1. **Agent Builder integration** → Requires Team:ResponseOps (defer)
2. **Alert event triggers** → Requires Team:Cases (defer, use Task Manager)
3. **ELSER semantic dedup** → Requires Team:ML (defer, keep Jaccard)
4. **Entity Store risk scoring** → Requires Team:EntityAnalytics (defer, keep static)

**All deferred features are in GitHub issues (#16410-16414) - not blocking ship**

---

## Recommended Refactoring

### 1. Move pipeline out of attack_discovery/ (30 min)

```bash
# Self-contained alert investigation feature
git mv server/lib/attack_discovery/pipeline server/lib/alert_investigation

# Update imports (only in routes, easy)
find server/routes -name "*.ts" -exec sed -i '' 's|attack_discovery/pipeline|alert_investigation|g' {} \;
```

**Benefit**: Clear that this is independent feature (not child of AD)

**Dependencies after move**: ZERO (self-contained)

---

### 2. Make Task Manager scheduling default (1 hour)

**Add to plugin start**:

```typescript
// server/plugin.ts
public async start(core: CoreStart, plugins: ElasticAssistantPluginStartDependencies) {
  // Check feature flag
  const uiSettings = core.uiSettings.asScopedToClient(
    core.savedObjects.getScopedClient(kibanaRequest)
  );
  const isPipelineEnabled = await uiSettings.get(ALERT_INVESTIGATION_PIPELINE_ENABLED);

  if (isPipelineEnabled) {
    // Schedule pipeline execution (Task Manager - no external team needed!)
    await schedulePipelineExecution(plugins.taskManager, uiSettings, this.logger);
    this.logger.info('Alert Investigation Pipeline scheduled (every 15 min)');
  }
}
```

**Dependencies**: Task Manager (already in plugin.json)

**NO approval needed from**: Team:Cases, Team:ResponseOps, Team:DetectionEngine

---

### 3. Document cross-team features as Phase 2 (30 min)

**Update spike doc**:

```markdown
## What Ships in Phase 1 (This PR)

✅ **Self-contained pipeline** (elastic_assistant plugin only)
- Stages 1-4: Deterministic alert processing (dedup, extract, match)
- Stage 5: Optional Attack Discovery integration (same plugin)
- Execution: Task Manager scheduling (15 min intervals)
- Feature flag: UI settings (toggle on/off)

**Dependencies**: NONE (ships independently)

---

## What's Deferred to Phase 2 (Q3-Q4 2026)

**Requires platform team collaboration:**

❌ Agent Builder integration (#16410, #16411) - Team:ResponseOps
❌ Alert event triggers (#16412) - Team:Cases, Team:DetectionEngine
❌ ELSER semantic dedup (#16413) - Team:ML
❌ Entity Store risk scoring (#16414) - Team:EntityAnalytics

**All deferred features are**:
- Documented in GitHub issues
- Have implementation plans
- Have workarounds in Phase 1 (polling, Jaccard, static risk)
- Can be added incrementally (no breaking changes)

**Timeline**: Phase 2 features added as platform capabilities become available (no hard dependencies)
```

---

## Minimal Approval Path

### Current Approvals Needed

**Before refactoring:**
- Team:ResponseOps (Agent Builder integration)
- Team:Cases (workflow triggers)
- Team:DetectionEngine (alert events)
- Team:ML (ELSER deployment)
- Team:EntityAnalytics (entity risk API)
- Security Solution (feature approval)
- **Total: 6 teams**

**After refactoring:**
- Security Solution (feature approval)
- **Total: 1 team** (your team!)

**Reduction: 83% fewer approvals needed** 🎯

---

## Recommended File Structure

```
x-pack/solutions/security/plugins/elastic_assistant/
└── server/lib/
    ├── alert_investigation/  ← NEW: Independent, self-contained
    │   ├── pipeline/
    │   │   ├── deduplication/  (Jaccard - no ELSER dependency)
    │   │   ├── entity_extraction/  (ECS mappings - no Entity Store dependency)
    │   │   ├── case_matching/  (weighted scoring - no ML dependency)
    │   │   └── orchestrator.ts  (coordinates stages)
    │   ├── task_management/  (Task Manager scheduling - no workflow triggers dependency)
    │   │   └── schedule_pipeline.ts
    │   ├── integrations/  (optional integrations)
    │   │   └── attack_discovery.ts  (AD is ONE integration)
    │   └── workflows/  (Elastic Workflows steps - reusable but not required)
    │       └── steps/
    │           ├── fetch_step.ts
    │           ├── dedup_step.ts
    │           └── extract_step.ts
    └── attack_discovery/  (unchanged)
        └── graphs/
```

**Key principle**: Everything in `alert_investigation/` works WITHOUT external teams

---

## Implementation

**Time**: 2-3 hours total
**Approvals needed**: elastic_assistant maintainers only
**Breaking changes**: None (backward compatible)

**Steps**:
1. ✅ Move directory (30 min)
2. ✅ Update imports (30 min)
3. ✅ Add Task Manager scheduling (1 hour)
4. ✅ Update documentation (30 min)
5. ✅ Validate tests pass (30 min)

---

## What This Enables

### Immediate Ship (Phase 1)
- ✅ **Autonomous alert investigation** (dedup, match, attach to cases)
- ✅ **Incremental Attack Discovery** (optional integration)
- ✅ **Scheduled execution** (Task Manager, 15 min intervals)
- ✅ **Feature flag** (safe toggle)
- ✅ **Elastic Workflows steps** (bonus - can be used in other workflows)

**Value**: Solves alert fatigue TODAY with zero external dependencies

### Future Enhancements (Phase 2)
- ⚠️ Event-driven triggers (when Team:Cases ready)
- ⚠️ Agent Builder multi-agent (when Team:ResponseOps ready)
- ⚠️ ELSER semantic dedup (when Team:ML ready)
- ⚠️ Entity risk scoring (when Team:EntityAnalytics ready)

**Value**: Incremental improvements without blocking Phase 1

---

## Decision

**Should we refactor now?**

**Option A: Refactor now** (2-3 hours)
- ✅ Clean architecture (alert_investigation independent)
- ✅ Ship without cross-team approvals
- ⚠️ Adds 2-3 hours to spike

**Option B: Ship as-is, refactor in Phase 2**
- ✅ Ship faster (no refactoring time)
- ⚠️ Pipeline stays under attack_discovery/ (misleading)
- ⚠️ May need refactoring anyway when adding Phase 2 features

**My recommendation**: **Option A** (refactor now, 2-3 hours well-spent)

**Why**:
- Clean architecture is easier to maintain
- Avoids "we'll refactor later" (rarely happens)
- 2-3 hours now saves 1-2 days of untangling later
- Clear that this feature is independent

---

**Shall I proceed with the refactoring to minimize dependencies and enable shipping with just elastic_assistant team approval?**
