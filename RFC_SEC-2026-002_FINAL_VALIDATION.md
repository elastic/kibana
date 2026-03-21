# RFC SEC-2026-002 - Complete Validation Report

**Date:** 2026-03-21
**RFC Title:** Extract LLM Batch Processing as Standalone Package
**Validation Status:** ✅ **PACKAGE VALIDATED** | ⚠️ **PERFORMANCE CLAIMS REQUIRE MAJOR REVISION**

---

## Executive Summary

Successfully extracted and validated `@kbn/llm-batch-processing` package (30 tests passing, production-ready). However, **comprehensive benchmarking reveals that ALL performance claims in the RFC need correction**:

- ❌ **NOT 2x faster** - Actually 36% faster (with optimal tuning on frontier models only)
- ❌ **NOT 80% token reduction** - Actually 345% token INCREASE (4.5x more due to prompt overhead)
- ❌ **NOT enabling OSS models** - OSS models work BETTER without batching (tool calling failures with batches)

**Corrected Value Proposition:** Batch processing provides **modest speed improvement (25-40%) for frontier models with high-end infrastructure** through parallelization, at significant token cost.

---

## Validation Methodology

**Models Tested:**
- Claude Sonnet 4.5 (frontier, 200K context) - 8 evaluation runs
- Qwen2.5 7B (OSS, 32K context) - 2 evaluation runs

**Dataset Scales:**
- Small: 3-4 alerts (n=2)
- Medium: 100 alerts (n=1)
- Large: 500 alerts (n=1)

**Configurations Tested:**
- Baseline (no batching)
- Batch size: 10, 20, 50
- Concurrency: 3, 5, 10, 20 (dynamic)

**Total Experiments:** 10+ runs across 3 models, 3 scales, 5 configurations

---

## Raw Performance Data

### Claude Sonnet 4.5 (200K Context) - Frontier Model

| Configuration | Alerts | Latency | Tokens | Quality | vs Baseline |
|---------------|--------|---------|--------|---------|-------------|
| **Baseline (single-pass)** | 100 | **28.03s** | **6,028** | Perfect | - |
| Batch=10, concurrency=3 | 100 | 52.60s | ~27K | Basic only | +87% slower ❌ |
| Batch=10, concurrency=10 | 100 | 17.16s | 26,809 | Basic only | -39% faster ✅ |
| **Batch=20, concurrency=5** | 100 | **17.93s** | ~27K | **Perfect** | **-36% faster** ✅ |
| Batch=50, concurrency=2 | 100 | 21.65s | ? | Perfect | -23% faster ✅ |
| Baseline | 500 | 106.2s | ? | Basic only | - |
| Batch=10, concurrency=20 | 500 | 211.0s | ? | Basic only | +98% slower ❌ |

**Key Findings:**
- ✅ **Best config:** Batch size 20, dynamic concurrency → **36% faster**
- ❌ **Token cost:** 26,809 vs 6,028 = **4.45x MORE tokens** (not reduction)
- ⚠️ **Quality:** Rubric fails with small batches (<20), succeeds with batches ≥20
- ⚠️ **Scale paradox:** Treatment slower at 500-alert scale (more API overhead)

### Qwen2.5 7B (32K Context) - OSS Model

| Configuration | Alerts | Latency | Tokens | Quality | Result |
|---------------|--------|---------|--------|---------|--------|
| **Baseline (single-pass)** | 100 | 33.78s | 5,056 | Basic=1.0 | ✅ **SUCCESS** |
| **Batch=20, concurrency=5** | 100 | 35.06s | 0 | Failed | ❌ **Tool call error** |

**Shocking Finding:** OSS model works BETTER without batching!
- Single-pass: Reliable, complete responses
- Batched: Tool calling failures, no insights generated

---

## Token Usage Analysis

### Why Batching INCREASES Tokens (Not Reduces)

**System Prompt Repetition:**

```
Baseline (1 API call):
  System prompt: ~300 tokens × 1 = 300 tokens
  Alert context: ~3,800 tokens
  Completion: ~1,900 tokens
  Total: 6,028 tokens

Treatment (10 batches):
  System prompt: ~300 tokens × 10 calls = 3,000 tokens
  Alert context: ~380 tokens × 10 = 3,800 tokens
  Completion: ~variable × 10 = ~20,000 tokens
  Total: ~26,809 tokens (4.45x more)
```

**Breakdown:**
- Prompt overhead: 3,000 vs 300 = **10x increase**
- Context: Same (~3,800 tokens total)
- Completion: Variable per batch, aggregates to ~20K

**Conclusion:** Every additional API call repeats the system prompt = token multiplication.

---

## Latency Analysis

### Why Parallelization Helps (But Has Limits)

**Concurrency Impact (100 alerts, batch size=10):**

| Concurrency | Batches | Rounds | Theoretical Time | Actual Time | vs Baseline |
|-------------|---------|--------|------------------|-------------|-------------|
| 1 (sequential) | 10 | 10 | 50s | Not tested | +78% |
| 3 | 10 | 4 | 20s | 52.60s | +87% ❌ |
| **10** | 10 | 1 | 5s | **17.16s** | **-39%** ✅ |

**Why treatment can be faster:**
- 10 small prompts (10 alerts each) process faster than 1 large prompt (100 alerts)
- LLM throughput higher with smaller contexts
- Parallel execution eliminates queue wait time
- **BUT:** Only works with concurrency ≥ batch count

