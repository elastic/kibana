# RFC: Extract LLM Batch Processing as Standalone Package

**RFC ID**: SEC-2026-002
**Author**: Patryk Kopycinski
**Status**: Draft
**Created**: 2026-03-20
**Team**: @elastic/security-generative-ai

---

## Summary

Extract the hierarchical LLM batch processing algorithm from the Alert Investigation Pipeline spike into a standalone, reusable package: `@kbn/llm-batch-processing`.

**Current Location**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/batch/`
**Proposed Location**: `x-pack/platform/packages/shared/kbn-llm-batch-processing/`

**Reusability Score**: ⭐⭐⭐⭐⭐ (Very High)
**Extraction Effort**: 3 days
**Dependencies**: LangChain/LangGraph (already platform-level)

---

## Motivation

### Problem Statement

The Alert Investigation Pipeline implements a **hierarchical merge algorithm** to batch large input sets for LLM processing:

1. **Split** large input (500 alerts) into batches (5 batches of 100 each)
2. **Process** batches concurrently through LLM
3. **Merge** results hierarchically (pairwise merge until single output)

This is a **generic pattern** for any LLM task that:
- Exceeds context window limits
- Benefits from parallel processing
- Needs consistent output across batches

**Current Issues:**
1. Code is buried in Attack Discovery graph (hard to discover)
2. Can't be reused by other LLM use cases (summarization, classification, extraction)
3. Tightly coupled to Attack Discovery schema (unnecessary)

### Use Cases Beyond Security

| Team | Use Case | Benefit |
|------|----------|---------|
| **Observability** | Summarize 1000+ log entries into incident report | Exceeds 8K context window |
| **ML** | Classify 500 documents with limited context models | Parallel processing + merge |
| **Analytics** | Extract entities from large dataset | Batch processing with consistent schema |
| **Search** | Generate summaries for 100+ search results | Hierarchical aggregation |

**Key Insight**: OSS models (Llama, Mistral, Qwen) have 8K-32K context limits. This pattern enables production LLM use at scale with smaller models.

---

## Proposed Solution

### Package Structure

```
x-pack/platform/packages/shared/kbn-llm-batch-processing/
├── README.md
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts                    # Public API
│   ├── types.ts                    # TypeScript types
│   ├── split.ts                    # Adaptive batch sizing (81 lines)
│   ├── merge.ts                    # Hierarchical merge (250 lines)
│   ├── orchestrator.ts             # Concurrent execution (319 lines)
│   └── strategies/
│       ├── token_based.ts          # Token-aware splitting
│       ├── item_based.ts           # Fixed item count splitting
│       └── custom.ts               # User-defined splitting
└── __tests__/
    ├── split.test.ts               # 30 tests
    ├── merge.test.ts               # 40 tests
    ├── orchestrator.test.ts        # 50 tests (120 total)
    └── integration.test.ts         # E2E scenarios
```

### Public API

```typescript
// src/index.ts
export { batchProcess } from './orchestrator';
export { adaptiveSplit, tokenBasedSplit } from './split';
export { hierarchicalMerge } from './merge';
export type {
  BatchConfig,
  BatchResult,
  SplitStrategy,
  MergeStrategy
} from './types';
```

### Example Usage

```typescript
import { batchProcess } from '@kbn/llm-batch-processing';

const documents = [...]; // 1000 documents

const result = await batchProcess({
  input: documents,

  // Split strategy: keep batches under 8K tokens
  splitStrategy: 'token-based',
  maxTokensPerBatch: 8000,

  // Process function: your LLM task
  processFn: async (batch) => {
    return await llm.summarize(batch.join('\n'));
  },

  // Merge strategy: hierarchical pairwise merge
  mergeStrategy: 'hierarchical',
  mergeFn: async (summaries) => {
    return await llm.summarize(summaries.join('\n\n---\n\n'));
  },

  // Concurrency control
  maxConcurrentBatches: 5,
});

