/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
import { Client } from '@elastic/elasticsearch';

const ES_URL = process.env.EVALUATIONS_ES_URL ?? 'http://elastic:changeme@localhost:9220';
const INDEX = 'kibana-evaluations';

interface EvalDoc {
  run_id: string;
  example: {
    id: string;
    index: number;
    input?: { instruction?: string; initialYaml?: string };
    dataset: { id: string; name: string };
  };
  task: {
    trace_id: string | null;
    output?: {
      messages?: Array<{ message: string }>;
      steps?: Array<{
        type?: string;
        tool_id?: string;
        params?: Record<string, unknown>;
        results?: Array<{ data?: Record<string, unknown> }>;
      }>;
      errors?: unknown[];
      resultYaml?: string;
    };
    model: { id: string; family?: string; provider?: string };
  };
  evaluator: {
    name: string;
    score: number | null;
    label: string | null;
    explanation: string | null;
    metadata: Record<string, unknown> | null;
    model: { id: string };
  };
  '@timestamp': string;
}

async function main() {
  const runId = process.argv[2];
  const mode = process.argv[3] ?? 'summary';

  const client = new Client({ node: ES_URL });

  if (!runId || runId === '--help') {
    await listRecentRuns(client);
    console.log('\nUsage: npx ts-node scripts/inspect_eval_run.ts <run_id> [mode]');
    console.log('Modes: summary (default), failures, compare, conversations, efficiency');
    await client.close();
    return;
  }

  switch (mode) {
    case 'summary':
      await showSummary(client, runId);
      break;
    case 'failures':
      await showFailures(client, runId);
      break;
    case 'compare':
      await showModelComparison(client, runId);
      break;
    case 'conversations':
      await showConversations(client, runId);
      break;
    case 'efficiency':
      await showEfficiency(client, runId);
      break;
    default:
      console.error(`Unknown mode: ${mode}`);
  }

  await client.close();
}

async function listRecentRuns(client: Client) {
  const response = await client.search({
    index: INDEX,
    size: 0,
    aggs: {
      runs: {
        terms: { field: 'run_id', size: 10, order: { latest: 'desc' } },
        aggs: {
          latest: { max: { field: '@timestamp' } },
          models: { terms: { field: 'task.model.id' } },
          doc_count_agg: { value_count: { field: 'run_id' } },
        },
      },
    },
  });

  const buckets = (response.aggregations?.runs as any)?.buckets ?? [];
  console.log('\n=== Recent Eval Runs ===\n');
  for (const bucket of buckets) {
    const models = (bucket.models?.buckets ?? []).map((m: any) => m.key).join(', ');
    const ts = new Date(bucket.latest.value).toISOString();
    console.log(`  ${bucket.key}  (${bucket.doc_count} docs, models: ${models}, latest: ${ts})`);
  }
}

async function fetchDocs(client: Client, runId: string, extraFilter?: object): Promise<EvalDoc[]> {
  const must: object[] = [{ term: { run_id: runId } }];
  if (extraFilter) {
    must.push(extraFilter);
  }

  const response = await client.search<EvalDoc>({
    index: INDEX,
    size: 1000,
    query: { bool: { must } },
    sort: [
      { 'example.dataset.name': 'asc' },
      { 'example.index': 'asc' },
      { 'evaluator.name': 'asc' },
    ],
  });

  return response.hits.hits.map((h) => h._source!);
}

async function showSummary(client: Client, runId: string) {
  const docs = await fetchDocs(client, runId);
  if (docs.length === 0) {
    console.log(`No results for run_id: ${runId}`);
    return;
  }

  const byModel = groupBy(docs, (d) => d.task.model.id);

  for (const [modelId, modelDocs] of Object.entries(byModel)) {
    console.log(`\n=== Model: ${modelId} ===`);

    const byEval = groupBy(modelDocs, (d) => d.evaluator.name);
    console.log('\nEvaluator scores:');
    for (const [evalName, evalDocs] of Object.entries(byEval)) {
      const scores = evalDocs.map((d) => d.evaluator.score).filter((s): s is number => s !== null);
      if (scores.length === 0) {
        console.log(`  ${evalName.padEnd(25)} no scores`);
        continue;
      }
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const min = Math.min(...scores);
      const failures = scores.filter((s) => s < 1).length;
      console.log(
        `  ${evalName.padEnd(25)} mean: ${mean.toFixed(3)}  min: ${min.toFixed(
          2
        )}  failures: ${failures}/${scores.length}`
      );
    }

    const byDataset = groupBy(modelDocs, (d) => d.example.dataset.name);
    console.log('\nPer-dataset breakdown (scores < 1.0 only):');
    for (const [dsName, dsDocs] of Object.entries(byDataset)) {
      const failures = dsDocs.filter((d) => d.evaluator.score !== null && d.evaluator.score < 1);
      if (failures.length > 0) {
        console.log(`\n  ${dsName}:`);
        for (const f of failures) {
          console.log(
            `    ${f.evaluator.name}: ${f.evaluator.score?.toFixed(3)} ${
              f.evaluator.explanation ? '- ' + truncate(f.evaluator.explanation, 120) : ''
            }`
          );
        }
      }
    }
  }
}

