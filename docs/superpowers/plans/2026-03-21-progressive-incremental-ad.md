# Progressive Incremental Attack Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable small-context models (8K-32K) for Attack Discovery by processing alerts progressively in rounds, maintaining bounded context while building comprehensive insights.

**Architecture:** Process alerts in rounds (50-100 per round), each round generates/refines insights using previous round's insights as context. Context stays bounded (new alerts + previous insights), enabling 8K models to handle unlimited total alerts.

**Tech Stack:** @kbn/inference, existing Attack Discovery prompts, Elasticsearch state tracking, TypeScript

**Related Spec:** [docs/superpowers/specs/2026-03-21-incremental-attack-discovery-design.md](../specs/2026-03-21-incremental-attack-discovery-design.md)

---

## File Structure

### Files to Create

**Core Implementation:**
```
x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/
└── progressive/
    ├── index.ts                          # Public API
    ├── progressive_processor.ts          # Round-based processing
    ├── insight_merger.ts                 # Merge strategies
    ├── state_tracker.ts                  # ES-backed processed alert tracking
    └── types.ts                          # TypeScript interfaces
```

**Tests:**
```
x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/
└── progressive/
    ├── progressive_processor.test.ts
    ├── insight_merger.test.ts
    └── state_tracker.test.ts
```

**API Route:**
```
x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/
└── progressive_generate.ts              # POST /api/attack_discovery/progressive/_generate
```

### Files to Modify

```
x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/
└── (reference existing prompt logic, don't modify initially)
```

---

## Phase 1: State Management

### Task 1: Create State Tracker Interface

**Files:**
- Create: `progressive/types.ts`
- Create: `progressive/state_tracker.test.ts`

- [ ] **Step 1: Write types for processed alert tracking**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProcessedAlertState {
  alertId: string;
  processedAt: string;
  roundNumber: number;
  insightIds: string[];
}

export interface ProgressiveADState {
  sessionId: string;
  totalAlertsProcessed: number;
  currentRound: number;
  lastProcessedAt: string;
  processedAlertIds: Set<string>;
}

export interface ProgressiveADConfig {
  alertsPerRound: number;  // Default: 50
  maxRounds: number;       // Default: 20
  mergeStrategy: 'rule-based' | 'semantic' | 'hybrid';
}

export interface RoundResult {
  roundNumber: number;
  alertsProcessed: number;
  insights: AttackDiscovery[];
  stats: {
    newInsights: number;
    mergedInsights: number;
    durationMs: number;
  };
}
```

Save to: `progressive/types.ts`

- [ ] **Step 2: Write failing test for state tracker**

```typescript
import { StateTracker } from './state_tracker';
import type { ElasticsearchClient } from '@kbn/core/server';

