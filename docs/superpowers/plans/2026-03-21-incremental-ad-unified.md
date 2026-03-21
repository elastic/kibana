# Incremental Attack Discovery (Unified) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable small-context models (8K-32K) for Attack Discovery through incremental processing - two modes (delta + progressive) sharing core infrastructure.

**Architecture:** Delta mode processes only NEW alerts since last run; Progressive mode processes large datasets in bounded rounds. Both maintain bounded context (<8K tokens per call) enabling small models.

**Tech Stack:** TypeScript, @kbn/inference, Elasticsearch (state tracking), existing Attack Discovery prompts

**Related Spec:** [docs/superpowers/specs/2026-03-21-incremental-ad-unified.md](../specs/2026-03-21-incremental-ad-unified.md)

---

## File Structure

### Files to Create

**Core Package:**
```
x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/
└── incremental/
    ├── index.ts                    # Public API (both modes)
    ├── types.ts                    # Shared types
    ├── state_tracker.ts            # ES-backed processed alert tracking
    ├── delta_computer.ts           # Compute NEW alerts since last run
    ├── insight_merger.ts           # Merge strategies (rule-based + semantic)
    ├── round_processor.ts          # Process alerts in rounds with bounded context
    └── __tests__/
        ├── state_tracker.test.ts
        ├── delta_computer.test.ts
        ├── insight_merger.test.ts
        └── round_processor.test.ts
```

---

## Phase 1: Core Infrastructure (Shared by Both Modes)

### Task 1: Create Types and Interfaces

**Files:**
- Create: `incremental/types.ts`

- [ ] **Step 1: Write complete type definitions**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

export type IncrementalMode = 'delta' | 'progressive';
export type MergeStrategy = 'rule-based' | 'semantic' | 'hybrid';

export interface IncrementalADConfig {
  mode: IncrementalMode;
  alertsPerRound: number;          // Default: 50
  maxRounds: number;               // Default: 20
  mergeStrategy: MergeStrategy;    // Default: 'rule-based'
  similarityThreshold: number;     // Default: 0.8
}

export interface ProcessedAlertRecord {
  alertId: string;
  sessionId: string;
  processedAt: string;
  roundNumber: number;
}

export interface IncrementalADState {
  sessionId: string;
  mode: IncrementalMode;
  totalAlertsProcessed: number;
  lastProcessedAt: string;
  currentRound: number;
}

export interface RoundResult {
  roundNumber: number;
  alertsProcessed: string[];
  insightsGenerated: number;
  insightsMerged: number;
  durationMs: number;
}

export interface IncrementalADResult {
  insights: AttackDiscovery[];
  rounds: RoundResult[];
  stats: {
    mode: IncrementalMode;
    totalRounds: number;
    totalAlertsProcessed: number;
    deltaSize?: number;  // Only for delta mode
    durationMs: number;
  };
}

export interface Alert {
  id: string;
  content: string;
  timestamp: string;
}
```

Save to: `incremental/types.ts`

- [ ] **Step 2: Verify types compile**

```bash
yarn tsc --noEmit -p x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add incremental/types.ts
git commit -m "feat(ad): add incremental AD type definitions

Defines interfaces for both delta and progressive modes.
Shared types enable code reuse across modes.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Implement State Tracker (ES-Backed)

**Files:**
- Create: `incremental/state_tracker.ts`
- Create: `incremental/__tests__/state_tracker.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { StateTracker } from '../state_tracker';

describe('StateTracker', () => {
  const mockEsClient = {
    bulk: jest.fn(async () => ({ errors: false })),
    get: jest.fn(),
    search: jest.fn(),
  };

  it('should mark alerts as processed', async () => {
    const tracker = new StateTracker(mockEsClient as any, 'test-session');

    await tracker.markProcessed(['alert-1', 'alert-2'], 1);

    expect(mockEsClient.bulk).toHaveBeenCalled();
  });

  it('should identify processed alerts', async () => {
    mockEsClient.get.mockResolvedValueOnce({ found: true });

    const tracker = new StateTracker(mockEsClient as any, 'test-session');
    const isProcessed = await tracker.isProcessed('alert-1');

    expect(isProcessed).toBe(true);
  });

  it('should filter unprocessed alerts', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { alertId: 'alert-1' } }] },
    });

    const tracker = new StateTracker(mockEsClient as any, 'test-session');
    const alerts = [{ id: 'alert-1' }, { id: 'alert-2' }];

    const unprocessed = await tracker.filterUnprocessed(alerts);

    expect(unprocessed).toHaveLength(1);
    expect(unprocessed[0].id).toBe('alert-2');
  });
});
```

