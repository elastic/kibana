---
name: evals-write-spec
disable-model-invocation: true
description: Write LLM evaluation spec files with datasets, tasks, and evaluators using the @kbn/evals Playwright fixture. Use when authoring new eval specs, adding datasets or evaluators, or debugging evaluation test failures.
---

# Write Eval Specs

## Spec File Anatomy

Eval specs use the `evaluate` Playwright fixture (not `test`). A spec file follows this structure:

```ts
import { evaluate, tags, selectEvaluators, type Example, type TaskOutput } from '@kbn/evals';

evaluate.describe('Suite name', { tag: tags.serverless.observability.complete }, () => {
  evaluate.beforeAll(async ({ fetch, log }) => {
    // one-time setup: install docs, create agents, load archives
  });

  evaluate.afterAll(async ({ fetch, log }) => {
    // teardown: uninstall docs, delete agents, unload archives
  });

  evaluate('test name', async ({ executorClient, connector }) => {
    await executorClient.runExperiment(
      { dataset, task },
      evaluators
    );
  });
});
```

When a suite has a custom `src/evaluate.ts`, import from there instead of `@kbn/evals`:

```ts
import { evaluate } from '../src/evaluate';
```

## Tags

Every `evaluate.describe` must have a tag. Common choices:

| Tag | When to use |
|-----|-------------|
| `tags.serverless.observability.complete` | Observability domain evals |
| `tags.serverless.security.complete` | Security domain evals |
| `tags.serverless.search` | Search domain evals |
| `tags.stateful.classic` | Stateful-only evals |

Import tags from `@kbn/scout` or `@kbn/evals` (re-exported).

## Datasets

A dataset is an array of examples with typed `input`, `output` (expected), and optional `metadata`:

```ts
type MyExample = Example<
  { question: string },
  { expectedAnswer: string },
  { tags?: string[] }
>;

const dataset = {
  name: 'my-dataset',
  description: 'What this dataset tests',
  examples: [
    {
      input: { question: 'What is 2+2?' },
      output: { expectedAnswer: '4' },
      metadata: { tags: ['math'] },
    },
  ],
};
```

Keep datasets focused. For local iteration, use `--grep` to run a subset:

```bash
node scripts/evals start --grep "my test name"
```

## Tasks

The `task` function receives an example and returns the output to evaluate:

```ts
task: async ({ input }) => {
  const result = await someKibanaApi(input.question);
  return { answer: result.content };
}
```

Tasks can use any fixture available in the `evaluate` callback: `fetch`, `inferenceClient`, `connector`, `esClient`, `kbnClient`, or custom fixtures like `chatClient`.

## Evaluators

There are two ways to provide evaluators to `runExperiment`:

1. **Inline array** -- pass evaluator objects directly (simple suites)
2. **`selectEvaluators`** -- typed wrapper that enforces `Example`/`TaskOutput` generics

### CODE Evaluators

Deterministic, no LLM call. Use for binary checks:

```ts
{
  name: 'NonEmpty',
  kind: 'CODE',
  evaluate: async ({ output }) => ({
    score: output?.documents?.length > 0 ? 1 : 0,
  }),
}
```

### LLM-as-Judge Criteria

Use `evaluators.criteria(criteriaArray)` for subjective quality checks. The judge LLM scores each criterion:

```ts
evaluators.criteria([
  'The response correctly identifies the top users.',
  'The response includes risk scores.',
]).evaluate({ input, output, expected, metadata })
```

### Correctness Analysis

Compares output against expected answer:

```ts
evaluators.correctnessAnalysis().evaluate({ input, output, expected, metadata })
```

### Groundedness Analysis

Checks if output is grounded in provided context:

```ts
evaluators.groundednessAnalysis().evaluate({ input, output, expected, metadata })
```

### Trace-Based Evaluators

Available from `evaluators.traceBasedEvaluators`:
- `inputTokens`, `outputTokens`, `cachedTokens` -- token usage
- `toolCalls` -- number of tool calls
- `latency` -- span latency in seconds

These read from the tracing ES cluster and require EDOT to be running.

### RAG Evaluators

