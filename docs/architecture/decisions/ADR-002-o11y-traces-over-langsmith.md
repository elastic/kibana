# ADR-002: Use O11y Traces Instead of LangSmith for Validation

**Status:** ✅ Accepted
**Date:** 2026-03-22
**Author:** Patryk Kopycinski
**Context:** AESOP PoC validation infrastructure

---

## Context

AESOP validates generated skills through @kbn/evals framework. Evals need traces to measure:
- Token usage (cost tracking)
- Latency (performance)
- Tool calls (correctness)
- Errors (quality)

Two options for trace storage:
- **Option A:** LangSmith (external SaaS, $50-500/month)
- **Option B:** Elasticsearch O11y traces (`traces-*` indices)

---

## Decision

**Use Elasticsearch O11y traces as PRIMARY validation mechanism.**

**LangSmith is OPTIONAL** (cross-validation only, goal is to drop completely).

---

## Rationale

### 1. Cost Savings: $500+/Month

**LangSmith pricing:**
- Developer tier: $39/month (limited traces)
- Team tier: $249/month (higher limits)
- Enterprise: $500+/month (unlimited)

**AESOP exploration generates:**
- ~200-500 LLM calls per exploration
- 5-10 explorations per week (testing + production)
- ~2,500 traces/week × 4 weeks = **10,000 traces/month**

**Cost:**
- LangSmith: $250-500/month
- Elasticsearch: $0 (already deployed)

**Annual savings:** $3,000-6,000/year

---

### 2. Data Sovereignty

**LangSmith:** Traces stored in external SaaS (US-based servers)

**Concerns:**
- Compliance: Some customers prohibit external trace storage (GDPR, data residency)
- Security: LLM prompts may contain sensitive data (alert details, user names, IPs)
- Vendor lock-in: Migrating off LangSmith requires re-implementation

**O11y Traces:** Stored in customer's own Elasticsearch cluster

**Benefits:**
- ✅ Data never leaves customer environment
- ✅ Full control over retention, encryption, access
- ✅ Compliant with strict data policies
- ✅ Zero vendor lock-in

---

### 3. Integration with Existing Infrastructure