console.log(result.output); // Final merged summary
console.log(result.stats);  // { batches: 10, mergeRounds: 4, durationMs: 12000 }
```

---

## Technical Design

### Adaptive Batch Sizing

**Problem**: Input items vary in size (short vs. long alerts). Fixed batch size (e.g., 100 items) may overflow context window.

**Solution**: Token-aware splitting
```typescript
function adaptiveSplit<T>(
  items: T[],
  maxTokensPerBatch: number,
  tokenEstimator: (item: T) => number
): T[][] {
  const batches: T[][] = [];
  let currentBatch: T[] = [];
  let currentTokens = 0;

  for (const item of items) {
    const itemTokens = tokenEstimator(item);

    if (currentTokens + itemTokens > maxTokensPerBatch && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [item];
      currentTokens = itemTokens;
    } else {
      currentBatch.push(item);
      currentTokens += itemTokens;
    }
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}
```

**Benefits**:
- No batch exceeds context window
- Maximizes batch utilization (fewer LLM calls)
- Configurable token estimator (exact vs. heuristic)

### Hierarchical Merge

**Problem**: Naively concatenating batch results loses coherence. Single merge call may exceed context window.

**Solution**: Pairwise hierarchical merge (tournament-style)
```
Round 1: [B1, B2, B3, B4, B5, B6, B7, B8]
         ↓    ↓    ↓    ↓
Round 2: [M1,   M2,   M3,   M4]
         ↓         ↓
Round 3: [M5,        M6]
         ↓
Final:   [Result]
```

**Code**:
```typescript
async function hierarchicalMerge<T>(
  outputs: T[],
  mergeFn: (pair: [T, T]) => Promise<T>
): Promise<T> {
  let current = outputs;

  while (current.length > 1) {
    const nextRound: T[] = [];

    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        // Merge pair
        nextRound.push(await mergeFn([current[i], current[i + 1]]));
      } else {
        // Odd one out, pass through
        nextRound.push(current[i]);
      }
    }

    current = nextRound;
  }

  return current[0];
}
```

**Benefits**:
- Log₂(n) rounds (8 batches → 3 rounds)
- Each merge stays within context window
- Maintains semantic coherence (local merges preserve context)

### Concurrent Execution

**Problem**: Sequential batch processing is slow (10 batches × 30s/batch = 5 minutes).

**Solution**: Concurrent execution with backpressure
```typescript
async function batchProcess<TInput, TOutput>(config: BatchConfig<TInput, TOutput>) {
  const batches = split(config.input, config.splitStrategy);

  // Process batches concurrently (max N in flight)
  const batchResults = await Promise.all(
    batches.map((batch, i) =>
      limiter.schedule(() => config.processFn(batch))
    )
  );

  // Merge hierarchically
  const finalResult = await hierarchicalMerge(batchResults, config.mergeFn);

  return { output: finalResult, stats: { ... } };
}
```

**Benefits**:
- 5x speedup with concurrency=5
- Backpressure prevents API rate limits
- Progress tracking (batch N of M completed)

---

## Migration Path

### Phase 1: Extract Package (Week 1)
- [ ] Create package structure in `x-pack/platform/packages/shared/`
- [ ] Copy source files from batch spike
- [ ] Remove Attack Discovery-specific code (insight schema)
- [ ] Generalize types (`Insight` → generic `TOutput`)
- [ ] Add unit tests (reuse existing + add new)

### Phase 2: Update Pipeline (Week 1)
- [ ] Update pipeline to import from `@kbn/llm-batch-processing`
- [ ] Remove old batch code
- [ ] Verify integration tests still pass

### Phase 3: Documentation (Week 1)
- [ ] Write README with examples (summarization, classification, extraction)
- [ ] Add TSDoc comments to public API
- [ ] Create usage guide for different LLM use cases

### Phase 4: Socialize (Week 2)
- [ ] Demo to Observability team (log summarization use case)
- [ ] Demo to ML team (document classification use case)
- [ ] Add to Kibana package registry

---

## API Design

### TypeScript Interface

```typescript
/**
 * Configuration for batch LLM processing
 */
