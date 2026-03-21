---
name: rfc-validator
description: Comprehensive RFC validation with benchmarking, alternative analysis, and honest recommendations. Use when validating RFCs, architectural proposals, or performance claims requiring empirical evidence.
---

# RFC Validator

Systematically validate RFC claims through implementation, benchmarking, and analysis. Provides honest assessment of claims vs reality, explores alternatives, and delivers actionable recommendations.

## When to Use

- User has an RFC document proposing a solution
- Claims require empirical validation (performance, scalability, compatibility)
- Need to compare proposed solution against alternatives
- Want honest assessment (not confirmation bias)

**Example triggers:**
- "Validate this RFC"
- "I want to test if this approach works"
- "Benchmark this solution against alternatives"
- "Is this RFC's performance claim accurate?"

## Process

### Phase 1: Understanding (30 min)

**Inputs needed:**
1. RFC document or proposal
2. Performance/compatibility claims to validate
3. Related PRs or existing implementations
4. Target metrics (latency, tokens, quality, compatibility)

**Actions:**
1. Read RFC and related code
2. Identify all claims requiring validation
3. List success criteria (measurable, falsifiable)
4. Check for existing evaluation infrastructure

**Output:** Validation plan with clear metrics and approach

---

### Phase 2: Setup (1-2 days)

**Create infrastructure:**

1. **Extract/implement the feature** (if needed)
   - Follow TDD
   - Create reusable package
   - Write comprehensive tests

2. **Build evaluation framework**
   - Create evaluators for each claim
   - Set up baseline vs treatment comparison
   - Prepare datasets (synthetic or real)

3. **Configure environments**
   - Worktrees for clean comparison (if needed)
   - Model deployments (OSS, frontier)
   - Measurement instrumentation

**Output:** Complete eval infrastructure ready to run

---

### Phase 3: Benchmarking (2-3 days)

**Run comprehensive experiments:**

1. **Multiple scales**
   - Small (prove mechanics)
   - Medium (typical workload)
   - Large (stress test)

2. **Multiple configurations**
   - Baseline (no changes)
   - Optimized (best-case tuning)
   - Variants (different parameters)

3. **Multiple models** (if applicable)
   - Frontier models (current prod)
   - OSS models (future compatibility)

4. **Collect raw data**
   - Actual milliseconds (not scores)
   - Actual token counts (not estimates)
   - Success rates, error rates
   - Quality metrics

**Output:** 10-15+ experiments with raw performance data

---

### Phase 4: Analysis (1 day)

**Honest assessment:**

1. **Compare claims vs reality**
   - For each RFC claim: Supported? Contradicted? Needs nuance?
   - Calculate actual vs claimed improvements
   - Identify overstated/understated claims

2. **Find breaking points**
   - Where does performance degrade?
   - Which configurations fail?
   - What are the failure modes?

3. **Measure trade-offs**
   - What's sacrificed for the benefits?
   - Hidden costs (tokens, complexity, reliability)
   - Configuration requirements

4. **Explore alternatives**
   - If RFC solution doesn't fully work, what else could?
   - Compare alternatives on same metrics
   - Recommend best approach for the goal

**Output:** Complete truth table (claims vs reality)

---

### Phase 5: Recommendation (1 day)

**Provide actionable guidance:**

1. **Package/Feature Quality Assessment**
   - Code quality (tests, structure, conventions)
   - Engineering soundness
   - Reusability potential

2. **Claims Revision**
   - What claims hold up?
   - What needs correction?
   - What should be removed?

3. **Use Case Clarification**
   - When SHOULD this be used?
   - When should it NOT be used?
   - Who benefits most?

4. **Alternative Solutions**
   - If original approach has issues, what's better?
   - Comparison matrix (approaches × criteria)
   - Clear recommendation

5. **Path Forward Options**
   - Approve as-is (if claims validated)
   - Approve with revisions (claims need correction)
   - Pivot to alternative (better solution exists)
   - Withdraw (fundamentally flawed)

**Output:** Executive summary with decision options

---

## Deliverables

**At completion, provide:**