describe('StateTracker', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let tracker: StateTracker;

  beforeEach(() => {
    mockEsClient = {
      index: jest.fn(),
      search: jest.fn(),
    } as any;
    tracker = new StateTracker(mockEsClient, 'test-session');
  });

  it('should track processed alerts', async () => {
    await tracker.markProcessed(['alert-1', 'alert-2'], 1);

    const isProcessed = await tracker.isProcessed('alert-1');
    expect(isProcessed).toBe(true);
  });

  it('should filter unprocessed alerts', async () => {
    await tracker.markProcessed(['alert-1'], 1);

    const unprocessed = await tracker.filterUnprocessed([
      { id: 'alert-1' },
      { id: 'alert-2' },
      { id: 'alert-3' },
    ]);

    expect(unprocessed).toHaveLength(2);
    expect(unprocessed.map(a => a.id)).toEqual(['alert-2', 'alert-3']);
  });
});
```

Save to: `progressive/state_tracker.test.ts`

- [ ] **Step 3: Run test to verify it fails**

```bash
yarn test:jest progressive/state_tracker.test.ts
```

Expected: FAIL - "Cannot find module './state_tracker'"

- [ ] **Step 4: Implement StateTracker**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const INDEX_NAME = '.attack-discovery-state';

export class StateTracker {
  private processedIds = new Set<string>();

  constructor(
    private esClient: ElasticsearchClient,
    private sessionId: string
  ) {}

  async markProcessed(alertIds: string[], roundNumber: number): Promise<void> {
    const now = new Date().toISOString();

    // Store in ES for persistence
    await this.esClient.bulk({
      index: INDEX_NAME,
      operations: alertIds.flatMap(id => [
        { index: { _id: `${this.sessionId}:${id}` } },
        {
          sessionId: this.sessionId,
          alertId: id,
          processedAt: now,
          roundNumber,
        },
      ]),
    });

    // Update local cache
    alertIds.forEach(id => this.processedIds.add(id));
  }

  async isProcessed(alertId: string): Promise<boolean> {
    // Check local cache first
    if (this.processedIds.has(alertId)) {
      return true;
    }

    // Check ES
    try {
      await this.esClient.get({
        index: INDEX_NAME,
        id: `${this.sessionId}:${alertId}`,
      });
      this.processedIds.add(alertId);
      return true;
    } catch (e) {
      return false;
    }
  }

  async filterUnprocessed<T extends { id: string }>(alerts: T[]): Promise<T[]> {
    const unprocessed: T[] = [];

    for (const alert of alerts) {
      const processed = await this.isProcessed(alert.id);
      if (!processed) {
        unprocessed.push(alert);
      }
    }

    return unprocessed;
  }

  async getState(): Promise<ProgressiveADState> {
    const result = await this.esClient.search({
      index: INDEX_NAME,
      query: {
        term: { sessionId: this.sessionId },
      },
      size: 0,
      aggs: {
        maxRound: { max: { field: 'roundNumber' } },
        totalProcessed: { cardinality: { field: 'alertId' } },
        lastProcessed: { max: { field: 'processedAt' } },
      },
    });

    return {
      sessionId: this.sessionId,
      totalAlertsProcessed: result.aggregations?.totalProcessed.value ?? 0,
      currentRound: result.aggregations?.maxRound.value ?? 0,
      lastProcessedAt: result.aggregations?.lastProcessed.value_as_string ?? new Date().toISOString(),
      processedAlertIds: this.processedIds,
    };
  }
}
```

Save to: `progressive/state_tracker.ts`

- [ ] **Step 5: Run test to verify it passes**

```bash
yarn test:jest progressive/state_tracker.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add progressive/
git commit -m "feat(ad): add progressive state tracker

ES-backed tracking of processed alerts for incremental AD.
Maintains session state across rounds.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2: Insight Merger

### Task 2: Implement Rule-Based Insight Merger

**Files:**
- Create: `progressive/insight_merger.ts`
- Create: `progressive/insight_merger.test.ts`

- [ ] **Step 1: Write failing test for insight merger**

```typescript
import { mergeInsights } from './insight_merger';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

describe('mergeInsights', () => {
  it('should concatenate non-overlapping insights', () => {
    const existing: AttackDiscovery[] = [
      { title: 'SSH Attack', summaryMarkdown: 'SSH brute force', detailsMarkdown: 'Details', alertIds: ['1', '2'] },
    ];

    const newInsights: AttackDiscovery[] = [
      { title: 'Malware', summaryMarkdown: 'Malware detected', detailsMarkdown: 'Details', alertIds: ['3', '4'] },
    ];

    const result = mergeInsights(existing, newInsights, { strategy: 'rule-based' });

    expect(result).toHaveLength(2);
    expect(result[0].alertIds).toEqual(['1', '2']);
    expect(result[1].alertIds).toEqual(['3', '4']);
  });

  it('should merge insights with overlapping alert IDs', () => {
    const existing: AttackDiscovery[] = [
      { title: 'SSH Attack', summaryMarkdown: 'Initial', detailsMarkdown: 'Details', alertIds: ['1', '2'] },
    ];

    const newInsights: AttackDiscovery[] = [
      { title: 'SSH Brute Force', summaryMarkdown: 'Continued', detailsMarkdown: 'More details', alertIds: ['2', '3'] },
    ];

    const result = mergeInsights(existing, newInsights, { strategy: 'rule-based' });

    expect(result).toHaveLength(1);  // Merged into one
    expect(result[0].alertIds).toEqual(['1', '2', '3']);  // Combined
  });

  it('should deduplicate by title similarity', () => {
    const existing: AttackDiscovery[] = [
      { title: 'SSH Brute Force Attack', summaryMarkdown: 'Summary', detailsMarkdown: 'Details', alertIds: ['1'] },
    ];

    const newInsights: AttackDiscovery[] = [
      { title: 'SSH Brute Force', summaryMarkdown: 'Similar', detailsMarkdown: 'Details', alertIds: ['2'] },
    ];

    const result = mergeInsights(existing, newInsights, { strategy: 'rule-based', similarityThreshold: 0.8 });

    expect(result).toHaveLength(1);  // Deduplicated
    expect(result[0].alertIds).toEqual(['1', '2']);
  });
});
```

Save to: `progressive/insight_merger.test.ts`

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test:jest progressive/insight_merger.test.ts
```