Save to: `incremental/__tests__/state_tracker.test.ts`

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test:jest incremental/__tests__/state_tracker.test.ts
```

Expected: FAIL - Module not found

- [ ] **Step 3: Implement StateTracker**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProcessedAlertRecord, IncrementalADState } from './types';

const INDEX_NAME = '.attack-discovery-incremental-state';

export class StateTracker {
  private cache = new Map<string, boolean>();

  constructor(
    private esClient: ElasticsearchClient,
    private sessionId: string
  ) {}

  async markProcessed(alertIds: string[], roundNumber: number): Promise<void> {
    const now = new Date().toISOString();

    const operations = alertIds.flatMap(alertId => [
      { index: { _id: `${this.sessionId}:${alertId}` } },
      {
        alertId,
        sessionId: this.sessionId,
        processedAt: now,
        roundNumber,
      } satisfies ProcessedAlertRecord,
    ]);

    await this.esClient.bulk({
      index: INDEX_NAME,
      operations,
      refresh: 'wait_for',
    });

    // Update cache
    alertIds.forEach(id => this.cache.set(id, true));
  }

  async isProcessed(alertId: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(alertId)) {
      return this.cache.get(alertId)!;
    }

    // Check ES
    try {
      const result = await this.esClient.get({
        index: INDEX_NAME,
        id: `${this.sessionId}:${alertId}`,
      });
      const found = result.found;
      this.cache.set(alertId, found);
      return found;
    } catch (e) {
      this.cache.set(alertId, false);
      return false;
    }
  }

  async filterUnprocessed<T extends { id: string }>(alerts: T[]): Promise<T[]> {
    // Batch check in ES for efficiency
    const alertIds = alerts.map(a => a.id);

    const result = await this.esClient.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: [
            { term: { sessionId: this.sessionId } },
            { terms: { alertId: alertIds } },
          ],
        },
      },
      _source: ['alertId'],
      size: alertIds.length,
    });

    const processedIds = new Set(
      result.hits.hits.map(hit => (hit._source as any).alertId)
    );

    // Update cache
    processedIds.forEach(id => this.cache.set(id, true));

    return alerts.filter(alert => !processedIds.has(alert.id));
  }

  async getState(): Promise<IncrementalADState> {
    const result = await this.esClient.search({
      index: INDEX_NAME,
      query: { term: { sessionId: this.sessionId } },
      size: 0,
      aggs: {
        totalProcessed: { cardinality: { field: 'alertId' } },
        maxRound: { max: { field: 'roundNumber' } },
        lastProcessed: { max: { field: 'processedAt' } },
      },
    });

    const aggs = result.aggregations as any;

    return {
      sessionId: this.sessionId,
      mode: 'delta',  // Will be set by caller
      totalAlertsProcessed: aggs?.totalProcessed?.value ?? 0,
      currentRound: aggs?.maxRound?.value ?? 0,
      lastProcessedAt: aggs?.lastProcessed?.value_as_string ?? new Date().toISOString(),
    };
  }
}
```

Save to: `incremental/state_tracker.ts`

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn test:jest incremental/__tests__/state_tracker.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add incremental/
git commit -m "feat(ad): add ES-backed state tracker for incremental AD

Tracks which alerts have been processed across runs:
- Persistent storage in Elasticsearch
- Local cache for performance
- Batch filtering for efficiency

Shared by both delta and progressive modes.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Implement Delta Computer (for Delta Mode)

