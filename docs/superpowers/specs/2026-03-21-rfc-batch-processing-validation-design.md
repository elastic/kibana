# RFC Validation System for LLM Batch Processing

**Date:** 2026-03-21
**Author:** Patryk Kopycinski
**Team:** @elastic/security-generative-ai
**Status:** Approved
**Related RFC:** [SEC-2026-002] Extract LLM Batch Processing as Standalone Package
**Related PRs:** #257957 (spike), #257007 (eval suite)

---

## Executive Summary

Design for a comprehensive evaluation system to validate the RFC proposing extraction of the hierarchical LLM batch processing algorithm from Attack Discovery into a reusable platform package `@kbn/llm-batch-processing`.

**Validation Approach:** Two-worktree comparison (baseline vs treatment) testing all 4 RFC success metrics: quality, latency, token efficiency, and OSS model viability.

**Timeline:** 5-6 days
**Success Criteria:** Quality maintained, latency reduced by 50%+, tokens reduced by 80%+, OSS models (8K-32K context) succeed

---

## Background

### Problem Statement

The Alert Investigation Pipeline spike (PR #257957) implements a hierarchical merge algorithm for batch processing large alert sets through LLMs:
1. Split 500 alerts into batches of 100
2. Process batches concurrently through LLM
3. Merge results hierarchically (pairwise until single output)

This pattern is **generic and reusable** beyond Attack Discovery:
- Any LLM task exceeding context window limits
- Any workload benefiting from parallel processing
- Any scenario needing consistent output across batches

**Current Issue:** Code is buried in Attack Discovery graph, tightly coupled to AD schema, undiscoverable by other teams.

**RFC Proposal:** Extract to `@kbn/llm-batch-processing` for platform-wide reuse.

### Success Metrics

| Metric | Definition | How Validated |
|--------|------------|---------------|
| **Quality** | Attack Discovery insights maintain accuracy/completeness | Existing evaluators (Basic + Rubric) pass in both baseline & treatment |
| **Latency** | End-to-end execution time reduces significantly | New LatencyEvaluator shows treatment < 50% of baseline |
| **Token Efficiency** | Input/output tokens consumed reduces via smart batching | New TokenUsageEvaluator shows treatment < 20% of baseline |
| **OSS Viability** | Small context models (8K-32K) can handle workloads | Qwen3-4B, Qwen3-30B succeed in treatment, fail/degrade in baseline |

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    RFC Validation System                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Foundation Setup                                      │
│  ├─ Create worktree A (baseline): main branch                   │
│  ├─ Create worktree B (treatment): evals-attack-discovery       │
│  ├─ Extract @kbn/llm-batch-processing package                   │
│  └─ Deploy OSS models (Qwen3-4B, Qwen3-30B) via VLLM           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Extend Eval Suite (in worktree B)                    │
│  ├─ Add LatencyEvaluator (CODE)                                │
│  ├─ Add TokenUsageEvaluator (CODE)                             │
│  ├─ Modify runAttackDiscovery task to capture metrics          │
│  └─ Add OSS model connectors to kibana.dev.yml                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Integrate Batch Package (in worktree B)              │
│  ├─ Update AD graph to use @kbn/llm-batch-processing           │
│  ├─ Replace inline batch code with package imports             │
│  └─ Run unit tests to validate integration                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Run Comparative Evals                                │
│  ├─ Worktree A: Frontier models only (GPT-4o, Claude Sonnet)   │
│  ├─ Worktree B: Frontier + OSS (GPT-4o, Sonnet, Qwen3-4B/30B) │
│  └─ Same dataset: eval_dataset_attack_discovery_all_scenarios  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Analysis & RFC Evidence                              │
│  ├─ LangSmith trace comparison (A vs B)                        │
│  ├─ Generate metric comparison tables                          │
│  ├─ OSS viability analysis (context overflow in A, success in B)│
│  └─ Create RFC validation report                               │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Purpose | Owner |
|-----------|---------|-------|
| **Worktree A (baseline)** | Main branch - current AD without batch processing | Isolated git worktree |
| **Worktree B (treatment)** | evals-attack-discovery branch + @kbn/llm-batch-processing | Isolated git worktree |
| **@kbn/llm-batch-processing** | Extracted reusable package (split, merge, orchestrator) | New package in platform |
| **LatencyEvaluator** | Tracks end-to-end execution time | New CODE evaluator |
| **TokenUsageEvaluator** | Tracks input/output/total tokens | New CODE evaluator |
| **OSS Model Deployment** | VLLM-hosted Qwen models | elastic-llm-benchmarker |
| **LangSmith Integration** | Trace storage and comparison | @kbn/evals framework |

---

## Detailed Design

### 1. Worktree Setup

**Directory Structure:**

```
~/Projects/kibana/                           # Main repo (untouched)
~/Projects/kibana.worktrees/
├── rfc-validation-baseline/                 # Worktree A (baseline)
│   ├── .git                                 # Points to main branch
│   ├── x-pack/solutions/security/plugins/elastic_assistant/
│   │   └── server/lib/attack_discovery/
│   │       └── graphs/default_attack_discovery_graph/
│   │           └── batch/                   # Inline batch code (original)
│   └── config/kibana.dev.yml                # Frontier models only
│
└── rfc-validation-treatment/                # Worktree B (treatment)
    ├── .git                                 # Points to evals-attack-discovery branch
    ├── x-pack/platform/packages/shared/
    │   └── kbn-llm-batch-processing/        # NEW: Extracted package
    │       ├── src/
    │       │   ├── split.ts
    │       │   ├── merge.ts
    │       │   ├── orchestrator.ts
    │       │   └── index.ts
    │       └── package.json
    ├── x-pack/solutions/security/plugins/elastic_assistant/
    │   └── server/lib/attack_discovery/
    │       └── graphs/default_attack_discovery_graph/
    │           └── batch/                   # MODIFIED: Uses @kbn/llm-batch-processing
    ├── x-pack/solutions/security/packages/
    │   └── kbn-evals-suite-attack-discovery/ # Extended with new evaluators
    │       └── src/evaluators/
    │           ├── latency_evaluator.ts     # NEW
    │           └── token_usage_evaluator.ts # NEW
    └── config/kibana.dev.yml                # Frontier + OSS models
```

**Branch Strategy:**

| Worktree | Branch | Starting Point | Purpose |
|----------|--------|----------------|---------|
| **A (baseline)** | `main` | Current HEAD | Clean baseline - no batch processing improvements |
| **B (treatment)** | `evals-attack-discovery` | PR #257007 | Eval suite + batch package + new evaluators |

**Setup Commands:**

```bash
# Create baseline worktree (main branch)
git worktree add ~/Projects/kibana.worktrees/rfc-validation-baseline main

# Treatment worktree already exists (current checkout on evals-attack-discovery)

# Bootstrap both worktrees
cd ~/Projects/kibana.worktrees/rfc-validation-baseline && yarn kbn bootstrap
cd ~/Projects/kibana && yarn kbn bootstrap
```

**Dataset Consistency:**

Use local JSONL file to ensure identical dataset across both worktrees:

```bash
# Copy dataset to shared location
cp x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/data/eval_dataset_attack_discovery_all_scenarios.jsonl \
   ~/datasets/attack_discovery_eval.jsonl

# Set env var in both worktrees
export ATTACK_DISCOVERY_DATASET_JSONL_PATH=~/datasets/attack_discovery_eval.jsonl
```

---

### 2. Package Extraction - @kbn/llm-batch-processing

**Package Location:**

`x-pack/platform/packages/shared/kbn-llm-batch-processing/`

**Directory Structure:**

```
kbn-llm-batch-processing/
├── README.md                        # Usage examples, API docs
├── package.json                     # NO dependencies (zero deps approach)
├── tsconfig.json                    # Inherits from platform base
├── jest.config.js                   # Unit test configuration
├── kibana.jsonc                     # Package metadata
├── src/
│   ├── index.ts                     # Public API exports
│   ├── types.ts                     # TypeScript interfaces
│   ├── split.ts                     # Adaptive batch sizing (81 lines)
│   ├── merge.ts                     # Hierarchical merge (250 lines)
│   ├── orchestrator.ts              # Concurrent execution (319 lines)
│   └── strategies/
│       ├── token_based.ts           # Token-aware splitting
│       ├── item_based.ts            # Fixed item count splitting
│       └── custom.ts                # User-defined splitting
└── __tests__/
    ├── split.test.ts                # 30 tests
    ├── merge.test.ts                # 40 tests
    ├── orchestrator.test.ts         # 50 tests
    └── integration.test.ts          # E2E scenarios
```

**Public API (src/index.ts):**

```typescript
// Main entry point - orchestrates entire batch workflow
export { batchProcess } from './orchestrator';

// Low-level utilities - for advanced use cases
export { adaptiveSplit, tokenBasedSplit } from './split';
export { hierarchicalMerge } from './merge';

// Types - for strong typing in consumers
export type {
  BatchConfig,
  BatchResult,
  SplitStrategy,
  MergeStrategy,
  BatchStats,
} from './types';
```

**Core Types (src/types.ts):**

```typescript
export interface BatchConfig<TInput, TOutput> {
  input: TInput[];
  splitStrategy: 'token-based' | 'item-based' | 'custom';
  maxTokensPerBatch?: number;
  maxItemsPerBatch?: number;
  splitFn?: (items: TInput[]) => TInput[][];
  processFn: (batch: TInput[]) => Promise<TOutput>;
  mergeFn: (outputs: [TOutput, TOutput]) => Promise<TOutput>;
  maxConcurrentBatches?: number;
  tokenEstimator?: (item: TInput) => number;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchResult<TOutput> {
  output: TOutput;
  stats: BatchStats;
}

export interface BatchStats {
  batches: number;
  mergeRounds: number;
  durationMs: number;
  tokensProcessed: number;
}
```

**Extraction Source:**

**Pre-Flight Verification Required:** Before extraction, verify the batch processing code location in PR #257957 or the spike implementation. The RFC references batch code in:
- `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/batch/`

If files don't exist at this path, locate the actual batch implementation via:
```bash
git fetch upstream pull/257957/head:pr-257957
git checkout pr-257957
find . -name "*batch*" -path "*/attack_discovery/*" -type f
```

Once verified, extract the following components (typical names):
- `split.ts` or equivalent → `src/split.ts`
- `merge.ts` or equivalent → `src/merge.ts`
- `orchestrator.ts` or equivalent → `src/orchestrator.ts`

**Key Changes During Extraction:**

1. Remove Attack Discovery coupling (replace `Insight` with generic `TOutput`)
2. Add strategy pattern for pluggable split/merge
3. Export clean API with `batchProcess()` as main entry
4. Implement inline concurrency control (no `p-limit` dependency)
5. Add comprehensive unit + integration tests

**Dependencies:** Zero external dependencies (inline concurrency control)

---

### 3. Metric Evaluators

**3.1) LatencyEvaluator**

