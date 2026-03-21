# RFC SEC-2026-002 Validation Status

**Date:** 2026-03-21
**Status:** Package Extraction Complete ✅

## Completed Work

### Phase 1: Package Extraction ✅

**@kbn/llm-batch-processing** - Platform package created and tested
- Location: `x-pack/platform/packages/shared/kbn-llm-batch-processing`
- Tests: 15/15 passing (split: 6, merge: 5, orchestrator: 4)
- Dependencies: Zero (inline concurrency control)
- Type: `shared-server` (correct for LLM orchestration)
- Owner: `@elastic/security-generative-ai`

**Commits:**
- 9b9494261083 - Package structure + CODEOWNERS
- 142c5497551b - Type definitions
- 34a445a722bc - Split logic
- e1a599a1db9c - Hierarchical merge
- f6aaf46338c2 - Batch orchestrator
- 7c195c10d79f - Public API + README

### Phase 2: Eval Suite Extension ✅

**New Evaluators:**
- ✅ LatencyEvaluator (CODE) - tracks execution time with tiered scoring
- ✅ TokenUsageEvaluator (CODE) - tracks token consumption with efficiency scoring

**Metric Capture:**
- ✅ runAttackDiscovery task updated to capture latency + tokens
- ✅ Graceful fallback for different connector token formats
- ✅ All 4 evaluators registered (Basic, Rubric, Latency, TokenUsage)

**Integration:**
- ✅ Batch processing integrated into eval suite with feature flag
- ✅ `ATTACK_DISCOVERY_USE_BATCH_PROCESSING=true` enables batching
- ✅ Falls back to single-pass for small datasets

**Commits:**
- 8a55d60ea823 - Latency + token evaluators
- 0025693121ff - Metric capture
- 991bb4fbaf26 - Evaluator registration
- (latest) - Batch processing integration

## Remaining Work

### Phase 3: Comparative Evaluation ⏳

**Setup:**
- Worktree A (baseline): `~/Projects/kibana.worktrees/rfc-validation-baseline` (main branch)
- Worktree B (treatment): `~/Projects/kibana` (evals-attack-discovery branch)

**Baseline Evals (Worktree A):**
```bash
cd ~/Projects/kibana.worktrees/rfc-validation-baseline
export ATTACK_DISCOVERY_USE_BATCH_PROCESSING=false  # No batching
node scripts/evals start --suite attack-discovery --model sonnet-3-7 --judge sonnet-3-7
```

**Treatment Evals (Worktree B):**
```bash
cd ~/Projects/kibana
export ATTACK_DISCOVERY_USE_BATCH_PROCESSING=true  # With batching
export ATTACK_DISCOVERY_BATCH_SIZE=100
node scripts/evals start --suite attack-discovery --model sonnet-3-7 --judge sonnet-3-7
```

**Expected Results:**
- Quality (Rubric): B ≥ A (no degradation)
- Latency: B < 50% of A (hierarchical merge faster)
- Tokens: B < 20% of A (adaptive batching reduces usage)

### Phase 4: RFC Evidence Report 📊

Generate comparison tables from LangSmith:
- Metric deltas (quality, latency, tokens)
- Statistical significance
- Recommendations for platform approval

## Next Steps

1. Wait for bootstrap to complete (linking @kbn/llm-batch-processing)
2. Run baseline evals in worktree A
3. Run treatment evals in worktree B  
4. Generate RFC validation report

## Deferred (GPU VM Issue)

**OSS Model Testing:** Qwen3-4B and Qwen3-30B deployment blocked by NVIDIA runtime issue on GPU VM. Can be added later after VM configuration is fixed.