**Files:**
- Create: `incremental/delta_computer.ts`
- Create: `incremental/__tests__/delta_computer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { computeDelta } from '../delta_computer';
import type { StateTracker } from '../state_tracker';

describe('computeDelta', () => {
  it('should return only unprocessed alerts', async () => {
    const mockTracker = {
      filterUnprocessed: jest.fn(async alerts =>
        alerts.filter(a => a.id !== 'alert-1')  // alert-1 already processed
      ),
    } as any;

    const alerts = [
      { id: 'alert-1', content: 'Alert 1' },
      { id: 'alert-2', content: 'Alert 2' },
      { id: 'alert-3', content: 'Alert 3' },
    ];

    const delta = await computeDelta(alerts, mockTracker);

    expect(delta).toHaveLength(2);
    expect(delta.map(a => a.id)).toEqual(['alert-2', 'alert-3']);
  });

  it('should return empty if all processed', async () => {
    const mockTracker = {
      filterUnprocessed: jest.fn(async () => []),
    } as any;

    const delta = await computeDelta([{ id: 'alert-1' }], mockTracker);

    expect(delta).toEqual([]);
  });
});
```

Save to: `incremental/__tests__/delta_computer.test.ts`

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test:jest incremental/__tests__/delta_computer.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement delta computer**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateTracker } from './state_tracker';
import type { Alert } from './types';

/**
 * Compute delta (NEW alerts) since last run
 *
 * @param alerts - All current alerts
 * @param stateTracker - State tracker with processed alert history
 * @returns Only unprocessed (new) alerts
 */
export async function computeDelta(
  alerts: Alert[],
  stateTracker: StateTracker
): Promise<Alert[]> {
  return await stateTracker.filterUnprocessed(alerts);
}
```

Save to: `incremental/delta_computer.ts`

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn test:jest incremental/__tests__/delta_computer.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add incremental/
git commit -m "feat(ad): add delta computer for incremental mode

Computes NEW alerts since last run by filtering out processed.
Core component for continuous monitoring mode.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Implement Insight Merger (Rule-Based)

**Files:**
- Create: `incremental/insight_merger.ts`
- Create: `incremental/__tests__/insight_merger.test.ts`

- [ ] **Step 1: Write comprehensive tests**

```typescript
import { mergeInsights } from '../insight_merger';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

describe('mergeInsights', () => {
  const existing: AttackDiscovery[] = [
    {
      title: 'SSH Brute Force',
      summaryMarkdown: 'SSH attack from 1.2.3.4',
      detailsMarkdown: 'Multiple failed attempts',
      alertIds: ['alert-1', 'alert-2'],
    },
  ];

  const newInsights: AttackDiscovery[] = [
    {
      title: 'PowerShell Execution',
      summaryMarkdown: 'Malicious PowerShell',
      detailsMarkdown: 'Encoded commands',
      alertIds: ['alert-3', 'alert-4'],
    },
  ];

  it('should concatenate non-overlapping insights', () => {
    const result = mergeInsights(existing, newInsights, { strategy: 'rule-based' });

    expect(result).toHaveLength(2);
  });

  it('should merge insights with alert ID overlap', () => {
    const overlapping: AttackDiscovery[] = [
      {
        title: 'SSH Brute Force Continued',
        summaryMarkdown: 'Attack continues',
        detailsMarkdown: 'More attempts',
        alertIds: ['alert-2', 'alert-5'],  // alert-2 overlaps!
      },
    ];

    const result = mergeInsights(existing, overlapping, { strategy: 'rule-based' });

    expect(result).toHaveLength(1);  // Merged
    expect(result[0].alertIds).toEqual(['alert-1', 'alert-2', 'alert-5']);
  });

  it('should merge insights with title similarity', () => {
    const similar: AttackDiscovery[] = [
      {
        title: 'SSH Brute Force Attack',  // Similar to "SSH Brute Force"
        summaryMarkdown: 'Related attack',
        detailsMarkdown: 'Details',
        alertIds: ['alert-10'],
      },
    ];

    const result = mergeInsights(existing, similar, {
      strategy: 'rule-based',
      similarityThreshold: 0.7,
    });

    expect(result).toHaveLength(1);  // Merged by title similarity
  });
});
```

Save to: `incremental/__tests__/insight_merger.test.ts`

- [ ] **Step 2: Run test to verify it fails**

```bash
yarn test:jest incremental/__tests__/insight_merger.test.ts
```

Expected: FAIL

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

export function mergeInsights(
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  options: MergeOptions = { strategy: 'rule-based', similarityThreshold: 0.8 }
): AttackDiscovery[] {
  if (options.strategy !== 'rule-based') {
    throw new Error('Only rule-based merge implemented');
  }

  const merged = [...existing];
  const threshold = options.similarityThreshold ?? 0.8;

  for (const newInsight of newInsights) {
    const matchIndex = merged.findIndex(existingInsight => {
      // Check 1: Alert ID overlap
      const hasOverlap = existingInsight.alertIds.some(id =>
        newInsight.alertIds.includes(id)
      );
      if (hasOverlap) return true;

      // Check 2: Title similarity (Jaccard)
      const similarity = calculateTitleSimilarity(existingInsight.title, newInsight.title);
      return similarity >= threshold;
    });

    if (matchIndex >= 0) {
      // Merge with existing insight
      const existing = merged[matchIndex];
      merged[matchIndex] = {
        ...existing,
        // Combine alert IDs (deduplicated)
        alertIds: Array.from(new Set([...existing.alertIds, ...newInsight.alertIds])),
        // Append summaries
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

function calculateTitleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
```