Location: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/latency_evaluator.ts`

**Interface:**

```typescript
export interface LatencyMetadata {
  startTime: number;
  endTime: number;
  durationMs: number;
}
```

**Scoring Logic:**
- Sub-10s → score 1.0
- 10-30s → score 0.5
- >30s → score 0.2

**3.2) TokenUsageEvaluator**

Location: `x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/src/evaluators/token_usage_evaluator.ts`

**Interface:**

```typescript
export interface TokenUsageMetadata {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

**Scoring Logic:**
- <50K tokens → score 1.0
- 50-100K → score 0.7
- >100K → score 0.3

**3.3) Task Modification**

Update `src/task/run_attack_discovery.ts` to:
1. Capture `startTime` before AD execution
2. Capture `endTime` after completion
3. Extract token usage from inference response (`result.usage`)
4. Return metrics in `output.metadata`

---

### 4. OSS Model Deployment

**Models to Deploy:**

1. **Qwen/Qwen3-4B-Instruct-2507**
   - Context: 262K tokens
   - ITL: 3.2ms
   - Tool calling: 100%
   - Represents minimum viable OSS model

2. **Qwen/Qwen3-30B-A3B-Instruct**
   - Context: 262K tokens
   - ITL: 6.5ms
   - Tool calling: 100%
   - Larger model for quality ceiling comparison