Expected: FAIL - "Cannot find module"

- [ ] **Step 3: Implement insight merger**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

interface MergeOptions {
  strategy: 'rule-based' | 'semantic';
  similarityThreshold?: number;
}

/**
 * Merge new insights with existing insights
 * - Deduplicates similar attacks
 * - Combines overlapping alert IDs
 * - Maintains comprehensive coverage
 */
export function mergeInsights(
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  options: MergeOptions = { strategy: 'rule-based' }
): AttackDiscovery[] {
  if (options.strategy === 'rule-based') {
    return ruleBasedMerge(existing, newInsights, options.similarityThreshold ?? 0.8);
  }

  throw new Error(`Merge strategy ${options.strategy} not implemented`);
}

function ruleBasedMerge(
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  threshold: number
): AttackDiscovery[] {
  const merged: AttackDiscovery[] = [...existing];

  for (const newInsight of newInsights) {
    // Find existing insight that matches
    const matchIndex = merged.findIndex(existing => {
      // Check for alert ID overlap
      const alertOverlap = existing.alertIds.some(id => newInsight.alertIds.includes(id));
      if (alertOverlap) return true;

      // Check for title similarity (simple Jaccard)
      const titleSimilarity = calculateSimilarity(existing.title, newInsight.title);
      return titleSimilarity >= threshold;
    });

    if (matchIndex >= 0) {
      // Merge with existing
      const existing = merged[matchIndex];
      merged[matchIndex] = {
        ...existing,
        alertIds: Array.from(new Set([...existing.alertIds, ...newInsight.alertIds])),
        summaryMarkdown: `${existing.summaryMarkdown}\n\n${newInsight.summaryMarkdown}`,
        detailsMarkdown: `${existing.detailsMarkdown}\n\n${newInsight.detailsMarkdown}`,
      };
    } else {
      // Add as new insight
      merged.push(newInsight);
    }
  }

  return merged;
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;  // Jaccard similarity
}
```

Save to: `progressive/insight_merger.ts`

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn test:jest progressive/insight_merger.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add progressive/
git commit -m "feat(ad): add rule-based insight merger

Merges new insights with existing:
- Deduplicates by alert ID overlap
- Deduplicates by title similarity (Jaccard)
- Combines alert IDs and descriptions

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3: Progressive Processor

### Task 3: Implement Progressive Round-Based Processor

**Files:**
- Create: `progressive/progressive_processor.ts`
- Create: `progressive/progressive_processor.test.ts`

- [ ] **Step 1: Write types and interface**

Add to `progressive/types.ts`:

```typescript
export interface ProgressiveProcessorParams {
  alerts: Array<{ id: string; content: string }>;
  config: ProgressiveADConfig;
  llm: ActionsClientLlm;
  stateTracker: StateTracker;
  existingInsights?: AttackDiscovery[];
}

export interface ProgressiveProcessorResult {
  insights: AttackDiscovery[];
  rounds: RoundResult[];
  stats: {
    totalRounds: number;
    totalAlertsProcessed: number;
    totalInsights: number;
    durationMs: number;
  };
}
```

- [ ] **Step 2: Write failing test**

```typescript
import { processProgressive } from './progressive_processor';