Save to: `incremental/insight_merger.ts`

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn test:jest incremental/__tests__/insight_merger.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add incremental/
git commit -m "feat(ad): add rule-based insight merger

Merges new insights with existing:
- Deduplicates by alert ID overlap
- Deduplicates by title similarity (Jaccard)
- Combines summaries and alert lists

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2: Round Processor (Core of Both Modes)

### Task 5: Implement Round-Based Processor

**Files:**
- Create: `incremental/round_processor.ts`
- Create: `incremental/__tests__/round_processor.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { processInRounds } from '../round_processor';

describe('processInRounds', () => {
  it('should process alerts in rounds', async () => {
    const alerts = Array.from({ length: 150 }, (_, i) => ({
      id: `alert-${i}`,
      content: `Alert ${i}`,
    }));

    const mockLLM = jest.fn(async (alertBatch) => [
      {
        title: 'Attack',
        summaryMarkdown: `Found in ${alertBatch.length} alerts`,
        detailsMarkdown: 'Details',
        alertIds: alertBatch.map((a: any) => a.id),
      },
    ]);

    const result = await processInRounds({
      alerts,
      alertsPerRound: 50,
      maxRounds: 10,
      generateInsights: mockLLM,
      existingInsights: [],
    });

    expect(result.rounds).toHaveLength(3);  // 150/50 = 3 rounds
    expect(mockLLM).toHaveBeenCalledTimes(3);
  });
});
```

Save to: `incremental/__tests__/round_processor.test.ts`

- [ ] **Step 2: Implement round processor**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { mergeInsights } from './insight_merger';
import type { Alert, RoundResult } from './types';

interface ProcessInRoundsParams {
  alerts: Alert[];
  alertsPerRound: number;
  maxRounds: number;
  generateInsights: (alerts: Alert[], previousInsights?: AttackDiscovery[]) => Promise<AttackDiscovery[]>;
  existingInsights: AttackDiscovery[];
  mergeStrategy?: 'rule-based';
}

