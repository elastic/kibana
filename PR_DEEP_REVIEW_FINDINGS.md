# PR #257957 Deep Review - Alert Investigation Pipeline

**Reviewer**: Claude (Deep Analysis Mode)
**Date**: 2026-03-21
**Commit**: 6db9ebcde959
**Files**: 52 | **Lines**: 6,845 | **Tests**: 62 passing

---

## Executive Summary

**Overall Assessment**: ⭐⭐⭐⭐ (4/5) **STRONG** with critical gaps

The PR demonstrates excellent code quality fundamentals (zero type/lint suppressions, strong typing, good tests), clean architecture patterns, and achieves the goal of minimal cross-team dependencies. However, **3 critical incomplete features** compromise the "workflow-only" claim and **2 workflow steps are non-functional scaffolds**.

**Recommendation**: Address CRITICAL and HIGH severity findings before merge.

---

## Findings by Severity

### 🔴 CRITICAL (Block Merge) - 3 Issues

#### 1. Workflow Steps 4-5 Are Non-Functional Scaffolds

**Location**:
- `workflow_steps/case_matching_step.ts` (lines 46-64)
- `workflow_steps/trigger_incremental_ad_step.ts` (lines 60-84)

**Issue**:
```typescript
// case_matching_step.ts - Returns zeros, does NO work
return {
  output: {
    cases_matched: 0,
    cases_created: 0,
    alerts_attached: 0,
    affected_case_ids: [],
  },
};
```

```typescript
// trigger_incremental_ad_step.ts - Only logs, doesn't trigger AD
context.logger.info(`Would trigger incremental AD...`);
// TODO: Wire to actual AD function
```

**Impact**:
- Workflow definitions are **broken** - stages 4-5 do nothing
- Users enabling Elastic Workflows will get incomplete pipeline
- "Workflow-only architecture" claim is **false**

**Evidence**:
- 4 TODO comments in workflow steps
- Case matching returns hardcoded zeros
- AD triggering only logs intent

**Fix Required** (2-3 hours):
```typescript
// case_matching_step.ts - FIXED
handler: async (context) => {
  const { entities, leader_alert_ids } = context.input;

  // Get Cases client from workflow context
  const casesClient = context.contextManager.getCasesClient();

  // Call existing business logic
  const matchingResult = await matchAlertsToCases({
    entities: entities.map(e => ({
      typeKey: e.type_key as ObservableTypeKey,
      value: e.value,
      alertId: e.alert_id,
    })),
    cases: casesClient,
    config: DEFAULT_PIPELINE_CONFIG.caseMatching,
    logger: context.logger,
    request: context.request, // Need to add to workflow context
  });

  // Attach alerts to matched cases
  const affectedCaseIds = new Set<string>();
  for (const match of matchingResult.matched) {
    await casesClient.attachments.add({
      caseId: match.matchedCase!.caseId,
      attachment: {
        type: 'alert',
        alertId: [match.alertId],
        index: context.input.index_pattern,
        rule: { /* extract from alert */ },
      },
    });
    affectedCaseIds.add(match.matchedCase!.caseId);
  }

  // Create cases for unmatched alerts (if configured)
  // ...

  return {
    output: {
      cases_matched: matchingResult.matched.length,
      cases_created: unmatchedCases.length,
      alerts_attached: matchingResult.matched.length + unmatchedCases.length,
      affected_case_ids: Array.from(affectedCaseIds),
    },
  };
}
```

**Workaround**:
- Routes (`/alert_investigation/_run`) implement stages 1-3 correctly
- Stage 4-5 logic exists in `case_integration/` but not wired to workflow steps
- Users can use routes until workflow steps are completed

---

#### 2. ELSER Semantic Dedup Returns Null (Incomplete Feature)

**Location**: `deduplication/semantic_dedup_elser.ts` (lines 67-90)