**Deployment Method:**

Use `llm-benchmarker` skill to:
1. Deploy VLLM on GCP (2x A100 40GB)
2. Load models with OpenAI-compatible API
3. Generate connector configs

**Connector Configuration (kibana.dev.yml in Worktree B):**

```yaml
xpack.actions.preconfigured:
  qwen3-4b-vllm:
    actionTypeId: .gen-ai
    name: Qwen3-4B (VLLM)
    config:
      apiUrl: 'http://<vllm-endpoint>:8000/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: Qwen/Qwen3-4B-Instruct-2507
    secrets:
      apiKey: 'dummy-key'

  qwen3-30b-vllm:
    actionTypeId: .gen-ai
    name: Qwen3-30B (VLLM)
    config:
      apiUrl: 'http://<vllm-endpoint>:8000/v1/chat/completions'
      apiProvider: OpenAI
      defaultModel: Qwen/Qwen3-30B-A3B-Instruct
    secrets:
      apiKey: 'dummy-key'
```

---

### 5. Evaluation Workflow

**Execution Steps:**

```bash
# Phase 1: Setup
git worktree add ~/Projects/kibana.worktrees/rfc-validation-baseline main
cd ~/Projects/kibana.worktrees/rfc-validation-baseline && yarn kbn bootstrap
cd ~/Projects/kibana && yarn kbn bootstrap

# Phase 2: Deploy OSS Models
# Use llm-benchmarker skill to deploy models and update kibana.dev.yml

# Phase 3: Prepare Dataset
export ATTACK_DISCOVERY_DATASET_JSONL_PATH=~/datasets/attack_discovery_eval.jsonl

# Phase 4: Run Baseline Evals (Worktree A)
cd ~/Projects/kibana.worktrees/rfc-validation-baseline
node scripts/evals scout

# Frontier models only
# Suite ID: "attack-discovery" (defined in evals.suites.json)
node scripts/evals run --suite attack-discovery --model sonnet-3-7 --judge sonnet-3-7
node scripts/evals run --suite attack-discovery --model gpt-4o --judge sonnet-3-7

# Expected: Baseline results WITHOUT batch processing optimizations
# - Quality: Should pass (frontier models handle large context)
# - Latency: Will be slower (no hierarchical merge)
# - Tokens: Will be higher (no adaptive batching)

# Phase 5: Run Treatment Evals (Worktree B)
# PREREQUISITE: Phase 3 integration must be complete
# AD graph must be using @kbn/llm-batch-processing
cd ~/Projects/kibana
node scripts/evals scout

# Frontier models (should match baseline quality, improve latency/tokens)
node scripts/evals run --suite attack-discovery --model sonnet-3-7 --judge sonnet-3-7
node scripts/evals run --suite attack-discovery --model gpt-4o --judge sonnet-3-7

# OSS models (should succeed here, fail/degrade in baseline)
node scripts/evals run --suite attack-discovery --model qwen3-4b-vllm --judge sonnet-3-7
node scripts/evals run --suite attack-discovery --model qwen3-30b-vllm --judge sonnet-3-7

# Expected: Treatment results WITH batch processing
# - Quality: Equal or better than baseline
# - Latency: 50%+ faster (hierarchical merge reduces rounds)
# - Tokens: 80%+ reduction (adaptive batching)
# - OSS: Both Qwen models complete successfully
```