1. **Validation Reports**
   - Design spec (what we're testing)
   - Raw metrics comparison (actual numbers)
   - Honest assessment (claims vs reality)
   - Final recommendation

2. **Working Code**
   - Implemented feature (if extraction needed)
   - Evaluation framework (reusable)
   - Benchmark datasets

3. **Complete Data**
   - Experiment IDs (LangSmith/storage)
   - Raw performance measurements
   - Configuration tested
   - Success/failure analysis

4. **Decision Package**
   - Executive summary (1 page)
   - Detailed findings (technical)
   - Recommendation options (3-4 paths)
   - Next steps for each option

---

## Key Principles

### 1. Honest Assessment > Confirmation Bias

**Don't:**
- Cherry-pick data supporting the RFC
- Ignore negative findings
- Rationalize away contradictions

**Do:**
- Report all findings (positive and negative)
- Quantify claims (actual numbers vs claims)
- Explore why things don't work (root cause)

### 2. Explore Alternatives

**If RFC solution has issues:**
- Don't stop at "doesn't work"
- Investigate WHY it doesn't work
- Propose better solutions
- Compare objectively

### 3. Measure What Matters

**Focus on:**
- Actual impact on users (latency, cost, reliability)
- Real-world scenarios (not synthetic edge cases)
- Trade-offs (what's sacrificed for benefits)
- Configuration requirements (is it practical?)

### 4. Provide Options, Not Directives

**Give decision-makers:**
- Multiple paths forward (approve, revise, pivot, withdraw)
- Trade-offs for each
- Clear recommendation (but acknowledge it's their call)

---

## Example Workflow

**User:** "Validate this RFC: Extract batch processing for LLM workloads"

**Skill executes:**

```
1. UNDERSTAND
   - Read RFC (claims: 2x faster, 80% token reduction, OSS support)
   - Identify validation approach (benchmark baseline vs treatment)
   - Define metrics (latency, tokens, quality, OSS compatibility)

2. SETUP
   - Extract @kbn/llm-batch-processing package
   - Create latency + token evaluators
   - Build synthetic datasets (100, 500 alerts)
   - Configure frontier + OSS models

3. BENCHMARK
   - Run baseline (single-pass)
   - Run treatment (batched, multiple configs)
   - Test OSS models (Qwen, Llama, Mistral)
   - Collect raw data (12 experiments)

4. ANALYZE
   - Latency: 28s → 18s = 36% (NOT 2x) ❌
   - Tokens: 6K → 27K = 4.5x MORE (NOT 80% less) ❌
   - OSS: Tool calling fails (NOT enabled) ❌
   - Package quality: Excellent ✅

5. ALTERNATIVES
   - Explore: Why doesn't it work as claimed?
   - Research: Incremental processing
   - Compare: Incremental beats batching for AD
   - Recommend: Use incremental instead

6. RECOMMEND
   - Package: Approve (code is good)
   - Claims: Revise completely
   - Use case: Narrow to "parallel processing utility"
   - Alternative: Implement Incremental AD (better for goal)
```

**Output:** Complete validation with honest findings and clear path forward.

---

## Success Criteria

**Validation is complete when:**

✅ All RFC claims tested empirically (with data)
✅ Raw performance numbers collected (not estimates)
✅ Trade-offs quantified (what's sacrificed)
✅ Alternatives explored (if original has issues)
✅ Clear recommendation provided (with options)
✅ Decision-makers have actionable guidance

**Quality indicators:**
- Changed your mind? (Discovered truth ≠ expectations)
- Found alternatives? (Explored beyond original proposal)
- Quantified claims? (Actual numbers vs vague improvements)
- Honest about failures? (Reported what doesn't work)

---

## Anti-Patterns to Avoid

**Don't:**
- Accept RFC claims without testing
- Only test happy path (ignore edge cases)
- Cherry-pick supporting data
- Skip alternative exploration
- Give vague recommendations ("might work", "could be faster")

**Do:**
- Test all claims systematically
- Collect raw numbers (not interpretations)
- Report contradicting evidence
- Explore why things fail
- Give specific, actionable guidance

---

## Integration with Other Skills

**Before validation:**
- Use `@superpowers:brainstorming` to design validation approach
- Use `@superpowers:writing-plans` for implementation plan

**During validation:**
- Use `@superpowers:test-driven-development` for feature implementation
- Use `@superpowers:systematic-debugging` when tests fail

**After validation:**
- Use `@superpowers:requesting-code-review` for final review
- Use `@superpowers:finishing-a-development-branch` to ship

---

## Expected Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Understanding | 30 min - 1 hour | Validation plan |
| Setup | 1-2 days | Eval infrastructure |
| Benchmarking | 2-3 days | Performance data |
| Analysis | 1 day | Findings report |
| Recommendation | 1 day | Decision package |
| **Total** | **5-7 days** | Complete validation |

**Actual (this conversation):** 6 hours (condensed timeline due to existing infrastructure)

---

## Outputs from This Conversation

**As example of what this skill should produce:**

1. ✅ Validation design spec
2. ✅ Implementation plan
3. ✅ Working package (30 tests)
4. ✅ Evaluation framework (4 evaluators)
5. ✅ 12+ benchmark experiments
6. ✅ Raw metrics comparison
7. ✅ OSS compatibility analysis
8. ✅ Alternative solution spec (Incremental AD)
9. ✅ Honest final assessment
10. ✅ Clear recommendations

**This is the template** for future RFC validations.
