# Evaluator Patterns

Extended examples for each evaluator type, extracted from real eval suites.

## CODE Evaluators with `selectEvaluators`

From `llm-tasks` -- deterministic checks with typed generics:

```ts
import { selectEvaluators, type Example, type TaskOutput } from '@kbn/evals';

type MyExample = Example & {
  input: { searchTerm: string; products?: string[] };
  metadata?: { minDocs?: number; requiredTerms?: string[] };
};

type MyTaskOutput = TaskOutput & {
  success: boolean;
  documents: Array<{ title: string; url: string; content: string }>;
};

await executorClient.runExperiment(
  { dataset, task },
  selectEvaluators<MyExample, MyTaskOutput>([
    {
      name: 'NonEmptyDocuments',
      kind: 'CODE',
      evaluate: async ({ output, metadata }) => {
        const minDocs = typeof metadata?.minDocs === 'number' ? metadata.minDocs : 1;
        const count = output?.documents?.length ?? 0;
        return { score: count >= minDocs ? 1 : 0, metadata: { minDocs, count } };
      },
    },
    {
      name: 'RequiredTermsInContent',
      kind: 'CODE',
      evaluate: async ({ output, metadata }) => {
        const requiredTerms = metadata?.requiredTerms ?? [];
        if (requiredTerms.length === 0) return { score: 1 };

        const text = (output?.documents ?? [])
          .slice(0, 3)
          .map((d) => `${d.title}\n${d.content}`)
          .join('\n');

        const ok = requiredTerms.every((term) =>
          text.toLowerCase().includes(term.toLowerCase())
        );
        return { score: ok ? 1 : 0, metadata: { requiredTerms } };
      },
    },
    {
      name: 'HasValidUrl',
      kind: 'CODE',
      evaluate: async ({ output }) => {
        const urls = (output?.documents ?? []).map((d) => d.url);
        const ok = urls.some((u) => typeof u === 'string' && u.startsWith('https://'));
        return { score: ok ? 1 : 0, metadata: { urls: urls.slice(0, 3) } };
      },
    },
  ])
);
```

Key points:
- `selectEvaluators<ExampleType, OutputType>([...])` gives type safety on `input`, `output`, `expected`, `metadata`.
- `kind: 'CODE'` means no LLM call -- fast and deterministic.
- Return `metadata` in the result to aid debugging.

## LLM-as-Judge Criteria via `evaluators.criteria`

From `security-solution-evals` -- the `criteria` evaluator delegates to the judge LLM:

```ts
const mainCriteriaResult = await evaluators
  .criteria([
    'The response correctly identifies the top users.',
    'The response includes risk scores for each user.',
    'The response includes risk levels for each user.',
  ])
  .evaluate({ input, output, expected, metadata });
```

Each criterion is evaluated independently. The judge returns a score (0 or 1) and explanation per criterion.

### Wrapping Criteria in a Reusable Evaluator

```ts
function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ input, output, expected, metadata }: {
      input: MyExample['input'];
      output: MyTaskOutput;
      expected: MyExample['output'];
      metadata: MyExample['metadata'];
    }) => {
      const criteria = expected.criteria ?? [];
      if (criteria.length === 0) {
        return { score: 1, label: 'PASS', explanation: 'No criteria specified.' };
      }
      return evaluators.criteria(criteria).evaluate({ input, expected, output, metadata });
    },
  };
}
```

## Tool Call Evaluator

From `security-solution-evals` -- checks that specific tools were invoked:

```ts
function createToolCallsEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'ToolCalls',
    kind: 'LLM' as const,
    evaluate: async ({ input, output, expected, metadata }) => {
      const toolCalls = expected.toolCalls ?? [];
      const steps = output.steps ?? [];

      if (toolCalls.length === 0) {
        return { score: 1, label: 'PASS', explanation: 'No tool call assertions.' };
      }

      const results = [];
      for (const assertion of toolCalls) {
        const called = steps.some(
          (s) => s.type === 'tool_call' && s.tool_id === assertion.id
        );

        if (!called) {
          results.push({
            score: 0,
            label: 'FAIL',
            explanation: `Tool "${assertion.id}" was not called.`,
          });
          continue;
        }

        if (assertion.criteria?.length) {
          const criteriaResult = await evaluators
            .criteria(assertion.criteria)
            .evaluate({ input, expected: { criteria: assertion.criteria }, output, metadata });
          results.push(criteriaResult);
        } else {
          results.push({ score: 1, label: 'PASS', explanation: `Tool "${assertion.id}" called.` });
        }
      }

      const allPassed = results.every((r) => r.label === 'PASS');
      const scores = results.map((r) => r.score ?? 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      return {
        score: allPassed ? avg : 0,
        label: allPassed ? 'PASS' : 'FAIL',
        explanation: results.map((r) => r.explanation).join(' '),
      };
    },
  };
}
```

Dataset examples with tool call assertions:

```ts
{
  input: { question: 'Which users have the highest risk scores?' },
  output: {
    criteria: [
      'Return 10 users with the highest risk scores.',
      'Return the risk levels of those users.',
    ],
    toolCalls: [
      {
        id: 'security.entity_analytics.risk_score',
        criteria: ['The ES|QL query should sort by risk score descending.'],
      },
    ],
  },
}
```

## RAG Evaluators

For retrieval quality with ground truth documents:

```ts
import {
  createPrecisionAtKEvaluator,
  createRecallAtKEvaluator,
  createF1AtKEvaluator,
  createRagEvaluators,
} from '@kbn/evals';
import type { GroundTruth, RetrievedDoc } from '@kbn/evals';
```

The `createRagEvaluators` factory creates all three at once:

```ts
const ragEvals = createRagEvaluators({
  k: 5,
  extractRetrievedDocs: (output) =>
    output.documents.map((d) => ({ id: d.id, content: d.content })),
  extractGroundTruth: (expected) => expected.groundTruth,
});
```

Ground truth in datasets uses document IDs mapped to relevance scores:

```ts
{
  input: { question: 'How do I set up payments?' },
  output: {
    expected: 'You can start accepting payments using Wix Payments...',
    groundTruth: {
      knowledge_base: {
        'doc_hash_abc123': 1,
        'doc_hash_def456': 1,
      },
    },
  },
}
```

## Trace-Based Evaluators

These are pre-built and available from `evaluators.traceBasedEvaluators`. They query the tracing ES cluster for spans matching the current trace ID:

```ts
const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
  evaluators.traceBasedEvaluators;
```

Each returns a numeric score:
- `inputTokens` / `outputTokens` / `cachedTokens` -- token counts from `gen_ai.usage.*` span attributes
- `toolCalls` -- count of tool call spans
- `latency` -- total span duration in seconds

To use trace-based evaluators, EDOT must be running and `TRACING_ES_URL` must point to an ES instance receiving traces.

## Combining Multiple Evaluator Types

A common pattern passes both CODE and LLM evaluators to `runExperiment`:

```ts
await executorClient.runExperiment(
  { dataset, task },
  [
    createCriteriaEvaluator({ evaluators }),
    createToolCallsEvaluator({ evaluators }),
    {
      name: 'HasResponse',
      kind: 'CODE',
      evaluate: async ({ output }) => ({
        score: output?.messages?.length > 0 ? 1 : 0,
      }),
    },
  ]
);
```

The executor runs all evaluators for each example and aggregates scores in the final report.