describe('processProgressive', () => {
  it('should process alerts in rounds', async () => {
    const alerts = Array.from({ length: 150 }, (_, i) => ({
      id: `alert-${i}`,
      content: `Alert ${i}`,
    }));

    const mockLLM = {
      generateInsights: jest.fn(async (alerts) => [
        { title: 'Attack', summaryMarkdown: 'Summary', detailsMarkdown: 'Details', alertIds: alerts.map(a => a.id) },
      ]),
    };

    const mockTracker = {
      filterUnprocessed: jest.fn(async (alerts) => alerts),
      markProcessed: jest.fn(),
      getState: jest.fn(async () => ({ currentRound: 0 })),
    };

    const result = await processProgressive({
      alerts,
      config: { alertsPerRound: 50, maxRounds: 10, mergeStrategy: 'rule-based' },
      llm: mockLLM as any,
      stateTracker: mockTracker as any,
    });

    expect(result.rounds).toHaveLength(3);  // 150 alerts / 50 per round = 3 rounds
    expect(mockLLM.generateInsights).toHaveBeenCalledTimes(3);
    expect(result.insights.length).toBeGreaterThan(0);
  });
});
```

Save to: `progressive/progressive_processor.test.ts`

- [ ] **Step 3: Run test to verify it fails**

```bash
yarn test:jest progressive/progressive_processor.test.ts
```

Expected: FAIL - "Cannot find module"

- [ ] **Step 4: Implement progressive processor**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { mergeInsights } from './insight_merger';
import type {
  ProgressiveProcessorParams,
  ProgressiveProcessorResult,
  RoundResult,
} from './types';

export async function processProgressive({
  alerts,
  config,
  llm,
  stateTracker,
  existingInsights = [],
}: ProgressiveProcessorParams): Promise<ProgressiveProcessorResult> {
  const startTime = Date.now();
  const rounds: RoundResult[] = [];
  let currentInsights = existingInsights;

  // Filter to unprocessed alerts
  const unprocessed = await stateTracker.filterUnprocessed(alerts);

  if (unprocessed.length === 0) {
    return {
      insights: currentInsights,
      rounds: [],
      stats: {
        totalRounds: 0,
        totalAlertsProcessed: 0,
        totalInsights: currentInsights.length,
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Process in rounds
  const alertsPerRound = config.alertsPerRound;
  let roundNumber = (await stateTracker.getState()).currentRound + 1;

  for (let i = 0; i < unprocessed.length && rounds.length < config.maxRounds; i += alertsPerRound) {
    const roundStartTime = Date.now();
    const roundAlerts = unprocessed.slice(i, i + alertsPerRound);

    // Generate insights for this round
    // Context: round alerts + previous insights
    const newInsights = await llm.generateInsights(roundAlerts, currentInsights);

    // Merge with previous insights
    const beforeMergeCount = currentInsights.length;
    currentInsights = mergeInsights(currentInsights, newInsights, {
      strategy: config.mergeStrategy,
    });

    // Track processed alerts
    await stateTracker.markProcessed(
      roundAlerts.map(a => a.id),
      roundNumber
    );

    rounds.push({
      roundNumber,
      alertsProcessed: roundAlerts.length,
      insights: newInsights,
      stats: {
        newInsights: newInsights.length,
        mergedInsights: currentInsights.length - beforeMergeCount,
        durationMs: Date.now() - roundStartTime,
      },
    });

    roundNumber++;
  }

  return {
    insights: currentInsights,
    rounds,
    stats: {
      totalRounds: rounds.length,
      totalAlertsProcessed: rounds.reduce((sum, r) => sum + r.alertsProcessed, 0),
      totalInsights: currentInsights.length,
      durationMs: Date.now() - startTime,
    },
  };
}
```

Save to: `progressive/progressive_processor.ts`

- [ ] **Step 5: Run test to verify it passes**

```bash
yarn test:jest progressive/progressive_processor.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add progressive/
git commit -m "feat(ad): add progressive round-based processor

Processes alerts in rounds (default: 50 per round):
- Each round: new alerts + previous insights
- Context stays bounded (4-6K tokens)
- Enables 8K models to handle unlimited alerts

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4: Integration with Attack Discovery

### Task 4: Create Public API

**Files:**
- Create: `progressive/index.ts`

- [ ] **Step 1: Write public API exports**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { processProgressive } from './progressive_processor';
export { StateTracker } from './state_tracker';
export { mergeInsights } from './insight_merger';
export type {
  ProgressiveADConfig,
  ProgressiveADState,
  ProgressiveProcessorParams,
  ProgressiveProcessorResult,
  RoundResult,
  ProcessedAlertState,
} from './types';
```