---

### 6. LangSmith Integration & Analysis

**Trace Collection:**

`@kbn/evals` framework automatically sends traces to LangSmith with:
- Experiment ID
- Dataset reference
- Model/connector used
- Evaluator scores (Basic, Rubric, Latency, TokenUsage)
- Metadata (timestamps, tokens, errors)

**Comparison Metrics:**

| Metric | Baseline (A) | Treatment (B) | Comparison |
|--------|--------------|---------------|------------|
| **Quality (Rubric)** | Avg score | Avg score | B ≥ A |
| **Latency** | Avg durationMs | Avg durationMs | B < 0.5×A |
| **Tokens** | Avg totalTokens | Avg totalTokens | B < 0.2×A |
| **OSS Pass Rate** | N/A | 100% | Both models succeed |

**Export Results:**

```bash
node scripts/evals compare <baseline-run-id> <treatment-run-id> --output rfc-validation-results.json
```

---

### 7. Success Criteria

**Passing Thresholds:**

| Metric | Baseline (A) | Treatment (B) | Success Criteria |
|--------|--------------|---------------|------------------|
| **Quality (Rubric)** | ≥ 0.9 avg score | ≥ 0.9 avg score | B ≥ A (no degradation) |
| **Latency** | Measured from Run 1 | < 0.5×A | B < 50% of A (2x faster) |
| **Tokens** | Measured from Run 1 | < 0.2×A | B < 20% of A (80% reduction) |
| **OSS Pass Rate** | N/A (not tested) | 100% (both models) | Both Qwen models complete successfully |