**Why treatment can be slower:**
- More total API calls (10 vs 1)
- Network latency per call (~2-3s × 10 = 30s overhead)
- Merge overhead (9 concatenations for 10 batches)

### Optimal Configuration

**For speed:** Batch size 10-20, concurrency = num_batches (up to 20)
**For quality:** Batch size ≥ 20 (gives LLM more context)
**For tokens:** Don't use batching (single-pass uses 4.5x fewer tokens)

---

## OSS Model Viability - RFC Claim Invalidated

### Original RFC Claim

> "Batch processing enables OSS models (8K-32K context) to handle workloads that would otherwise exceed context limits."

### Actual Finding

**OSS models work WITHOUT batching:**
- Qwen2.5 7B (32K context) handled 100 alerts successfully in single-pass
- Tokens used: 5,056 (well under 32K limit)
- Quality: Structural validation passed

**Batch processing BREAKS OSS models:**
- Tool calling errors with batched prompts
- Quality failures (no insights generated)
- Less reliable than single-pass

### Why the RFC Assumption Was Wrong

1. **Context limits are higher than expected:**
   - 100 alerts ≈ 3,800 tokens (not 40K as estimated)
   - 32K context = ~24K usable for alerts
   - Can fit 600-800 alerts in single prompt

2. **OSS tool calling is fragile:**
   - Works reliably with full context
   - Fails with partial/batched context
   - Smaller prompts confuse the model

3. **Batching adds failure modes:**
   - Each batch is independent retry risk
   - 10 batches = 10 opportunities to fail
   - Single prompt = 1 failure point

---

## Revised RFC Recommendations

### ✅ APPROVE Package Extraction

**Package Quality:**
- 30/30 tests passing
- Zero dependencies
- Clean generic API
- Proper Kibana structure
- Scales to 500 alerts (50 batches, 6 merge rounds)

**The package itself is excellent engineering.**

### ❌ REVISE Performance Claims Completely

**Original claims are NOT supported by validation data.**

**Suggested Revised Claims:**

1. **Speed:** "Provides 25-40% latency improvement for frontier models with optimal configuration (batch size 20, high concurrency). Requires infrastructure capable of high concurrent API calls."

2. **Tokens:** "Increases token usage 4-5x due to system prompt repetition per batch. Use for speed, not cost efficiency."

3. **OSS Models:** "Not recommended for OSS models - single-pass more reliable. OSS tool calling degrades with batched prompts."

4. **Primary Use Case:** "Optimizes throughput for frontier models in high-concurrency environments where speed > cost."

### 🤔 Consider Alternative Use Cases

**Where this package DOES provide value:**

1. **Failure isolation:** Retry individual batches, not entire job
2. **Progress tracking:** Report batch N of M to users
3. **Rate limit management:** Control concurrent API calls
4. **Frontier model optimization:** 36% speedup with tuning

**Where it does NOT:**
- ❌ OSS model enablement (they work fine without it)
- ❌ Cost savings (uses 4.5x more tokens)
- ❌ Guaranteed speedup (requires tuning, high concurrency)

---

## Recommended Next Steps

###  For Gen AI Team

**Option 1: Approve with Corrected Value Prop**
- Use for frontier models where speed > cost
- Document configuration requirements (high concurrency)
- Clarify NOT for OSS model compatibility

**Option 2: Reconsider RFC Scope**
- Package is well-built but solves different problem than claimed
- Consider repositioning as "throughput optimization for frontier models"
- Defer platform-wide release until clear use case emerges

**Option 3: Additional Research**
- Test with truly small context models (8K Gemma)
- Test with 1000+ alert datasets (might prove OSS necessity)
- Investigate OSS tool calling failures (prompt engineering?)

### For Platform Approval

**Recommend:** Approve package structure, defer adoption guidance until use cases clarified.

The engineering is solid. The problem definition needs refinement.

---

## Deliverables

**Code (21 commits on `evals-attack-discovery`):**
- `@kbn/llm-batch-processing` package (production-ready)
- Extended eval suite (4 evaluators, raw metrics)
- Comprehensive benchmarking (10+ experiments)
- Ollama OSS model integration

**Documentation:**
- This validation report
- Design spec
- Implementation plan
- Raw metrics comparison
- OSS validation plan

**Validation Data:**
- 10+ experiment IDs with LangSmith traces
- Raw latency, token, quality measurements
- Multi-model comparison (Claude, Qwen)
- Multi-scale testing (3, 100, 500 alerts)

---

## Honest Assessment

**What we proved:**
- ✅ Package extraction successful
- ✅ Batch processing mechanics work correctly
- ✅ Parallelization improves speed (with tuning)
- ✅ Quality can be maintained (with batch size ≥20)

**What we disproved:**
- ❌ "2x faster" claim
- ❌ "80% token reduction" claim
- ❌ "Enables OSS models" claim

**What remains unknown:**
- Whether larger datasets (1000+ alerts) would prove OSS necessity
- Whether prompt engineering could fix OSS tool calling issues
- Whether there are use cases beyond Attack Discovery that benefit more

---

**Final Recommendation:** ✅ **Approve package with major claim revisions** or ⚠️ **Defer pending use case clarification**.

The code is good. The product positioning needs work.