async function showFailures(client: Client, runId: string) {
  const docs = await fetchDocs(client, runId, {
    range: { 'evaluator.score': { lt: 1.0 } },
  });

  if (docs.length === 0) {
    console.log(`No failures for run_id: ${runId}`);
    return;
  }

  console.log(`\n=== ${docs.length} Failures in ${runId} ===\n`);

  for (const doc of docs) {
    console.log(`--- ${doc.example.dataset.name} [example ${doc.example.index}] ---`);
    console.log(`  Model:     ${doc.task.model.id}`);
    console.log(`  Evaluator: ${doc.evaluator.name} (score: ${doc.evaluator.score})`);

    if (doc.example.input?.instruction) {
      console.log(`  Instruction: ${truncate(doc.example.input.instruction, 150)}`);
    }

    if (doc.evaluator.explanation) {
      console.log(`  Explanation: ${doc.evaluator.explanation}`);
    }

    if (doc.evaluator.metadata) {
      console.log(`  Metadata: ${JSON.stringify(doc.evaluator.metadata, null, 2)}`);
    }

    if (doc.task.output?.resultYaml) {
      console.log(`  Result YAML (first 500 chars):`);
      console.log(
        doc.task.output.resultYaml
          .substring(0, 500)
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')
      );
    }

    console.log();
  }
}

async function showModelComparison(client: Client, runId: string) {
  const docs = await fetchDocs(client, runId);
  const byModel = groupBy(docs, (d) => d.task.model.id);
  const modelIds = Object.keys(byModel);

  if (modelIds.length < 2) {
    console.log(`Only ${modelIds.length} model(s) found. Compare needs 2+ models in the same run.`);
    console.log('Models found:', modelIds.join(', '));
    console.log(
      '\nTo compare across runs, query two run_ids separately and use the "failures" mode.'
    );
    return;
  }

  console.log(`\n=== Model Comparison: ${modelIds.join(' vs ')} ===\n`);

  const allDatasets = [...new Set(docs.map((d) => `${d.example.dataset.name}|${d.example.index}`))];

  for (const dsKey of allDatasets) {
    const [dsName, exIdx] = dsKey.split('|');
    const header = `${dsName} [example ${exIdx}]`;

    const modelScores: Record<string, Record<string, number | null>> = {};
    for (const modelId of modelIds) {
      modelScores[modelId] = {};
      const relevant = (byModel[modelId] ?? []).filter(
        (d) => d.example.dataset.name === dsName && d.example.index === parseInt(exIdx, 10)
      );
      for (const d of relevant) {
        modelScores[modelId][d.evaluator.name] = d.evaluator.score;
      }
    }

    const hasDifference = Object.keys(modelScores[modelIds[0]] ?? {}).some((evalName) => {
      return modelIds.some((m) => modelScores[m][evalName] !== modelScores[modelIds[0]][evalName]);
    });

    if (hasDifference) {
      console.log(`  ${header}:`);
      const evalNames = Object.keys(modelScores[modelIds[0]] ?? {});
      for (const evalName of evalNames) {
        const scores = modelIds.map(
          (m) => `${m}: ${modelScores[m][evalName]?.toFixed(2) ?? 'N/A'}`
        );
        const diff = modelIds.some(
          (m) => modelScores[m][evalName] !== modelScores[modelIds[0]][evalName]
        );
        if (diff) {
          console.log(`    ${evalName.padEnd(25)} ${scores.join('  |  ')}`);
        }
      }
    }
  }
}