**Evals Plugin (PR #254845) already supports O11y traces:**

- ✅ TraceWaterfall component visualizes OTEL spans
- ✅ Trace-based evaluators extract metrics (tokens, latency, tools)
- ✅ UI shows traces for each eval run
- ✅ ES|QL queries analyze trace patterns

**If we used LangSmith:**
- ❌ Would need dual trace collection (OTEL + LangSmith SDK)
- ❌ Would need separate UI for LangSmith traces
- ❌ Would need LangSmith API integration throughout evals plugin

**O11y Traces:**
- ✅ Single trace backend (OTEL to Elasticsearch)
- ✅ Reuse existing TraceWaterfall UI
- ✅ Native ES|QL for analytics (more powerful than LangSmith API)

---

### 4. Query Capabilities

**LangSmith API:**
```python
# Limited filtering
runs = client.list_runs(
    project_name="aesop",
    filter="eq(status, 'success')"
)
# Returns: paginated results, limited aggregations
```

**ES|QL on O11y Traces:**
```sql
FROM traces-*
| WHERE attributes.aesop.skill.id IS NOT NULL
| STATS
    avg_tokens = AVG(attributes.gen_ai.usage.prompt_tokens + attributes.gen_ai.usage.completion_tokens),
    p50_latency = PERCENTILE(duration, 50),
    p99_latency = PERCENTILE(duration, 99),
    error_rate = COUNT_IF(status.code == 'ERROR') / CAST(COUNT() AS DOUBLE) * 100
  BY attributes.aesop.skill.name
| SORT avg_tokens DESC
```

**Capability comparison:**

| Feature | LangSmith | ES|QL | Winner |
|---------|-----------|-------|--------|
| **Aggregations** | Basic (count, avg) | Advanced (percentiles, stats, buckets) | ES|QL ✅ |
| **Filtering** | Simple (eq, gt, lt) | Complex (joins, regex, ranges) | ES|QL ✅ |
| **Performance** | API calls (slow) | In-cluster queries (fast) | ES|QL ✅ |
| **Joins** | Not supported | Multi-index joins | ES|QL ✅ |
| **Custom metrics** | Limited | Full ES aggregations | ES|QL ✅ |

---

### 5. Strategic Alignment

**Elastic's Observability Vision:** Unified observability platform with ES-native tracing

**By using O11y traces:**
- ✅ Demonstrates O11y traces are LangSmith-competitive
- ✅ Validates Elastic's observability investment
- ✅ Identifies O11y product gaps (if parity not achieved)
- ✅ Provides customer proof point ("we use it internally")

**If we used LangSmith:**
- ❌ Implies O11y traces insufficient
- ❌ Sends wrong message to customers ("Elastic doesn't trust their own product")

---

## Implementation Approach

### Phase 1: O11y Traces as Primary (Current)

**Architecture:**
```
Agent Execution
      ↓
OTEL Instrumentation
      ↓
EDOT Collector (port 4318)
      ↓
Elasticsearch (traces-* indices)
      ↓
@kbn/evals (trace-based evaluators)
      ↓
TraceWaterfall UI
```

**Status:** ✅ Implemented

---

### Phase 2: LangSmith Cross-Validation (Optional)

**Goal:** Prove ≥95% parity before dropping LangSmith entirely

**Approach:**
```typescript
// Dual-write traces (temporary)
await Promise.all([
  sendToOTEL(trace),      // Primary
  sendToLangSmith(trace), // Validation only
]);

// Compare metrics
const parity = compareParity(otelMetrics, langsmithMetrics);

if (parity >= 0.95) {
  console.log('✅ O11y traces match LangSmith - safe to drop external dependency');
}
```

**Status:** ⏳ Planned for Week 1, Day 3 (benchmarking tests)

---

### Phase 3: Drop LangSmith (After Parity Proven)

**When parity ≥95%:**
1. Remove LangSmith SDK imports
2. Remove LangSmith API calls
3. Update docs to remove LangSmith references
4. Announce cost savings to stakeholders

**Effort:** 4-6 hours (find-and-replace + testing)

**Timeline:** End of Week 2 (if parity tests pass)

---

## Consequences

### Positive

- ✅ **$3K-6K/year cost savings**
- ✅ **Data sovereignty** (compliance-friendly)
- ✅ **More powerful querying** (ES|QL > LangSmith API)
- ✅ **Faster queries** (in-cluster > API calls)
- ✅ **Validates Elastic observability strategy**
- ✅ **Zero vendor lock-in**

### Negative

- ⚠️ **Less mature tooling** (LangSmith has 3+ years head start on LLM-specific features)
- ⚠️ **Requires parity validation** (4-6 hours testing to prove equivalence)
- ⚠️ **O11y product gaps may be discovered** (if parity <95%, need to request features)

### Neutral

- ⚪ **Different UI** (TraceWaterfall vs LangSmith UI) - both are good, just different

---

## Validation Criteria

**Parity testing (Week 1, Day 3):**

| Metric | LangSmith | O11y Traces | Parity Threshold | Result |
|--------|-----------|-------------|------------------|--------|
| **Token counts** | Sum(prompt + completion) | Sum(gen_ai.usage.*_tokens) | ≥95% | ⏳ TBD |
| **Latency** | Run duration | Trace duration | ≥90% | ⏳ TBD |
| **Tool calls** | Count tool_calls | Count tool spans | 100% | ⏳ TBD |
| **Error tracking** | Error logs | status.code spans | 100% | ⏳ TBD |

**If parity ≥95% across all metrics:** ✅ Drop LangSmith

**If parity <95%:**
- Identify gaps in O11y traces
- Create feature requests for Observability team
- Keep LangSmith until gaps filled OR accept parity <95% for cost/sovereignty benefits

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **O11y traces missing LLM-specific fields** | Medium | Add custom OTEL attributes (gen_ai.usage.*) |
| **TraceWaterfall UI less polished than LangSmith** | Low | Acceptable trade-off for cost savings |
| **Team unfamiliar with OTEL** | Low | Training + documentation |
| **Parity <95%** | Medium | Accept trade-off OR keep LangSmith for specific metrics |

---

## References

- LangSmith: https://www.langchain.com/langsmith
- OTEL Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- Evals plugin O11y traces support: PR #254845
- Attack Discovery uses OTEL: [Link to implementation]

---

## Review & Update

**Next Review:** After parity testing (Week 1, Day 3)

**Update Decision:**
- If parity ≥95%: ✅ Confirm decision, drop LangSmith
- If parity <95%: ⚠️ Revisit - may need to keep LangSmith or request O11y features
- If O11y traces prove superior: ✅ Publish case study

**Expected Outcome:** Decision stands, LangSmith dropped by end of Week 2 ✅