**Baseline Establishment:**
- Run baseline evals first (Worktree A with frontier models)
- Extract average `durationMs` and `totalTokens` from LangSmith results
- Use these as X and Y values for success criteria
- If historical data available, validate baselines are within expected range (30-60s latency, 50-100K tokens typical)

**RFC Validation Report:**

Will include:
1. Executive Summary (pass/fail per metric)
2. Detailed Results Tables (A vs B comparison)
3. LangSmith Experiment Links
4. Code Diff (before/after batch integration)
5. Performance Charts (latency, tokens over dataset)
6. Recommendations for Platform Team Approval

---

## Critical Clarifications

### Execution Order Clarification

**IMPORTANT:** Phase execution order ensures treatment worktree is ready before running evals:

1. **Days 1-3**: Setup + Package Extraction + AD Integration (Worktree B only)
   - Worktree B becomes "treatment ready" with @kbn/llm-batch-processing integrated
2. **Day 4**: Run baseline evals (Worktree A - untouched main branch)
3. **Day 5**: Run treatment evals (Worktree B - integrated package)
4. **Day 6**: Analysis

**Validation Checkpoint:** Before Phase 5 (treatment evals), verify in Worktree B:
```bash
# Confirm package exists
ls x-pack/platform/packages/shared/kbn-llm-batch-processing/src/index.ts

# Confirm AD imports package
grep "@kbn/llm-batch-processing" x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/**/*.ts

# Confirm unit tests pass
yarn test:jest x-pack/platform/packages/shared/kbn-llm-batch-processing
```

### Suite ID Specification

The Attack Discovery eval suite is registered in `evals.suites.json` with ID: **`attack-discovery`**

Verify with:
```bash
cat x-pack/platform/packages/shared/kbn-evals/evals.suites.json | jq '.[] | select(.id == "attack-discovery")'
```

If not registered, add to `evals.suites.json`:
```json
{
  "id": "attack-discovery",
  "name": "Attack Discovery",
  "description": "Attack Discovery evaluation suite",
  "package": "x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery",
  "config": "playwright.config.ts"
}
```

### Token Extraction Error Handling

**Problem:** Different connectors return token usage in different formats.

**Solution:** Graceful fallback chain in `run_attack_discovery.ts`:

```typescript
// Try multiple field names (OpenAI, Anthropic, Bedrock formats)
inputTokens =
  result.usage?.input_tokens ??        // Anthropic format
  result.usage?.prompt_tokens ??       // OpenAI format
  result.usage?.inputTokens ??         // Alternative
  0;  // Fallback: no usage data available

outputTokens =
  result.usage?.output_tokens ??       // Anthropic format
  result.usage?.completion_tokens ??   // OpenAI format
  result.usage?.outputTokens ??        // Alternative
  0;  // Fallback: no usage data available

// Log warning if no usage data
if (inputTokens === 0 && outputTokens === 0) {
  log.warning('No token usage data available from connector - TokenUsageEvaluator will report 0');
}
```

**Impact on TokenUsageEvaluator:** If tokens are missing (both = 0), evaluator returns score 0 with `label: 'missing_tokens'`. This is acceptable - we can still compare frontier model runs that DO report tokens.

---

## Implementation Plan

### Phase 1: Foundation Setup (Day 1)
- Create baseline worktree
- Bootstrap both worktrees
- Prepare shared dataset location

### Phase 2: Package Extraction (Days 1-2)
- Create `@kbn/llm-batch-processing` package structure
- Extract code from PR #257957
- Remove AD coupling, add generics
- Implement inline concurrency control
- Add unit tests (120 total)