**Issue**:
```typescript
export async function deduplicateWithElser(...): Promise<Map<string, string[]> | null> {
  const elserAvailable = await isElserAvailable(esClient);
  if (!elserAvailable) {
    return null; // Expected fallback
  }

  logger.info(`Using ELSER semantic deduplication...`);

  // TODO: Implement ELSER-based clustering
  // For now, return null to use Jaccard (full implementation ~6-8 hours)
  return null; // ← ALWAYS returns null, even when ELSER available!
}
```

**Impact**:
- ELSER is checked but **never used** (dead code path)
- 100% of deployments use Jaccard (even with ML nodes)
- Competitive gap: Dropzone/Torq/Microsoft use semantic dedup (we don't)
- False advertising: README claims ELSER support

**Evidence**:
```bash
$ grep -A5 "Using ELSER" semantic_dedup_elser.ts
logger.info(`Using ELSER semantic deduplication for ${alerts.length} alerts`);
// TODO: Implement ELSER-based clustering
return null;  # Always returns null!
```

**Fix Required** (6-8 hours):

Implement full ELSER clustering:
```typescript
export async function deduplicateWithElser(
  alerts: AlertWithId[],
  esClient: ElasticsearchClient,
  logger: Logger,
  similarityThreshold: number = 0.75
): Promise<Map<string, string[]> | null> {
  const elserAvailable = await isElserAvailable(esClient);
  if (!elserAvailable) {
    return null;
  }

  // Step 1: Generate ELSER embeddings for feature texts
  const featureTexts = alerts.map(a =>
    composeFeatureText(extractAlertFeatures(a._source))
  );

  const embeddings = await generateElserEmbeddings(featureTexts, esClient, logger);
  if (!embeddings) return null;

  // Step 2: Create temporary index for kNN search
  const tempIndexName = `.temp-alert-embeddings-${Date.now()}`;
  await esClient.indices.create({
    index: tempIndexName,
    body: {
      mappings: {
        properties: {
          alert_id: { type: 'keyword' },
          embedding: { type: 'dense_vector', dims: 768, similarity: 'cosine' },
        },
      },
    },
  });

  // Step 3: Index embeddings
  await esClient.bulk({
    operations: alerts.flatMap((alert, i) => [
      { index: { _index: tempIndexName } },
      { alert_id: alert._id, embedding: embeddings[i] },
    ]),
    refresh: 'wait_for',
  });

  // Step 4: kNN search for each alert to find neighbors
  const clusters = new Map<string, string[]>();
  const uf = new UnionFind();
  alerts.forEach(a => uf.init(a._id));

  for (let i = 0; i < alerts.length; i++) {
    const knnResult = await esClient.search({
      index: tempIndexName,
      knn: {
        field: 'embedding',
        query_vector: embeddings[i],
        k: 10,
        num_candidates: 50,
      },
      _source: ['alert_id'],
    });

    for (const hit of knnResult.hits.hits) {
      const score = (hit._score ?? 0);
      if (score >= similarityThreshold) {
        const neighborId = (hit._source as { alert_id: string }).alert_id;
        uf.union(alerts[i]._id, neighborId);
      }
    }
  }

  // Step 5: Build cluster map from Union-Find
  const clusterMap = new Map<string, string[]>();
  for (const alert of alerts) {
    const root = uf.find(alert._id);
    const members = clusterMap.get(root) ?? [];
    members.push(alert._id);
    clusterMap.set(root, members);
  }

  // Cleanup temp index
  await esClient.indices.delete({ index: tempIndexName }).catch(() => {});

  logger.info(`ELSER dedup: ${alerts.length} alerts → ${clusterMap.size} clusters`);
  return clusterMap;
}
```

**Alternative Quick Fix** (1 hour):
Remove ELSER code entirely, document as Phase 2:
```typescript
// semantic_dedup_elser.ts - DELETE FILE

// deduplicate_alerts.ts
export async function deduplicateAlerts(...) {
  // Always use Jaccard (ELSER deferred to Phase 2)
  return deduplicateWithJaccard(alerts, threshold);
}
```

Update docs:
```markdown
## Deduplication

**Current**: Jaccard similarity (lexical matching)
**Phase 2**: ELSER semantic embeddings (GitHub issue #16415)
```

---

#### 3. Incremental AD Logic Exists But Not Wired to Workflow Step

**Location**: `workflow_steps/trigger_incremental_ad_step.ts`

**Issue**:
```typescript
// Line 73-75: Commented out import!
// const { triggerCaseAttackDiscovery } = await import('../case_integration');

context.logger.info(`Would trigger incremental AD for case ${caseId}...`);
// Returns triggered: true but does NOTHING
```

Meanwhile, working implementation exists:
```typescript
// case_integration/trigger_case_ad.ts - WORKING CODE EXISTS
export async function triggerCaseAttackDiscovery({
  esClient,
  caseId,
  newAlertIds,
  spaceId,
  logger,
  generateAttackDiscoveriesFn,
}: TriggerCaseAdParams): Promise<void> {
  // Full delta-based AD logic (50+ lines)
  // Tracker updates, minimum threshold checks, AD invocation
}
```

**Impact**:
- Workflow step claims success but doesn't trigger AD
- Routes work (`/case/{caseId}/_trigger_ad`) but workflows don't
- Inconsistent behavior between execution paths

**Fix Required** (30 minutes):
```typescript
// trigger_incremental_ad_step.ts
handler: async (context) => {
  const { affected_case_ids, alert_ids_by_case, min_new_alerts } = context.input;

  const results = await Promise.all(
    affected_case_ids.map(async (caseId) => {
      const alertIds = alert_ids_by_case[caseId] ?? [];

      if (alertIds.length < min_new_alerts) {
        return { case_id: caseId, triggered: false, delta_alerts: alertIds.length };
      }

      // Get AD function from workflow context (needs to be added to context)
      const { generateAttackDiscoveriesFn } = context.contextManager.getAIServices();

      // Call existing working implementation
      await triggerCaseAttackDiscovery({
        esClient: context.contextManager.getScopedEsClient(),
        caseId,
        newAlertIds: alertIds,
        spaceId: context.contextManager.getSpaceId(),
        logger: context.logger,
        generateAttackDiscoveriesFn,
      });

      return { case_id: caseId, triggered: true, delta_alerts: alertIds.length };
    })
  );

  return {
    output: {
      ad_triggered: results.filter(r => r.triggered).length,
      ad_results: results,
    },
  };
}
```

---

### 🟠 HIGH (Should Fix Before Merge) - 4 Issues

#### 4. DRY Violation: ES Fetch Pattern Repeated 3x

**Locations**:
- `alert_pipeline_steps.ts`: Lines 139-156 (dedup step)
- `alert_pipeline_steps.ts`: Lines 213-230 (extract step)
- `post_pipeline_run.ts`: Lines 103-108 (route)

**Pattern**:
```typescript
// Repeated 3 times with slight variations
const alertDocs = await esClient.mget({ index: indexPattern, ids: alertIds });

const alerts = alertDocs.docs
  .filter(
    (doc): doc is typeof doc & { found: true; _id: string; _source: Record<string, unknown> } =>
      'found' in doc &&
      (doc as { found?: boolean }).found === true &&
      '_source' in doc &&
      doc._id != null
  )
  .map((doc) => ({
    _id: doc._id,
    _source: doc._source,
  }));
```

**Impact**:
- 15 lines × 3 = 45 lines of duplicate code
- Maintenance burden (fix bug 3 times)
- Inconsistency risk (different error handling)

**Fix** (30 minutes):
```typescript
// Create shared utility
// lib/alert_investigation/utils/fetch_alerts.ts

interface FetchAlertsParams {
  esClient: ElasticsearchClient;
  indexPattern: string;
  alertIds: string[];
  logger: Logger;
}

export async function fetchAlertsByIds({
  esClient,
  indexPattern,
  alertIds,
  logger,
}: FetchAlertsParams): Promise<AlertWithId[]> {
  if (alertIds.length === 0) {
    return [];
  }

  const alertDocs = await esClient.mget({
    index: indexPattern,
    ids: alertIds,
  });

  const alerts = alertDocs.docs
    .filter(
      (doc): doc is typeof doc & { found: true; _id: string; _source: Record<string, unknown> } =>
        'found' in doc &&
        (doc as { found?: boolean }).found === true &&
        '_source' in doc &&
        doc._id != null
    )
    .map((doc) => ({
      _id: doc._id,
      _source: doc._source,
    }));

  const missingCount = alertIds.length - alerts.length;
  if (missingCount > 0) {
    logger.warn(`${missingCount} alerts not found in index ${indexPattern}`);
  }

  return alerts;
}

// Use in all 3 locations:
const alerts = await fetchAlertsByIds({ esClient, indexPattern, alertIds, logger });
```

---

#### 5. Type Safety: Logger Cast Required in Workflow Steps

**Locations**:
- `alert_pipeline_steps.ts`: Lines 160, 234
- All workflow steps cast `context.logger as Logger`

**Issue**:
```typescript
const result = await deduplicateAlerts({
  alerts,
  esClient,
  logger: context.logger as Logger, // Type cast required!
  similarityThreshold: threshold,
});
```

**Root Cause**:
```typescript
// Workflow context provides a logger with different type signature
// than Kibana's Logger interface
context.logger: WorkflowLogger // From @kbn/workflows
// vs
logger: Logger // From @kbn/core/server
```

**Impact**:
- Type safety weakened (casts can hide issues)
- Indicates interface mismatch between workflows and Kibana core
- Fragile (breaks if Logger interface changes)

**Fix** (2 hours - requires @kbn/workflows change):

**Option A**: Adapt business logic to accept both types
```typescript
// types.ts
import type { Logger } from '@kbn/core/server';
import type { WorkflowLogger } from '@kbn/workflows';

export type PipelineLogger = Logger | WorkflowLogger;

// deduplication/index.ts
export async function deduplicateAlerts({
  alerts,
  esClient,
  logger, // No type specified - inferred
  similarityThreshold,
}: {
  alerts: AlertWithId[];
  esClient: ElasticsearchClient;
  logger: PipelineLogger; // Accept both
  similarityThreshold?: number;
}): Promise<DeduplicationResult>
```

**Option B**: Create logger adapter (cleaner)
```typescript
// utils/workflow_logger_adapter.ts
export function adaptWorkflowLogger(workflowLogger: WorkflowLogger): Logger {
  return {
    debug: (msg) => workflowLogger.debug(msg),
    info: (msg) => workflowLogger.info(msg),
    warn: (msg) => workflowLogger.warn(msg),
    error: (msg) => workflowLogger.error(msg),
    // ... other Logger methods
  } as Logger;
}

// In workflow steps:
const logger = adaptWorkflowLogger(context.logger);
const result = await deduplicateAlerts({ alerts, esClient, logger, ... });
```

---

#### 6. Silent Failures: Bulk Update Errors Logged But Not Thrown

**Location**: `alert_pipeline_steps.ts` (tagProcessedAlertsStep), lines 291-300

**Issue**:
```typescript
const result = await esClient.bulk({ operations: body, refresh: 'wait_for' });
const failedCount = result.errors
  ? result.items.filter((item) => item.update?.error).length
  : 0;

if (failedCount > 0) {
  context.logger.warn(`Failed to tag ${failedCount}/${alertIds.length} alerts as processed`);
}

return { output: { tagged_count: alertIds.length - failedCount } };
// ← Function returns success even if 50% of tags failed!
```

**Impact**:
- Partial failures appear as success
- Alerts marked as processed in tracker but NOT in ES
- Re-processing prevention breaks (same alerts processed again)
- No retry mechanism for failed tags

**Scenarios**:
- Index readonly → all tags fail silently
- Alert deleted between fetch and tag → silent failure
- Concurrent update conflict → silent failure

**Fix** (1 hour):
```typescript
const result = await esClient.bulk({ operations: body, refresh: 'wait_for' });

if (result.errors) {
  const failures = result.items.filter(item => item.update?.error);
  const failureRate = failures.length / alertIds.length;

  // Log detailed errors
  for (const failure of failures.slice(0, 5)) { // First 5
    context.logger.error(
      `Failed to tag alert ${failure.update?._id}: ${
        failure.update?.error?.reason ?? 'Unknown error'
      }`
    );
  }

  // Fail fast if >50% errors (systemic issue)
  if (failureRate > 0.5) {
    throw new Error(
      `Bulk tag operation failed for ${failures.length}/${alertIds.length} alerts. ` +
      `This indicates a systemic issue (index readonly, permissions, etc.). ` +
      `Check Elasticsearch logs.`
    );
  }

  // Warn if 10-50% errors (partial failure)
  if (failureRate > 0.1) {
    context.logger.warn(
      `Partial failure tagging alerts: ${failures.length}/${alertIds.length} failed. ` +
      `Pipeline will continue but these alerts may be re-processed.`
    );
  }
}

return {
  output: {
    tagged_count: alertIds.length - (result.errors ? failures.length : 0),
  },
};
```

---

#### 7. Performance: Case Matching O(n*m) Linear Search

**Location**: `case_matching/case_matcher.ts`, lines 232-254

**Issue**:
```typescript
for (const [alertId, alertEntities] of alertEntityGroups) { // O(n) alerts
  const allScores: CaseMatchScore[] = [];

  for (const openCase of openCases) { // O(m) cases - NESTED LOOP!
    if (openCase.observables.length > 0) {
      const { score, matchedEntities } = scoreEntityOverlap({
        alertEntities,
        caseObservables: openCase.observables,
        config,
        caseUpdatedAt: openCase.updatedAt,
      });

      if (score > 0) {
        allScores.push({ caseId: openCase.id, score, ... });
      }
    }
  }
  // ... scoring logic
}
```

**Complexity**: O(n × m × k)
- n = alerts (up to 500)
- m = open cases (up to 100)
- k = entities per alert (avg 10-20)

**Worst case**: 500 × 100 × 20 = **1,000,000 comparisons per run**

**Impact**:
- Scales poorly with case count
- 100-case pagination limit is a performance workaround (not feature)
- 10,000 open cases → pipeline timeout

**Fix** (3-4 hours):

Build inverted index for O(n + m) lookup:
```typescript
// Build entity → case_ids index (O(m))
const entityToCases = new Map<string, Set<string>>();
for (const openCase of openCases) {
  for (const obs of openCase.observables) {
    const key = `${normalizeCasesTypeKey(obs.typeKey)}::${obs.value.toLowerCase()}`;
    const caseSet = entityToCases.get(key) ?? new Set<string>();
    caseSet.add(openCase.id);
    entityToCases.set(key, caseSet);
  }
}

// Match alerts using index (O(n × k))
for (const [alertId, alertEntities] of alertEntityGroups) {
  const candidateCases = new Set<string>();

  // Find all cases that share ANY entity (O(k) lookups)
  for (const entity of alertEntities) {
    const key = `${entity.typeKey}::${entity.value.toLowerCase()}`;
    const matchingCases = entityToCases.get(key);
    if (matchingCases) {
      matchingCases.forEach(cid => candidateCases.add(cid));
    }
  }

  // Score only candidate cases (not all 100)
  const allScores: CaseMatchScore[] = [];
  for (const caseId of candidateCases) {
    const openCase = openCases.find(c => c.id === caseId)!;
    const { score, matchedEntities } = scoreEntityOverlap({
      alertEntities,
      caseObservables: openCase.observables,
      config,
      caseUpdatedAt: openCase.updatedAt,
    });
    if (score > 0) {
      allScores.push({ caseId, score, ... });
    }
  }
}
```

**Result**: 500 × 20 + 100 × 10 = ~11,000 ops (99% reduction!)

---

### 🟡 MEDIUM (Nice to Have) - 3 Issues

#### 8. Magic Numbers: Hardcoded Limits Scattered

**Locations**:
- `alert_pipeline_steps.ts`: Line 30 (max_alerts: 10000)
- `alert_pipeline_steps.ts`: Line 31 (lookback_minutes: 10080)
- `case_matcher.ts`: Line 159 (perPage: 100)
- `post_pipeline_run.ts`: Line 21 (max_alerts: 10000)
- `semantic_dedup_elser.ts`: Line 72 (threshold: 0.75)

**Issue**:
```typescript
max_alerts: z.number().min(1).max(10000).default(500),  // Why 10000?
lookback_minutes: z.number().min(1).max(10080).default(15), // Why 10080?
perPage: 100, // Why 100?
```

**Impact**:
- Unclear rationale (no comments)
- Inconsistent across files
- Hard to tune (scattered definitions)

**Fix** (30 minutes):
```typescript
// types.ts
export const PIPELINE_LIMITS = {
  MAX_ALERTS_PER_RUN: 10_000, // ES max result window
  MAX_LOOKBACK_MINUTES: 10_080, // 7 days (prevent unbounded queries)
  DEFAULT_LOOKBACK_MINUTES: 15,
  DEFAULT_MAX_ALERTS: 500,

  MAX_CASES_TO_EVALUATE: 100, // Performance limit (case matching is O(n*m))
  DEFAULT_CASE_MATCH_THRESHOLD: 0.30,

  MIN_ALERTS_FOR_AD: 2, // AD requires at least 2 alerts for pattern detection

  ELSER_SIMILARITY_THRESHOLD: 0.75, // Cosine similarity (embedding space)
  JACCARD_SIMILARITY_THRESHOLD: 0.85, // Jaccard index (lexical space)
} as const;

// Use everywhere:
max_alerts: z.number()
  .min(1)
  .max(PIPELINE_LIMITS.MAX_ALERTS_PER_RUN)
  .default(PIPELINE_LIMITS.DEFAULT_MAX_ALERTS),
```

---

#### 9. Console Emoji in Production Logs

**Location**: `semantic_dedup_elser.ts` line 110

**Issue**:
```typescript
logger.info('✅ Used ELSER semantic deduplication');
```

**Impact**:
- Emoji in log aggregation systems (Logstash, Filebeat) can break parsing
- Log search fails (searching for "ELSER" doesn't match "✅ ELSER")
- Not Kibana logging convention

**Fix** (5 minutes):
```typescript
logger.info('Used ELSER semantic deduplication (embedding-based)');
logger.info('Using Jaccard similarity deduplication (ELSER unavailable or fallback)');
```

---

#### 10. Missing Input Validation: Entity Type Keys

**Location**: `entity_extraction/extract_entities.ts`

**Issue**:
ECS field mappings trust input data without validation:
```typescript
// ecs_field_mappings.ts
export const ECS_FIELD_MAPPINGS: Array<[string, ObservableTypeKey]> = [
  ['source.ip', 'ipv4'], // Assumes valid IPv4
  ['destination.ip', 'ipv4'],
  ['host.name', 'hostname'], // No validation
  ['user.name', 'user'],
  ['file.hash.sha256', 'file_hash'], // Could be invalid hash
];
```

**Impact**:
- Invalid IPs passed to case matching (false negatives)
- Non-existent users create orphaned entities
- Case observables pollution

**Fix** (2 hours):
```typescript
// entity_extraction/validators.ts
export const ENTITY_VALIDATORS: Record<ObservableTypeKey, (value: string) => boolean> = {
  ipv4: (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) &&
                v.split('.').every(octet => parseInt(octet) <= 255),
  ipv6: (v) => /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i.test(v),
  hostname: (v) => v.length > 0 && v.length <= 253 &&
                   /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(v),
  file_hash: (v) => /^[a-f0-9]{32,64}$/i.test(v), // MD5/SHA256
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  // ... other types
};

// In extractEntitiesFromAlerts:
for (const [field, typeKey] of ECS_FIELD_MAPPINGS) {
  const value = get(alert._source, field);
  if (value && typeof value === 'string') {
    const validator = ENTITY_VALIDATORS[typeKey];
    if (!validator || validator(value)) { // Only add if valid
      entities.push({ typeKey, value, alertId: alert._id });
    } else {
      logger.debug(`Skipped invalid ${typeKey}: ${value} from ${field}`);
    }
  }
}
```

---

### 🟢 LOW (Optional Improvements) - 2 Issues

#### 11. Test Coverage Gaps

**Current**: 1,445 LOC tests, 62 tests passing

**Missing Coverage**:
1. **Workflow step error scenarios** - No tests for ES errors, timeouts, malformed inputs
2. **ELSER fallback logic** - Tested when unavailable, but NOT the always-null path
3. **Case matching edge cases** - No tests for 0 entities, all cases full, temporal decay
4. **Bulk operation partial failures** - Tag step tested only for success path

**Recommendation**:
Add error scenario tests:
```typescript
// workflow_steps/alert_pipeline_steps.test.ts
describe('deduplicateAlertsStep error handling', () => {
  it('should handle ES timeout gracefully', async () => {
    const mockEsClient = {
      mget: jest.fn().mockRejectedValue(new Error('Timeout')),
    };

    await expect(
      deduplicateAlertsStep.handler({ ... })
    ).rejects.toThrow('Timeout');
    // Verify error is logged with context
  });

  it('should handle malformed alert documents', async () => {
    const mockEsClient = {
      mget: jest.fn().mockResolvedValue({
        docs: [{ found: false }], // Alert deleted mid-processing
      }),
    };

    const result = await deduplicateAlertsStep.handler({ ... });
    expect(result.output.leader_alert_ids).toEqual([]);
  });
});
```

---

#### 12. Documentation: README Missing Workflow Execution Guide

**Location**: `README.md`

**Gap**:
README documents API routes but **not** Elastic Workflows execution.

Users enabling feature flag don't know:
- How to trigger workflow manually (if no scheduled execution)
- How to view workflow execution history
- How to debug workflow failures
- Workflow step dependencies

**Fix** (30 minutes):
```markdown
## Elastic Workflows Execution

The Alert Investigation Pipeline runs as an Elastic Workflow with 6 sequential steps:

### Automatic Execution
- **Trigger**: Scheduled (every 15 minutes)
- **Feature Flag**: `elasticAssistant:alertInvestigationPipeline_enabled`
- **Monitor**: Kibana → Stack Management → Workflows → Executions

### Manual Execution
```bash
# Via Workflows API (when available)
POST /api/workflows/security.alertInvestigationPipeline/_execute
{
  "params": {
    "max_alerts": 500,
    "lookback_minutes": 15
  }
}

# Or via direct route (bypass workflows)
POST /internal/elastic_assistant/alert_investigation/_run
{
  "max_alerts": 500,
  "lookback_minutes": 15,
  "dry_run": false
}
```

### Workflow Steps
1. **Fetch Unprocessed Alerts** (`security.fetchUnprocessedAlerts`)
2. **Deduplicate Alerts** (`security.deduplicateAlerts`)
3. **Extract Entities** (`security.extractEntities`)
4. **Match to Cases** (`security.matchAndAttachAlertsToCases`) ⚠️ Scaffold
5. **Trigger Incremental AD** (`security.triggerIncrementalAd`) ⚠️ Scaffold
6. **Tag Processed** (`security.tagProcessedAlerts`)

⚠️ **Note**: Steps 4-5 are scaffolds in this PR. Full implementation tracked in #XXXXX.

### Debugging
- **Workflow execution logs**: Dev Tools → `GET .kibana-workflows-*/_search`
- **Pipeline metrics**: API `/internal/elastic_assistant/alert_investigation/_health`
- **Step-by-step trace**: Enable debug logging (`xpack.elastic_assistant.logLevel: debug`)
```

---

## Summary Table

| # | Issue | Severity | Est. Fix Time | Blocks Merge? |
|---|-------|----------|---------------|---------------|
| 1 | Workflow steps 4-5 non-functional | CRITICAL | 2-3 hours | ✅ YES |
| 2 | ELSER always returns null | CRITICAL | 6-8 hours OR delete | ✅ YES |
| 3 | AD not wired to workflow | CRITICAL | 30 min | ✅ YES |
| 4 | DRY violation (ES fetch 3x) | HIGH | 30 min | ⚠️ SHOULD |
| 5 | Logger type cast required | HIGH | 2 hours | ⚠️ SHOULD |
| 6 | Silent bulk failures | HIGH | 1 hour | ⚠️ SHOULD |
| 7 | O(n*m) case matching | HIGH | 3-4 hours | ⚠️ SHOULD |
| 8 | Magic numbers scattered | MEDIUM | 30 min | ❌ NO |
| 9 | Emoji in logs | MEDIUM | 5 min | ❌ NO |
| 10 | Missing entity validation | MEDIUM | 2 hours | ❌ NO |
| 11 | Test coverage gaps | LOW | 4 hours | ❌ NO |
| 12 | README missing workflows | LOW | 30 min | ❌ NO |

**Total Fix Time**:
- **CRITICAL (required)**: 9-12 hours (or 1.5 hours if delete ELSER)
- **HIGH (recommended)**: 7 hours
- **MEDIUM+LOW (optional)**: 7 hours

---

## Recommended Merge Strategy

### Option A: Fix Critical Issues First (Ship Faster)

**Timeline**: 1-2 days

**Scope**:
1. ✅ Complete workflow steps 4-5 (2-3 hours)
2. ✅ Wire AD to workflow step (30 min)
3. ✅ Delete ELSER code, document as Phase 2 (1 hour)
   - Or commit to 6-8 hour full implementation

**Merge after**: Critical issues resolved

**Defer to follow-up PRs**:
- DRY cleanup (#4)
- Logger adapter (#5)
- Bulk error handling (#6)
- Case matching optimization (#7)

**Benefit**: Ships core value (stages 1-6 working), iterates on quality

---

### Option B: Ship Current State, Document Limitations (Pragmatic)

**Timeline**: Immediate merge

**Approach**:
1. Update README with clear warnings:
   ```markdown
   ## Current Limitations (Phase 1)

   **Workflow Execution**: Steps 1-3 fully functional. Steps 4-6 are scaffolds.
   **Recommended Path**: Use API routes (`/alert_investigation/_run`) until #XXXXX merged.
   **ELSER**: Deferred to Phase 2 (#16415) - Jaccard only for now.
   ```

2. Add feature flag guard:
   ```typescript
   // plugin.ts
   if (workflowsEnabled && workflowStepsComplete) {
     registerWorkflowSteps(...);
   } else {
     logger.warn('Workflow steps incomplete - API routes only');
   }
   ```

3. Create follow-up issues:
   - Issue #1: Complete workflow steps 4-6
   - Issue #2: Implement ELSER OR remove code
   - Issue #3-#12: Quality improvements

**Benefit**: Unblocks merge, sets clear expectations, routes work immediately

---

## Architectural Strengths (Keep These!)

Despite the gaps, the PR has excellent fundamentals:

✅ **Type Safety**: Zero `any` types, full Zod validation
✅ **Code Quality**: Zero lint/type suppressions, clean patterns
✅ **Testing**: 62 tests, 1,445 LOC, good coverage of happy paths
✅ **Architecture**: Clean separation (dedup, extraction, matching, AD)
✅ **Feature Flag**: Proper rollout control
✅ **Error Handling**: Structured error transforms, proper logging
✅ **Performance**: Reasonable defaults (500 alerts, 15 min)
✅ **Security**: Input validation (safe index patterns), authz checks
✅ **Dependencies**: Zero cross-team blockers

---

## Final Recommendation

**RECOMMENDED: Option A** (Fix Critical, Merge, Iterate)

**Why**:
- Critical issues are fixable in 1-2 days (not weeks)
- Routes work TODAY - users not blocked
- Workflow completion makes the "workflow-only" claim true
- Quality improvements can iterate post-merge

**Action Items**:
1. **Today**: Fix issues #1, #3 (2.5 hours) - make workflows functional
2. **Tomorrow**: Delete ELSER code + docs OR implement fully (1-8 hours)
3. **Merge**: When workflows pass E2E test
4. **Week 2**: Address HIGH severity issues (#4-#7)

**This gets you to a solid, shippable state while preserving quality bar.**

---

**Questions? Priority disagreements? Let's discuss before you start fixes!**