export async function processInRounds({
  alerts,
  alertsPerRound,
  maxRounds,
  generateInsights,
  existingInsights,
  mergeStrategy = 'rule-based',
}: ProcessInRoundsParams): Promise<{ rounds: RoundResult[]; insights: AttackDiscovery[] }> {
  const rounds: RoundResult[] = [];
  let currentInsights = existingInsights;

  for (let i = 0; i < alerts.length && rounds.length < maxRounds; i += alertsPerRound) {
    const roundStartTime = Date.now();
    const roundAlerts = alerts.slice(i, i + alertsPerRound);
    const roundNumber = rounds.length + 1;

    // Generate insights for this round (with context from previous rounds)
    const newInsights = await generateInsights(roundAlerts, currentInsights);

    // Merge with previous insights
    const beforeCount = currentInsights.length;
    currentInsights = mergeInsights(currentInsights, newInsights, { strategy: mergeStrategy });

    rounds.push({
      roundNumber,
      alertsProcessed: roundAlerts.map(a => a.id),
      insightsGenerated: newInsights.length,
      insightsMerged: currentInsights.length - beforeCount,
      durationMs: Date.now() - roundStartTime,
    });
  }

  return {
    rounds,
    insights: currentInsights,
  };
}
```

Save to: `incremental/round_processor.ts`

- [ ] **Step 3: Run tests**

```bash
yarn test:jest incremental/__tests__/round_processor.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add incremental/
git commit -m "feat(ad): add round-based processor

Processes alerts in bounded rounds:
- Each round: N alerts + previous insights as context
- Progressive refinement (insights build on previous)
- Bounded context per round (~6K tokens)

Core component for both delta and progressive modes.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3: Unified API (Both Modes)

### Task 6: Create Main Entry Point

**Files:**
- Create: `incremental/index.ts`

- [ ] **Step 1: Implement unified API**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { StateTracker } from './state_tracker';
import { computeDelta } from './delta_computer';
import { processInRounds } from './round_processor';
import type { IncrementalADConfig, IncrementalADResult, Alert } from './types';