### Phase 3: Extend Eval Suite (Day 2)
- Add `LatencyEvaluator`
- Add `TokenUsageEvaluator`
- Modify `runAttackDiscovery` task to capture metrics
- Update `evaluate_dataset.ts` to include new evaluators

### Phase 4: OSS Model Deployment (Day 3)
- Use `llm-benchmarker` skill to deploy Qwen3-4B and Qwen3-30B
- Update `kibana.dev.yml` in treatment worktree
- Test connectivity to VLLM endpoints

### Phase 5: AD Integration (Day 3)
- Update AD graph in treatment worktree to use `@kbn/llm-batch-processing`
- Replace inline batch code with package imports
- Run unit tests to validate integration

### Phase 6: Run Evals (Days 4-5)
- Run baseline evals in worktree A (frontier models only)
- Run treatment evals in worktree B (frontier + OSS)
- Monitor progress, debug failures

### Phase 7: Analysis & Report (Day 6)
- Export results from LangSmith
- Generate comparison tables
- Create RFC validation report
- Present to Gen AI team

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OSS models fail in treatment too | Low | High | Test connectivity first, verify context limits |
| Latency improvement < 50% | Medium | Medium | Acceptable if >25% improvement + token reduction proven |
| Token tracking inaccurate | Low | Medium | Validate against LLM provider usage API |
| Worktree bootstrap fails | Low | Low | Use sparse-checkout if needed, fallback to branch switching |
| Dataset drift between runs | Low | High | Use local JSONL, version control dataset file |

---

## Deliverables

1. **@kbn/llm-batch-processing package** - Extracted, tested, documented
2. **Extended eval suite** - PR #257007 + latency/token evaluators
3. **OSS model deployment** - VLLM with Qwen3-4B and Qwen3-30B
4. **Evaluation results** - LangSmith experiments for baseline and treatment
5. **RFC validation report** - Markdown document with performance data, charts, recommendations

---

## Timeline

**Total Duration:** 5-6 days

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Foundation + Package Extraction | Worktrees set up, package structure created |
| 2 | Package Testing + Evaluators | Unit tests pass, new evaluators added |
| 3 | OSS Deployment + Integration | Models deployed, AD using package |
| 4 | Baseline Evals | Worktree A results in LangSmith |
| 5 | Treatment Evals | Worktree B results in LangSmith |
| 6 | Analysis & Report | RFC validation report complete |

---

## Next Steps

1. **Get design approval** ✓ (Done)
2. **Create implementation plan** - Break down into executable tasks
3. **Execute phases 1-7** - Follow timeline above
4. **Present results** - Gen AI team review + Platform team approval
5. **Merge to main** - PR #257007 + package extraction PR

---

## Appendices

### A. Model Selection Rationale

**Qwen3-4B-Instruct-2507:**
- Fastest approved model (3.2ms ITL)
- 100% tool calling success
- 262K context window
- Represents minimum viable OSS model for production

**Qwen3-30B-A3B-Instruct:**
- Mid-size model for quality comparison
- 6.5ms ITL (still fast)
- 100% tool calling success
- Tests scaling hypothesis (larger model = better quality)

**Frontier Models (GPT-4o, Claude Sonnet):**
- Baseline quality reference
- Already configured in kibana.dev.yml
- No deployment needed

### B. Evaluator Design Rationale

**Why CODE evaluators vs LLM evaluators:**
- Latency and token usage are **deterministic metrics**
- No need for LLM-as-judge (adds latency, cost, variability)
- CODE evaluators run instantly, no API calls

**Scoring Thresholds:**
- Chosen to distinguish between "fast/efficient" vs "slow/wasteful"
- Allows for comparative analysis across experiments
- Non-binary scores enable nuanced comparison

### C. Worktree vs Feature Flag

**Why worktrees instead of feature flag:**
- Cleaner comparison (no code churn in production AD graph)
- Validates **package extraction** (RFC goal, not just batch processing)
- Easier to demo (two independent Kibana instances)
- No risk of flag leaking to production

**Tradeoff:**
- More setup complexity (2 environments)
- Longer timeline (package extraction required)
- **Benefit:** Stronger RFC evidence, reusable package for other teams
