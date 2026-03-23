# Incremental AD — Real LLM Validation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the critical integration bug where rounds re-query ES instead of using round-specific alerts, then validate incremental AD with real LLM calls via the `@kbn/evals` framework.

**Architecture:** Two tracks — (1) fix the production integration so each round passes its specific alert subset to the graph (leveraging the existing bypass in the entry edge), (2) add `incrementalProgressive` mode to `kbn-evals-suite-attack-discovery` that exercises round processing with real LLM token/latency/quality measurement.

**Tech Stack:** TypeScript, LangGraph state bypass, `@kbn/evals` (Playwright + `KibanaEvalsClient`), `@kbn/inference-common`, `@kbn/elastic-assistant-common`

---

## File Structure

### Track 1: Production Integration Fix

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_attack_discovery_graph/index.tsx` | Accept optional pre-fetched `anonymizedDocuments` and pass to graph initial state |
| Modify | `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_incremental_attack_discovery.ts` | Fetch + anonymize alerts once upfront, split by round, pass anonymized subset per round |
| Reference | `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/helpers/get_anonymized_alerts/index.ts` | Reuse `getAnonymizedAlerts` for one-shot fetch + anonymize |
| Reference | `x-pack/solutions/security/plugins/elastic_assistant/server/lib/langchain/output_chunking/edges/retrieve_anonymized_docs_or_generate/get_retrieve_or_generate/index.ts` | Entry edge bypass: `anonymizedDocuments.length > 0 → skip retriever` |

### Track 2: Eval Suite — Incremental Mode

| Action | File | Responsibility |
|--------|------|---------------|
| Copy from `evals-attack-discovery` | `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/` (entire package) | AD eval suite with fixtures, evaluators, task runner |
| Modify | `.../src/task/run_attack_discovery.ts` | Add `incrementalProgressive` mode with round processing |
| Create | `.../src/task/incremental_runner.ts` | Round processor + insight merger for eval context (no ES dependency) |
| Modify | `.../src/types.ts` | Add `IncrementalProgressiveInput` variant to `AttackDiscoveryTaskInput` |
| Create | `.../src/evaluators/context_budget_evaluator.ts` | Validate per-round tokens < budget threshold |
| Create | `.../src/evaluators/round_efficiency_evaluator.ts` | Validate all rounds executed, alert coverage |
| Modify | `.../src/evaluate_dataset.ts` | Wire new evaluators for incremental mode |
| Create | `.../evals/attack_discovery/incremental.spec.ts` | Eval scenarios: progressive 200 alerts, context budget |
| Create | `.../data/eval_dataset_incremental.jsonl` | Bundled alerts dataset (200 alerts) for incremental eval |

---

## Task 1: Fix `invokeAttackDiscoveryGraph` to Accept Pre-Fetched Alerts

The graph's entry edge already skips the retriever node when `anonymizedDocuments` is non-empty. We just need to expose this bypass through the function signature.

**Files:**
- Modify: `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_attack_discovery_graph/index.tsx`

- [ ] **Step 1: Add `anonymizedDocuments` optional parameter**

In `invoke_attack_discovery_graph/index.tsx`, add to the function params and pass to `graph.invoke()`:

```typescript
// Add to the destructured params (after line 62: size: number):
anonymizedDocuments?: Document[];