export async function incrementalAttackDiscovery({
  mode,
  alerts,
  existingInsights = [],
  config,
  esClient,
  sessionId,
  generateInsights,
}: {
  mode: 'delta' | 'progressive';
  alerts: Alert[];
  existingInsights?: AttackDiscovery[];
  config: Partial<IncrementalADConfig>;
  esClient: ElasticsearchClient;
  sessionId: string;
  generateInsights: (alerts: Alert[], previousInsights?: AttackDiscovery[]) => Promise<AttackDiscovery[]>;
}): Promise<IncrementalADResult> {
  const startTime = Date.now();

  const fullConfig: IncrementalADConfig = {
    mode,
    alertsPerRound: config.alertsPerRound ?? 50,
    maxRounds: config.maxRounds ?? 20,
    mergeStrategy: config.mergeStrategy ?? 'rule-based',
    similarityThreshold: config.similarityThreshold ?? 0.8,
  };

  const stateTracker = new StateTracker(esClient, sessionId);

  // DELTA MODE: Filter to new alerts first
  let alertsToProcess = alerts;
  let deltaSize: number | undefined;

  if (mode === 'delta') {
    alertsToProcess = await computeDelta(alerts, stateTracker);
    deltaSize = alertsToProcess.length;

    if (alertsToProcess.length === 0) {
      // No new alerts - return existing insights
      return {
        insights: existingInsights,
        rounds: [],
        stats: {
          mode: 'delta',
          totalRounds: 0,
          totalAlertsProcessed: 0,
          deltaSize: 0,
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  // BOTH MODES: Process in rounds if needed
  let result;

  if (alertsToProcess.length > fullConfig.alertsPerRound) {
    // Multiple rounds needed
    result = await processInRounds({
      alerts: alertsToProcess,
      alertsPerRound: fullConfig.alertsPerRound,
      maxRounds: fullConfig.maxRounds,
      generateInsights,
      existingInsights,
      mergeStrategy: fullConfig.mergeStrategy,
    });

    // Mark all as processed
    await stateTracker.markProcessed(
      result.rounds.flatMap(r => r.alertsProcessed),
      result.rounds.length
    );
  } else {
    // Single round (delta is small OR progressive with <50 alerts)
    const insights = await generateInsights(alertsToProcess, existingInsights);

    await stateTracker.markProcessed(
      alertsToProcess.map(a => a.id),
      1
    );

    result = {
      rounds: [{
        roundNumber: 1,
        alertsProcessed: alertsToProcess.map(a => a.id),
        insightsGenerated: insights.length,
        insightsMerged: 0,
        durationMs: Date.now() - startTime,
      }],
      insights,
    };
  }

  return {
    insights: result.insights,
    rounds: result.rounds,
    stats: {
      mode,
      totalRounds: result.rounds.length,
      totalAlertsProcessed: result.rounds.reduce((sum, r) => r.alertsProcessed.length, 0),
      deltaSize,
      durationMs: Date.now() - startTime,
    },
  };
}

// Re-export components
export { StateTracker } from './state_tracker';
export { computeDelta } from './delta_computer';
export { mergeInsights } from './insight_merger';
export { processInRounds } from './round_processor';
export type * from './types';
```

Save to: `incremental/index.ts`

- [ ] **Step 2: Verify all tests pass**

```bash
yarn test:jest incremental/
```

Expected: All tests pass

- [ ] **Step 3: Verify TypeScript compiles**

```bash
yarn tsc --noEmit -p x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add incremental/
git commit -m "feat(ad): add unified incremental AD API (delta + progressive)

Main entry point supporting both modes:
- Delta: Process only NEW alerts since last run
- Progressive: Process large datasets in rounds

Both modes:
- Bounded context (<8K tokens per call)
- 100% OSS compatible (single-pass per round)
- Efficient (no wasted reprocessing)

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4: Validation

### Task 7: Test with Qwen 2.5 7B (Delta Mode)

**Files:**
- None (validation task)

- [ ] **Step 1: Simulate delta scenario**

```bash
# Day 1: Process 100 alerts
# Day 2: Add 50 new alerts, process delta only
# Measure: context size, tokens, success rate
```

Expected:
- Delta size: 50 alerts
- Context per call: ~4K tokens ✅ (fits in 8K)
- Success rate: 100% ✅
- Insights: Coherently merged

- [ ] **Step 2: Compare vs full reprocess**

| Approach | Alerts Processed | Token Cost | Context Size |
|----------|------------------|------------|--------------|
| Full reprocess | 150 | ~12K | ~12K (overflows 8K!) |
| Delta (incremental) | 50 | ~4K | ~4K (fits!) |

Expected: Incremental wins

---

### Task 8: Test Progressive Mode with 200 Alerts

**Files:**
- None (validation task)

- [ ] **Step 1: Run progressive with 200 alerts**

```bash
# Single run: 200 alerts
# Process in 4 rounds of 50
# Verify bounded context
```

Expected:
- Round 1: 50 alerts (~4K tokens)
- Round 2: 50 alerts + R1 insights (~5K tokens)
- Round 3: 50 alerts + R2 insights (~6K tokens)
- Round 4: 50 alerts + R3 insights (~7K tokens)
- All rounds ✅ fit in 8K

- [ ] **Step 2: Compare vs batch processing**

| Approach | Latency | Tokens | Success Rate | Quality |
|----------|---------|--------|--------------|---------|
| Batch (from validation) | 52s | 27K | 20-80% | Fragmented |
| Progressive (incremental) | ? | ~6K | 100% | Coherent |

Expected: Progressive wins

---

## Verification Checklist

- [ ] **Tests pass**

```bash
yarn test:jest incremental/
```

- [ ] **TypeScript compiles**

```bash
yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json
```

- [ ] **Works with Qwen 2.5 7B** (32K context)

Delta mode: Process 50-100 new alerts
Progressive mode: Process 200 alerts in 4 rounds

- [ ] **Bounded context verified**

Check logs: Every call stays <8K tokens

- [ ] **Quality maintained**

Insights are coherent, not fragmented

---

## Success Criteria

✅ Delta mode processes only new alerts (not reprocessing old)
✅ Progressive mode handles 200+ alerts in bounded rounds
✅ Context stays <8K tokens per call (enables small models)
✅ 100% success rate with Qwen 2.5 7B (no tool calling failures)
✅ Token cost same as baseline (no prompt repetition overhead)
✅ Quality maintained (coherent narrative, not fragments)
✅ Faster than batch processing (fewer API calls, no parallel overhead)

**This achieves your goal: Small-context model support for Attack Discovery.**