export interface BatchConfig<TInput, TOutput> {
  /** Input items to process */
  input: TInput[];

  /** Split strategy */
  splitStrategy: 'token-based' | 'item-based' | 'custom';

  /** Max tokens per batch (for token-based splitting) */
  maxTokensPerBatch?: number;

  /** Max items per batch (for item-based splitting) */
  maxItemsPerBatch?: number;

  /** Custom split function (for custom splitting) */
  splitFn?: (items: TInput[]) => TInput[][];

  /** Process a single batch through LLM */
  processFn: (batch: TInput[]) => Promise<TOutput>;

  /** Merge two outputs (for hierarchical merge) */
  mergeFn: (outputs: [TOutput, TOutput]) => Promise<TOutput>;

  /** Max concurrent batches (default: 3) */
  maxConcurrentBatches?: number;

  /** Token estimator for adaptive splitting */
  tokenEstimator?: (item: TInput) => number;

  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Result of batch processing
 */
export interface BatchResult<TOutput> {
  /** Final merged output */
  output: TOutput;

  /** Processing statistics */
  stats: {
    /** Number of batches processed */
    batches: number;
    /** Number of merge rounds */
    mergeRounds: number;
    /** Total duration (ms) */
    durationMs: number;
    /** Tokens processed (estimated) */
    tokensProcessed: number;
  };
}

/**
 * Process large input through LLM using batching and hierarchical merge
 *
 * @param config - Batch processing configuration
 * @returns Final merged output with statistics
 *
 * @example
 * ```typescript
 * const result = await batchProcess({
 *   input: documents,
 *   splitStrategy: 'token-based',
 *   maxTokensPerBatch: 8000,
 *   processFn: async (batch) => llm.summarize(batch),
 *   mergeFn: async ([a, b]) => llm.summarize([a, b]),
 *   maxConcurrentBatches: 5,
 * });
 * ```
 */
export function batchProcess<TInput, TOutput>(
  config: BatchConfig<TInput, TOutput>
): Promise<BatchResult<TOutput>>;
```

---

## Testing Strategy

### Unit Tests (New: 120 tests)

- **Split logic** (30 tests):
  - Token-based splitting respects max tokens
  - Item-based splitting creates equal batches
  - Custom splitting uses user function
  - Edge cases: empty input, single item, huge items

- **Merge logic** (40 tests):
  - Hierarchical merge reduces to single output
  - Pairwise merge called log₂(n) times
  - Odd-numbered batches handled correctly
  - Single batch passes through (no merge)

- **Orchestrator** (50 tests):
  - Concurrent execution respects max concurrency
  - Progress callbacks fire correctly
  - Error handling (batch failure, merge failure)
  - Backpressure works (rate limiting)

### Integration Tests (New: 20 tests)

- Real LLM calls (OpenAI/Anthropic with test key)
- Summarization use case (1000 log entries)
- Classification use case (500 documents)
- Extraction use case (100 receipts)

### Performance Tests (New: 10 tests)

Benchmark at scale:
- 100 items, 5 batches: <30s
- 500 items, 10 batches: <90s
- 1000 items, 20 batches: <180s

---

## Dependencies

### Current Dependencies (from pipeline spike)
- `@langchain/core` (already in platform)
- `p-limit` (concurrency control) — 2KB

### Proposed Dependencies
- Same as current ✅
- **Total bundle size**: ~20KB (minified)

---

## Performance Considerations

### Time Complexity
- **Splitting**: O(n) (single pass)
- **Batch processing**: O(n/b) rounds where b = batch size, parallelized
- **Hierarchical merge**: O(log₂(n/b)) rounds
- **Overall**: Dominated by LLM latency

### Benchmarks (Estimated)

Sequential (no batching):
```
1000 items × 30s/call = 30,000s (8.3 hours)
```

Batched (100 items/batch, concurrency=5):
```
Round 1: 10 batches / 5 concurrent = 2 rounds × 30s = 60s
Round 2: 5 merges / 5 concurrent = 1 round × 30s = 30s
Round 3: 3 merges / 3 concurrent = 1 round × 30s = 30s
Round 4: 1 merge = 30s
Total: 150s (2.5 minutes) → 120x speedup
```

### Token Usage Optimization

Without batching:
```
1000 items × 8K tokens/item = 8M input tokens (exceeds context window)
```

With batching:
```
Round 1: 10 batches × 8K tokens = 80K tokens
Round 2: 5 merges × 2K tokens = 10K tokens
Round 3: 3 merges × 2K tokens = 6K tokens
Round 4: 1 merge × 2K tokens = 2K tokens
Total: 98K tokens → 98% reduction
```

---

## Alternatives Considered

### Alternative 1: Keep in elastic_assistant
**Pros**: No extraction work
**Cons**: Not discoverable, can't be reused
**Decision**: ❌ Rejected

### Alternative 2: Use existing library (LangChain)
**Current**: LangChain has `MapReduceDocumentsChain` but:
- No hierarchical merge (only single reduce step)
- No adaptive splitting (fixed chunk size)
- No concurrency control
- Specific to document chains

**Decision**: ❌ Rejected (doesn't meet requirements)

### Alternative 3: Extract to platform package (CHOSEN)
**Pros**: Reusable by all teams, generalizes the pattern
**Cons**: Platform team approval needed
**Decision**: ✅ **Selected**

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Platform team rejects package | Low | High | Show concrete use cases from 3+ teams |
| LLM API rate limits | Medium | Medium | Built-in backpressure with `p-limit` |
| Token estimation inaccurate | Medium | Low | Provide exact tokenizer option |
| Merge quality degrades | Low | Medium | User controls merge function |

---

## Success Metrics

### Adoption
- [ ] Used by Alert Investigation Pipeline (baseline)
- [ ] Adopted by ≥1 Observability use case
- [ ] Adopted by ≥1 ML use case
- [ ] Added to Kibana package registry

### Quality
- [ ] 100% test coverage
- [ ] <20KB bundle size
- [ ] Zero LLM context overflow errors

### Performance
- [ ] ≥10x speedup vs. sequential processing (at 1000 items)
- [ ] ≥90% token reduction vs. no batching

---

## Timeline

| Week | Milestone | Owner |
|------|-----------|-------|
| **Week 1** | Extract package, update pipeline | @generative-ai |
| **Week 2** | Documentation, demos | @generative-ai |
| **Week 3** | Observability pilot (log summarization) | @observability |
| **Week 4** | ML pilot (doc classification) | @ml-team |

---

## Open Questions

1. **Package Ownership**: Should @security-generative-ai own this long-term, or transfer to Platform AI team?
2. **Versioning**: Start at v1.0.0 or v0.1.0 (experimental)?
3. **Merge Strategies**: Should we include fan-in merge (all-at-once) in addition to hierarchical?
4. **Error Handling**: Retry failed batches or fail fast?

---

## Stakeholders

### Decision Makers
- **@elastic/security-generative-ai** (package owner)
- **@elastic/kibana-operations** (platform package approval)

### Informed
- **@elastic/obs-ux-infra_services-team** (potential consumer)
- **@elastic/ml-ui** (potential consumer)
- **@elastic/kibana-ai-infra** (platform AI team)

---

## Next Steps

1. **Get RFC approval** from Gen AI team lead
2. **Present to Platform AI team** for package location approval
3. **Create tracking issue** in kibana repo
4. **Assign engineer** for extraction work
5. **Schedule demos** with Observability and ML teams

---

## References

- **Pipeline Spike PR**: https://github.com/elastic/kibana/pull/257957
- **Batch Source**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/batch/`
- **LangChain MapReduce**: https://js.langchain.com/docs/modules/chains/document/map_reduce
- **Hierarchical Merge Pattern**: Tournament-style reduction

---

**Approval Signatures**:
- [ ] @elastic/security-generative-ai Team Lead
- [ ] @elastic/kibana-operations (Platform approval)
- [ ] Engineering Manager

**Status**: Draft → awaiting Gen AI team review