// Change graph.invoke call (around line 128):
// FROM:
const result: AttackDiscoveryGraphState = await graph.invoke(
  {},
// TO:
const result: AttackDiscoveryGraphState = await graph.invoke(
  anonymizedDocuments?.length ? { anonymizedDocuments } : {},
```

- [ ] **Step 2: Verify type check passes**

Run: `yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json 2>&1 | grep "invoke_attack_discovery_graph"`
Expected: No errors mentioning this file

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_attack_discovery_graph/index.tsx
git commit -m "feat(ad): allow invokeAttackDiscoveryGraph to accept pre-fetched alerts"
```

---

## Task 2: Fix `invoke_incremental_attack_discovery.ts` to Pass Round Alerts

Currently the `generateInsights` callback passes `size: roundAlerts.length` to the graph which re-queries ES. Instead, we need to:
1. Fetch and anonymize ALL alerts once upfront (reusing existing graph utilities)
2. Split the anonymized documents by round
3. Pass each round's documents directly to the graph (triggering the bypass)

**Files:**
- Modify: `x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_incremental_attack_discovery.ts`
- Reference: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/helpers/get_anonymized_alerts/index.ts`

- [ ] **Step 1: Import `getAnonymizedAlerts` and anonymize upfront**

Replace the raw ES search (lines 85-115) with a call to `getAnonymizedAlerts`, which handles both fetching and anonymization:

```typescript
import { getAnonymizedAlerts } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/helpers/get_anonymized_alerts';

// Replace the raw esClient.search block with:
const { anonymizedAlerts: allAnonymizedDocs, replacements: alertReplacements } =
  await getAnonymizedAlerts({
    alertsIndexPattern,
    anonymizationFields,
    esClient,
    filter,
    onNewReplacements,
    replacements: latestReplacements,
    size,
    start,
    end,
  });

// Build Alert objects from anonymized docs for the incremental orchestrator
const alerts: Alert[] = allAnonymizedDocs.map((doc, i) => ({
  id: `alert-${i}`,
  content: doc.pageContent,
  timestamp: new Date().toISOString(),
}));
```

- [ ] **Step 2: Fix `generateInsights` callback to pass pre-fetched docs per round**

The callback receives `roundAlerts` (the round's subset). Map them back to anonymized documents and pass to the graph:

```typescript
const generateInsights = async (
  roundAlerts: Alert[],
  previousInsights?: AttackDiscovery[]
): Promise<AttackDiscovery[]> => {
  // Map round alerts back to their anonymized Document objects
  const roundDocs = roundAlerts.map((a) => ({
    pageContent: a.content,
    metadata: {},
  }));

  const { anonymizedAlerts: returnedDocs, attackDiscoveries } =
    await invokeAttackDiscoveryGraph({
      actionsClient,
      alertsIndexPattern,
      anonymizationFields,
      apiConfig,
      connectorTimeout,
      end,
      esClient,
      filter,
      langSmithProject,
      langSmithApiKey,
      latestReplacements,
      logger,
      onNewReplacements,
      savedObjectsClient,
      size: roundAlerts.length,
      start,
      // NEW: pass pre-fetched documents so graph skips ES fetch
      anonymizedDocuments: roundDocs,
    });

  allAnonymizedAlerts.push(...returnedDocs);
  return attackDiscoveries ?? [];
};
```

- [ ] **Step 3: Verify the fix compiles**

Run: `yarn test:type_check --project x-pack/solutions/security/plugins/elastic_assistant/tsconfig.json 2>&1 | grep "invoke_incremental"`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/plugins/elastic_assistant/server/routes/attack_discovery/public/post/helpers/invoke_incremental_attack_discovery.ts
git commit -m "fix(ad): pass round-specific alerts to graph instead of re-querying ES"
```

---

## Task 3: Enable Feature Flag for Testing

**Files:**
- Modify: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/feature_flags.ts`

- [ ] **Step 1: Set `enabled: true` in DEFAULT_FEATURE_FLAGS**

```typescript
// In DEFAULT_FEATURE_FLAGS:
enabled: true, // Enable for development/testing
```

- [ ] **Step 2: Commit**

```bash
git add x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/feature_flags.ts
git commit -m "feat(ad): enable incremental mode feature flag for testing"
```

---

## Task 4: Port Eval Suite from `evals-attack-discovery` Branch

Copy the entire `kbn-evals-suite-attack-discovery` package from the `evals-attack-discovery` branch to the feature branch. This package has the eval framework wiring, evaluators, task runner, and dataset loading.

**Files:**
- Create: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/` (entire directory)

- [ ] **Step 1: Copy the eval suite package**

```bash
git checkout evals-attack-discovery -- x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/
```

- [ ] **Step 2: Verify the package exists and structure is intact**

```bash
ls x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/
# Expected: clients/ dataset/ evaluate.ts evaluate_dataset.ts evaluators/ prompts/ task/ types.ts
```

- [ ] **Step 3: Run bootstrap to register the new package**

```bash
yarn kbn bootstrap
```

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/
git commit -m "feat(ad): port eval suite from evals-attack-discovery branch"
```

---

## Task 5: Add Incremental Types to Eval Suite

**Files:**
- Modify: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/types.ts`

- [ ] **Step 1: Add `incrementalProgressive` input variant**

Add to the `AttackDiscoveryTaskInput` discriminated union:

```typescript
| {
    mode: 'incrementalProgressive';
    anonymizedAlerts: AnonymizedAlert[];
    alertsPerRound: number;
    maxRounds: number;
  }
```

Add to `AttackDiscoveryTaskOutput`:

```typescript
rounds?: Array<{
  roundNumber: number;
  alertCount: number;
  insightCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}>;
```

- [ ] **Step 2: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/types.ts
git commit -m "feat(ad): add incremental mode types to eval suite"
```

---

## Task 6: Implement Incremental Runner for Evals

This is the core — a round processor that calls the real LLM per round and tracks per-round metrics. It reuses the insight merger from the incremental AD code.

**Files:**
- Create: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/task/incremental_runner.ts`

- [ ] **Step 1: Write the incremental runner**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput } from '../types';

interface IncrementalRunnerParams {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  alerts: AnonymizedAlert[];
  alertsPerRound: number;
  maxRounds: number;
  generateRoundInsights: (
    roundAlerts: string[],
    previousInsights: AttackDiscovery[]
  ) => Promise<{
    insights: AttackDiscovery[];
    usage: { inputTokens: number; outputTokens: number };
  }>;
}

interface RoundMetrics {
  roundNumber: number;
  alertCount: number;
  insightCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Simple Jaccard similarity for insight titles
 */
const titleSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

/**
 * Merge new insights into existing, deduplicating by alert ID overlap or title similarity
 */
const mergeInsights = (
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  threshold = 0.8
): AttackDiscovery[] => {
  const merged = [...existing];

  for (const insight of newInsights) {
    const matchIdx = merged.findIndex((e) => {
      const hasOverlap = e.alertIds.some((id) => insight.alertIds.includes(id));
      if (hasOverlap) return true;
      return titleSimilarity(e.title, insight.title) >= threshold;
    });

    if (matchIdx >= 0) {
      const match = merged[matchIdx];
      merged[matchIdx] = {
        ...match,
        alertIds: Array.from(new Set([...match.alertIds, ...insight.alertIds])),
        summaryMarkdown: `${match.summaryMarkdown}\n\n${insight.summaryMarkdown}`,
        detailsMarkdown: `${match.detailsMarkdown}\n\n${insight.detailsMarkdown}`,
      };
    } else {
      merged.push(insight);
    }
  }

  return merged;
};

export const runIncrementalProgressive = async ({
  log,
  alerts,
  alertsPerRound,
  maxRounds,
  generateRoundInsights,
}: IncrementalRunnerParams): Promise<AttackDiscoveryTaskOutput> => {
  const startTime = Date.now();
  const rounds: RoundMetrics[] = [];
  let currentInsights: AttackDiscovery[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const alertStrings = alerts.map((a) => a.pageContent);
  const totalRounds = Math.min(Math.ceil(alertStrings.length / alertsPerRound), maxRounds);

  log.info(
    `Incremental progressive: ${alertStrings.length} alerts, ${alertsPerRound}/round, ${totalRounds} rounds`
  );

  for (let i = 0; i < totalRounds; i++) {
    const roundStart = Date.now();
    const roundAlerts = alertStrings.slice(i * alertsPerRound, (i + 1) * alertsPerRound);
    const roundNumber = i + 1;

    log.info(`Round ${roundNumber}/${totalRounds}: processing ${roundAlerts.length} alerts`);

    const { insights: newInsights, usage } = await generateRoundInsights(
      roundAlerts,
      currentInsights
    );

    currentInsights = mergeInsights(currentInsights, newInsights);

    const roundDuration = Date.now() - roundStart;
    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;

    rounds.push({
      roundNumber,
      alertCount: roundAlerts.length,
      insightCount: newInsights.length,
      durationMs: roundDuration,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    log.info(
      `Round ${roundNumber} complete: ${newInsights.length} insights, ${usage.inputTokens + usage.outputTokens} tokens, ${roundDuration}ms`
    );
  }

  const endTime = Date.now();

  return {
    insights: currentInsights,
    rounds,
    metadata: {
      latency: { startTime, endTime, durationMs: endTime - startTime },
      tokens: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
    },
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/task/incremental_runner.ts
git commit -m "feat(ad): add incremental progressive runner for eval suite"
```

---

## Task 7: Wire Incremental Mode into Task Runner

**Files:**
- Modify: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/task/run_attack_discovery.ts`

- [ ] **Step 1: Add incrementalProgressive mode handler**

After the `bundledAlerts` mode block, add:

```typescript
if (input.mode === 'incrementalProgressive') {
  const prompt = await loadDefaultPrompt();

  const result = await runIncrementalProgressive({
    inferenceClient,
    log,
    alerts: input.anonymizedAlerts,
    alertsPerRound: input.alertsPerRound,
    maxRounds: input.maxRounds,
    generateRoundInsights: async (roundAlerts, previousInsights) => {
      return generateInsights({
        inferenceClient,
        log,
        prompt,
        alerts: roundAlerts,
        // Pass previous insights as context for progressive refinement
        combinedMaybePartialResults: previousInsights.length > 0
          ? JSON.stringify(previousInsights.map((i) => i.title))
          : undefined,
      });
    },
  });

  return result;
}
```

Add import at top:
```typescript
import { runIncrementalProgressive } from './incremental_runner';
```

- [ ] **Step 2: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/task/run_attack_discovery.ts
git commit -m "feat(ad): wire incremental progressive mode into eval task runner"
```

---

## Task 8: Add Context Budget and Round Efficiency Evaluators

**Files:**
- Create: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/context_budget_evaluator.ts`
- Create: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/round_efficiency_evaluator.ts`

- [ ] **Step 1: Write context budget evaluator**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryTaskOutput } from '../types';

const MAX_TOKENS_PER_ROUND = 8000;

/**
 * Validates that each round stays within the context budget.
 * Score: 1 if ALL rounds < MAX_TOKENS_PER_ROUND, 0 otherwise.
 */
export const ContextBudgetEvaluator: Evaluator<AttackDiscoveryTaskOutput> = {
  name: 'ContextBudget',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    if (!output?.rounds?.length) {
      return { score: 0, explanation: 'No round data available' };
    }

    const violations = output.rounds.filter(
      (r) => r.inputTokens + r.outputTokens > MAX_TOKENS_PER_ROUND
    );

    if (violations.length > 0) {
      const details = violations
        .map((r) => `Round ${r.roundNumber}: ${r.inputTokens + r.outputTokens} tokens`)
        .join(', ');
      return { score: 0, explanation: `Budget exceeded in ${violations.length} rounds: ${details}` };
    }

    const maxTokens = Math.max(...output.rounds.map((r) => r.inputTokens + r.outputTokens));
    return {
      score: 1,
      explanation: `All ${output.rounds.length} rounds within budget. Max: ${maxTokens} tokens`,
    };
  },
};
```

- [ ] **Step 2: Write round efficiency evaluator**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryTaskOutput } from '../types';

/**
 * Validates that incremental processing completed all expected rounds
 * and produced insights. Score: fraction of rounds that produced insights.
 */
export const RoundEfficiencyEvaluator: Evaluator<AttackDiscoveryTaskOutput> = {
  name: 'RoundEfficiency',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    if (!output?.rounds?.length) {
      return { score: 0, explanation: 'No round data available' };
    }

    const roundsWithInsights = output.rounds.filter((r) => r.insightCount > 0).length;
    const score = roundsWithInsights / output.rounds.length;

    return {
      score,
      explanation: `${roundsWithInsights}/${output.rounds.length} rounds produced insights`,
    };
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/context_budget_evaluator.ts
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/round_efficiency_evaluator.ts
git commit -m "feat(ad): add context budget and round efficiency evaluators"
```

---

## Task 9: Create Incremental Eval Spec

**Files:**
- Create: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/evals/attack_discovery/incremental.spec.ts`

- [ ] **Step 1: Write the eval scenarios**

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { loadAttackDiscoveryBundledAlertsJsonlDataset } from '../../src/dataset/load_attack_discovery_jsonl';

const JSONL_PATH = process.env.ATTACK_DISCOVERY_DATASET_JSONL_PATH;

evaluate.describe('Incremental Attack Discovery', { tag: tags.stateful.classic }, () => {
  evaluate.describe('Progressive Mode — Real LLM Validation', () => {
    evaluate(
      'progressive 200 alerts in 4 rounds of 50',
      async ({ executorClient, inferenceClient, log, attackDiscoveryClient }) => {
        // Load bundled alerts dataset
        const dataset = JSONL_PATH
          ? await loadAttackDiscoveryBundledAlertsJsonlDataset({
              jsonlPath: JSONL_PATH,
              limit: 200,
            })
          : {
              name: 'incremental-progressive-200',
              description: '200 alerts for progressive incremental AD validation',
              examples: [],
            };

        // If no dataset, use searchAlerts to grab whatever is in the cluster
        if (dataset.examples.length === 0) {
          const alerts = await attackDiscoveryClient.searchAlertsAsContext({ size: 200 });
          dataset.examples = [
            {
              input: {
                mode: 'incrementalProgressive' as const,
                anonymizedAlerts: alerts,
                alertsPerRound: 50,
                maxRounds: 10,
              },
              output: { attackDiscoveries: [] },
            },
          ];
        } else {
          // Convert bundledAlerts examples to incrementalProgressive
          const allAlerts = dataset.examples.flatMap((e) =>
            'anonymizedAlerts' in e.input ? e.input.anonymizedAlerts : []
          );
          dataset.examples = [
            {
              input: {
                mode: 'incrementalProgressive' as const,
                anonymizedAlerts: allAlerts.slice(0, 200),
                alertsPerRound: 50,
                maxRounds: 10,
              },
              output: { attackDiscoveries: [] },
            },
          ];
        }

        await executorClient.runExperiment(
          {
            dataset,
            task: async ({ input }) => {
              if (input.mode !== 'incrementalProgressive') {
                throw new Error(`Unexpected mode: ${input.mode}`);
              }

              const { runAttackDiscovery } = await import('../../src/task/run_attack_discovery');
              return runAttackDiscovery({
                inferenceClient,
                attackDiscoveryClient,
                input,
                log,
              });
            },
          },
          [
            {
              name: 'ProducedInsights',
              kind: 'CODE',
              evaluate: async ({ output }) => ({
                score: output?.insights && output.insights.length > 0 ? 1 : 0,
              }),
            },
            {
              name: 'ContextBudget',
              kind: 'CODE',
              evaluate: async ({ output }) => {
                if (!output?.rounds?.length) return { score: 0 };
                const maxTokens = Math.max(
                  ...output.rounds.map((r) => r.inputTokens + r.outputTokens)
                );
                return {
                  score: maxTokens <= 8000 ? 1 : 0,
                  explanation: `Max round tokens: ${maxTokens}`,
                };
              },
            },
            {
              name: 'AllRoundsCompleted',
              kind: 'CODE',
              evaluate: async ({ output }) => {
                if (!output?.rounds?.length) return { score: 0 };
                return {
                  score: output.rounds.length >= 4 ? 1 : 0,
                  explanation: `${output.rounds.length} rounds completed (expected >= 4)`,
                };
              },
            },
            {
              name: 'TotalTokensReduction',
              kind: 'CODE',
              evaluate: async ({ output }) => {
                if (!output?.rounds?.length) return { score: 0 };
                // Compare max single-round tokens vs theoretical batch (all alerts at once)
                const maxRoundTokens = Math.max(
                  ...output.rounds.map((r) => r.inputTokens)
                );
                const totalInputTokens = output.rounds.reduce(
                  (sum, r) => sum + r.inputTokens,
                  0
                );
                // Score = reduction ratio. If max round input < total/2, good reduction
                const reduction = 1 - maxRoundTokens / totalInputTokens;
                return {
                  score: reduction,
                  explanation: `Max round input: ${maxRoundTokens}, total: ${totalInputTokens}, reduction: ${(reduction * 100).toFixed(1)}%`,
                };
              },
            },
            {
              name: 'Latency',
              kind: 'CODE',
              evaluate: async ({ output }) => ({
                score: output?.metadata?.latency?.durationMs
                  ? output.metadata.latency.durationMs / 1000
                  : 999,
              }),
            },
          ]
        );
      }
    );
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/evals/attack_discovery/incremental.spec.ts
git commit -m "feat(ad): add incremental progressive eval scenarios with real LLM"
```

---

## Task 10: Run the Eval Against Real LLM

**Prerequisites:**
- Elasticsearch running (port 9220): `yarn es snapshot --docker --port 9220`
- Kibana running (port 5620): `yarn start --server.port=5620 --elasticsearch.hosts=http://localhost:9220 --no-base-path`
- LLM connector configured in Kibana (Ollama with Qwen 2.5 7B, or OpenAI, or Bedrock)
- Security alerts loaded in `.alerts-security.alerts-default`

- [ ] **Step 1: Run the incremental eval**

```bash
TEST_RUN_ID="incremental-ad-$(date +%Y%m%d-%H%M%S)" \
KIBANA_URL=http://localhost:5620 \
ELASTICSEARCH_URL=http://localhost:9220 \
npx playwright test \
  --config x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/playwright.config.ts \
  --grep "Incremental Attack Discovery"
```

- [ ] **Step 2: Review results**

Check terminal output for:
- `ProducedInsights`: score = 1 (generated real insights)
- `ContextBudget`: score = 1 (all rounds < 8K tokens)
- `AllRoundsCompleted`: score = 1 (>= 4 rounds ran)
- `TotalTokensReduction`: score > 0.5 (meaningful per-round reduction)
- `Latency`: raw seconds value

- [ ] **Step 3: Document results**

Update `REAL_LLM_RESULTS.md` with actual measured values from the eval run.

---

## Summary of What Gets Validated

| PR Claim | How We Validate | Evaluator |
|----------|----------------|-----------|
| 78% context reduction | Compare max round input tokens vs total | `TotalTokensReduction` |
| <8K tokens per round | Check all rounds' tokens < 8000 | `ContextBudget` |
| 100% success rate | All rounds produce insights | `RoundEfficiency` + `ProducedInsights` |
| Works with OSS models | Run eval with Qwen 2.5 7B connector | End-to-end test |
| Progressive mode works | 200 alerts processed in 4+ rounds | `AllRoundsCompleted` |
| Quality maintained | Insights have valid structure | `AttackDiscoveryBasic` |