async function showConversations(client: Client, runId: string) {
  const docs = await fetchDocs(client, runId, {
    term: { 'evaluator.name': 'Criteria' },
  });

  console.log(`\n=== Conversations for ${runId} ===\n`);

  for (const doc of docs) {
    console.log(`--- ${doc.example.dataset.name} [example ${doc.example.index}] ---`);
    console.log(`  Model: ${doc.task.model.id}`);
    console.log(`  Criteria score: ${doc.evaluator.score}`);

    if (doc.example.input?.instruction) {
      console.log(`\n  User instruction:`);
      console.log(`    ${doc.example.input.instruction}`);
    }

    const steps = doc.task.output?.steps ?? [];
    const toolCalls = steps.filter((s) => s.type === 'tool_call');
    if (toolCalls.length > 0) {
      console.log(`\n  Tool calls (${toolCalls.length}):`);
      for (const tc of toolCalls) {
        const success = tc.results?.every((r) => (r.data as any)?.success !== false);
        console.log(`    ${tc.tool_id} ${success ? '✓' : '✗'}`);
      }
    }

    if (doc.task.output?.resultYaml) {
      console.log(`\n  Final YAML:`);
      console.log(
        doc.task.output.resultYaml
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')
      );
    }

    if (doc.evaluator.explanation) {
      console.log(`\n  Judge explanation:`);
      console.log(`    ${doc.evaluator.explanation}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

async function showEfficiency(client: Client, runId: string) {
  const efficiencyDocs = await fetchDocs(client, runId, {
    term: { 'evaluator.name': 'Efficiency' },
  });
  const trajectoryDocs = await fetchDocs(client, runId, {
    term: { 'evaluator.name': 'trajectory' },
  });

  if (efficiencyDocs.length === 0) {
    console.log(`No Efficiency results for run_id: ${runId}`);
    return;
  }

  console.log(`\n=== Efficiency Breakdown for ${runId} ===\n`);

  const byDataset = groupBy(efficiencyDocs, (d) => d.example.dataset.name);
  const trajectoryByKey = new Map(
    trajectoryDocs.map((d) => [`${d.example.dataset.name}|${d.example.index}`, d])
  );

  for (const [dsName, docs] of Object.entries(byDataset)) {
    console.log(`\n  ${dsName}:`);
    for (const doc of docs) {
      const meta = doc.evaluator.metadata as Record<string, unknown> | null;
      const trajDoc = trajectoryByKey.get(`${dsName}|${doc.example.index}`);
      const trajScore = trajDoc?.evaluator.score;
      const trajMeta = trajDoc?.evaluator.metadata as Record<string, unknown> | null;

      const total = meta?.totalToolCalls ?? '?';
      const budget = meta?.budget ?? '?';
      const budgetScore = typeof meta?.budgetScore === 'number' ? meta.budgetScore.toFixed(2) : '?';
      const failed = meta?.failedCalls ?? '?';
      const failedScore =
        typeof meta?.failedCallScore === 'number' ? meta.failedCallScore.toFixed(2) : '?';
      const redundant = meta?.redundantLookups ?? '?';
      const redundantScore =
        typeof meta?.redundantLookupScore === 'number' ? meta.redundantLookupScore.toFixed(2) : '?';

      const instruction = truncate(doc.example.input?.instruction ?? '', 60);

      console.log(
        `    [${doc.example.index}] score=${doc.evaluator.score?.toFixed(3)}  ` +
          `calls=${total}/${budget}(${budgetScore})  ` +
          `failed=${failed}(${failedScore})  ` +
          `redundant=${redundant}(${redundantScore})` +
          (trajScore != null ? `  traj=${trajScore.toFixed(2)}` : '') +
          `  | ${instruction}`
      );

      if (trajMeta) {
        const missing = trajMeta.missingTools as string[] | undefined;
        const extra = trajMeta.extraTools as string[] | undefined;
        if (missing && missing.length > 0) {
          console.log(`      missing tools: ${missing.join(', ')}`);
        }
        if (extra && extra.length > 0) {
          console.log(`      extra tools: ${extra.join(', ')}`);
        }
      }
    }
  }

  const allScores = efficiencyDocs
    .map((d) => d.evaluator.score)
    .filter((s): s is number => s !== null);

  if (allScores.length > 0) {
    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const imperfect = allScores.filter((s) => s < 1).length;
    console.log(`\n  Overall: mean=${mean.toFixed(3)}  imperfect=${imperfect}/${allScores.length}`);
  }

  if (trajectoryDocs.length > 0) {
    const trajScores = trajectoryDocs
      .map((d) => d.evaluator.score)
      .filter((s): s is number => s !== null);
    const trajMean = trajScores.reduce((a, b) => a + b, 0) / trajScores.length;
    console.log(
      `  Trajectory: mean=${trajMean.toFixed(3)}  imperfect=${
        trajScores.filter((s) => s < 1).length
      }/${trajScores.length}`
    );
  }
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}

function truncate(str: string, maxLen: number): string {
  const cleaned = str.replace(/\n/g, ' ');
  if (cleaned.length <= maxLen) {
    return cleaned;
  }
  return cleaned.substring(0, maxLen) + '...';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