Save to: `progressive/index.ts`

- [ ] **Step 2: Verify TypeScript compiles**

```bash
yarn tsc --noEmit -p x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json
```

Expected: No errors

- [ ] **Step 3: Run all progressive tests**

```bash
yarn test:jest progressive/
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add progressive/
git commit -m "feat(ad): add progressive AD public API

Exports:
- processProgressive (main entry point)
- StateTracker (alert tracking)
- mergeInsights (merge strategies)
- Types

Progressive AD implementation complete.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5: Validation with Small-Context Models

### Task 5: Test with Qwen 2.5 7B (32K Context)

**Files:**
- None (validation task)

- [ ] **Step 1: Create test dataset (200 alerts)**

```bash
# Use existing 100-alert dataset + duplicate it
cat x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/data/eval_dataset_large_scale.jsonl \
x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/data/eval_dataset_large_scale.jsonl \
> /tmp/ad_200_alerts.jsonl
```

- [ ] **Step 2: Run progressive AD with Qwen (4 rounds of 50)**

```bash
cd ~/Projects/kibana
export ATTACK_DISCOVERY_PROGRESSIVE=true
export ATTACK_DISCOVERY_ALERTS_PER_ROUND=50
export ATTACK_DISCOVERY_DATASET_JSONL_PATH=/tmp/ad_200_alerts.jsonl

node scripts/evals run --suite attack-discovery --model ollama-qwen25-7b
```

Expected:
- Round 1: 50 alerts processed
- Round 2: 50 alerts + round 1 insights
- Round 3: 50 alerts + round 2 insights
- Round 4: 50 alerts + round 3 insights
- All rounds succeed (no tool calling failures)

- [ ] **Step 3: Compare vs batch processing**

Metrics to collect:
- Latency: Progressive vs batched
- Tokens: Progressive vs batched
- Success rate: Progressive (should be 100%) vs batched (20-80%)
- Quality: Insights coherence

Expected: Progressive wins on all metrics

- [ ] **Step 4: Document results**

Create: `docs/progressive-ad-validation.md` with comparison data

---

## Verification Checklist

Before declaring complete:

- [ ] **All tests pass**

```bash
yarn test:jest progressive/
```

- [ ] **TypeScript compiles**

```bash
yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json
```

- [ ] **Lint passes**

```bash
node scripts/eslint --fix progressive/
```

- [ ] **Works with 8K model**

Test with smallest context model (if available)

- [ ] **Bounded context verified**

Check logs: Each round stays under context limit

- [ ] **Quality maintained**

Insights are coherent (not fragmented like batch processing)

---

## Success Criteria

Progressive Incremental AD is complete when:

✅ Processes 200+ alerts in rounds (50 per round)
✅ Context stays bounded (<8K tokens per round)
✅ Works with Qwen 2.5 7B (32K context)
✅ 100% success rate (no tool calling failures)
✅ Quality maintained (coherent insights)
✅ Faster than batch processing (fewer API calls)
✅ Same token cost as baseline (no prompt repetition)

---

## Expected Benefits vs Batch Processing

| Metric | Batch Processing | Progressive Incremental | Winner |
|--------|------------------|------------------------|--------|
| **Context size** | 10 alerts (~800 tokens) | 50 alerts + insights (~6K tokens) | Progressive (more context) |
| **8K compatible?** | ❌ Tool calling fails | ✅ Yes | Progressive |
| **Token cost** | 4.5x more | ✅ Same as baseline | Progressive |
| **OSS reliability** | 20-80% | ✅ 100% | Progressive |
| **Quality** | ⚠️ Fragmented | ✅ Coherent | Progressive |
| **Speed** | 36% faster (if tuned) | ✅ Same or faster | Tie/Progressive |

**Progressive Incremental should win on ALL metrics.**