For retrieval-augmented generation with ground truth:

```ts
import { createPrecisionAtKEvaluator, createRecallAtKEvaluator, createF1AtKEvaluator } from '@kbn/evals';
```

See [evaluator-patterns.md](references/evaluator-patterns.md) for full examples.

## Available Fixtures

| Fixture | Scope | Description |
|---------|-------|-------------|
| `executorClient` | worker | Runs experiments, exports scores to ES |
| `inferenceClient` | worker | Inference REST client bound to connector |
| `connector` | worker | The model connector being evaluated |
| `evaluationConnector` | worker | The judge connector |
| `evaluators` | worker | `DefaultEvaluators` (criteria, correctness, groundedness, trace-based) |
| `fetch` | worker | `HttpHandler` for Kibana API calls |
| `esClient` | worker | Elasticsearch client (Scout cluster) |
| `kbnClient` | worker | Kibana client with retries |
| `traceEsClient` | worker | ES client for trace queries |
| `evaluationsEsClient` | worker | ES client for evaluation score storage |
| `log` | worker | `ToolingLog` for structured logging |
| `repetitions` | worker | Number of experiment repetitions |
| `config` | worker | Scout server config (hosts, auth) |

## The `evaluateDataset` Pattern

For suites with many specs that share the same task + evaluator wiring, extract a reusable helper:

**`src/evaluate_dataset.ts`:**

```ts
import type { DefaultEvaluators, EvalsExecutorClient } from '@kbn/evals';
import type { MyChatClient } from './chat_client';

export type EvaluateDataset = (opts: {
  dataset: { name: string; description: string; examples: MyExample[] };
}) => Promise<void>;

export function createEvaluateDataset({
  chatClient, evaluators, executorClient,
}: {
  chatClient: MyChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
}): EvaluateDataset {
  return async ({ dataset }) => {
    await executorClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.converse({ messages: [{ message: input.question }] });
          return { messages: response.messages, steps: response.steps };
        },
      },
      [myCriteriaEvaluator, myToolCallsEvaluator]
    );
  };
}
```

**In the spec:**

```ts
import { evaluate as base } from '../src/evaluate';
import type { EvaluateDataset } from '../src/evaluate_dataset';
import { createEvaluateDataset } from '../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient }, use) => {
      use(createEvaluateDataset({ chatClient, evaluators, executorClient }));
    },
    { scope: 'test' },
  ],
});

evaluate.describe('My suite', { tag: tags.serverless.search }, () => {
  evaluate('my test', async ({ evaluateDataset }) => {
    await evaluateDataset({ dataset: { name: '...', description: '...', examples: [...] } });
  });
});
```

## Setup and Teardown

Use `evaluate.beforeAll` / `evaluate.afterAll` for expensive one-time operations:

- **Install product docs**: POST to `/internal/product_doc_base/install`
- **Create agents/rules**: Use `fetch` or `kbnClient`
- **Load ES archives**: Use `esArchiver.load(archivePath)` (requires custom fixture)

Always clean up in `afterAll` -- delete agents, uninstall docs, unload archives.

## Running Locally

```bash
# Full interactive flow
node scripts/evals start

# Specify model and judge
node scripts/evals start --model <connector-id> --judge <connector-id>

# Filter to a specific test
node scripts/evals start --grep "my test name"

# Run directly (services already running)
node scripts/evals run --model <connector-id> --judge <connector-id>
```

## Common Mistakes

- Forgetting the `tag` on `evaluate.describe` -- Scout validates tags at runtime.
- Missing `afterAll` cleanup -- leftover agents/docs pollute subsequent runs.
- Overly large datasets for local iteration -- use `--grep` to target a single `evaluate()` block.
- Importing `evaluate` from `@kbn/evals` when the suite has a custom `src/evaluate.ts` -- you'll miss custom fixtures.
- Using `test` instead of `evaluate` -- the `evaluate` fixture provides all the evals-specific wiring.

## References

- Evaluator type examples with real code: [references/evaluator-patterns.md](references/evaluator-patterns.md)
- Suite scaffolding: use the `evals-create-suite` skill
