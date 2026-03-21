# AESOP: O11y Traces as PRIMARY Validation Mechanism

**Author:** Patryk Kopycinski + Claude
**Date:** 2026-03-21
**Related:** [aesop_poc_architecture.md](aesop_poc_architecture.md), [PR #254845](https://github.com/elastic/kibana/pull/254845)

---

## Overview

AESOP uses **OpenTelemetry (OTEL) traces stored in Elasticsearch** as the PRIMARY mechanism for validating proposed Agent Builder skills. This is a **100% Elastic-native approach** that eliminates dependency on external platforms like LangSmith.

**LangSmith is used ONLY for cross-validation** during development to verify the Elastic solution matches LangSmith's behavior. The end goal is to **drop LangSmith completely** once we prove our o11y traces provide equivalent or better validation.

---

## Why O11y Traces > LangSmith for AESOP

| Aspect | O11y Traces (Elastic) | LangSmith | Verdict |
|--------|----------------------|-----------|---------|
| **Data Location** | In-cluster (`traces-*` indices) | External SaaS | ✅ **Elastic wins** (data sovereignty) |
| **Integration Effort** | Zero (already in Kibana) | MCP server + API keys | ✅ **Elastic wins** (simpler) |
| **Cost** | Free (self-hosted) | $X/month per user | ✅ **Elastic wins** (zero cost) |
| **Trace Fidelity** | Full OTEL semantic conventions | Custom LangSmith format | ✅ **Elastic wins** (standards-based) |
| **Query Flexibility** | ES|QL + aggregations | LangSmith API limits | ✅ **Elastic wins** (full ES power) |
| **UI Integration** | TraceWaterfall in Kibana | External LangSmith UI | ✅ **Elastic wins** (unified UX) |
| **Production Readiness** | Proven in evals plugin (PR #254845) | Requires external dependency | ✅ **Elastic wins** (production-ready) |
| **Strategic Alignment** | Dogfooding Elastic observability | External vendor lock-in | ✅ **Elastic wins** (dogfood) |

**Recommendation**: Use o11y traces as PRIMARY, LangSmith as SECONDARY cross-validation only (temporarily).

---

## How O11y Traces Work in AESOP

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Skill Execution (via @kbn/evals)                             │
│  - Agent Builder agent runs proposed skill                    │
│  - Task invokes skill with example inputs                     │
│  - @kbn/inference-tracing wraps all LLM/tool calls           │
└───────────────────────────┬──────────────────────────────────┘
                            │ (emits OTEL spans)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  EDOT Collector (node scripts/edot_collector)                 │
│  - Receives OTEL spans via HTTP (port 4318)                   │
│  - Batches spans for efficiency                               │
│  - Exports to Elasticsearch                                   │
└───────────────────────────┬──────────────────────────────────┘
                            │ (writes spans)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Elasticsearch: traces-* indices                              │
│  - One span document per operation                            │
│  - Hierarchical (parent_id links spans)                       │
│  - Semantic attributes (gen_ai.*, tool.*, resource.*)         │
└───────────────────────────┬──────────────────────────────────┘
                            │ (query spans)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Trace-Based Evaluators (@kbn/evals)                          │
│  - Extract metrics from span attributes                       │
│  - Aggregate across repetitions                               │
│  - Compare against thresholds                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │ (evaluation scores)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  kibana-evaluations* datastream                               │
│  - One score document per (example × evaluator × repetition)  │
│  - Links to trace_id for drill-down                           │
└───────────────────────────┬──────────────────────────────────┘
                            │ (query results)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Evals Plugin UI (/app/evals)                                 │
│  - Runs list with scores                                      │
│  - Run detail with per-evaluator stats                        │
│  - TraceWaterfall viewer (click trace_id → see spans)        │
└──────────────────────────────────────────────────────────────┘
```

---

## OTEL Span Structure

**Example span from skill execution**:

```json
{
  "trace.id": "abc123...",
  "span.id": "def456...",
  "parent.id": "parent789...",
  "name": "Agent Builder: Execute Skill",
  "kind": "CHAIN",
  "timestamp": 1711234567890,
  "duration": 3500,  // milliseconds
  "status": "OK",
  "attributes": {
    // GenAI semantic conventions (https://opentelemetry.io/docs/specs/semconv/gen-ai/)
    "gen_ai.system": "anthropic.claude",
    "gen_ai.request.model": "claude-3-5-sonnet-20241022",
    "gen_ai.usage.prompt_tokens": 1234,
    "gen_ai.usage.completion_tokens": 567,
    "gen_ai.request.temperature": 0.0,

    // Tool usage
    "tool.name": "elasticsearch_query",
    "tool.input": "{\"index\": \".alerts-*\", \"query\": {...}}",
    "tool.output": "{\"hits\": [...]}",

    // Resource attributes
    "service.name": "kibana",
    "service.version": "9.0.0",

    // Custom AESOP attributes
    "aesop.skill.id": "skill-001",
    "aesop.skill.name": "investigate_high_severity_alerts",
    "aesop.validation.iteration": 1
  }
}
```

---

## Trace-Based Evaluators (From @kbn/evals)

**Existing trace-based evaluators** in `@kbn/evals`:

```typescript
// From @kbn/evals/src/evaluators/trace_based/

export const traceBasedEvaluators = {
  // Extract input tokens from gen_ai.usage.prompt_tokens
  inputTokens: createTraceEvaluator({
    name: 'input_tokens',
    extract: (spans) => sumSpanAttribute(spans, 'gen_ai.usage.prompt_tokens'),
  }),

  // Extract output tokens from gen_ai.usage.completion_tokens
  outputTokens: createTraceEvaluator({
    name: 'output_tokens',
    extract: (spans) => sumSpanAttribute(spans, 'gen_ai.usage.completion_tokens'),
  }),

  // Calculate latency from span durations
  latency: createTraceEvaluator({
    name: 'latency_ms',
    extract: (spans) => {
      const rootSpan = spans.find(s => !s.parent_id);
      return rootSpan?.duration || 0;
    },
  }),

  // Count tool calls
  toolCalls: createTraceEvaluator({
    name: 'tool_call_count',
    extract: (spans) => spans.filter(s => s.kind === 'TOOL').length,
  }),

  // Count cached tokens (if model supports prompt caching)
  cachedTokens: createTraceEvaluator({
    name: 'cached_tokens',
    extract: (spans) => sumSpanAttribute(spans, 'gen_ai.usage.prompt_tokens_cached'),
  }),
};
```

**Usage in AESOP skill validation**:

```typescript
// server/lib/aesop/validation/run_skill_validation.ts

import { KibanaEvalsClient } from '@kbn/evals/server';
import { traceBasedEvaluators } from '@kbn/evals/evaluators';

export async function validateProposedSkill(skill: ProposedSkill) {
  const dataset = generateEvalDataset(skill);

  const experiment = await evalsClient.runExperiment(
    { dataset, task: (example) => executeSkill(skill, example) },
    [
      // PRIMARY: Extract metrics from OTEL traces
      traceBasedEvaluators.inputTokens,   // gen_ai.usage.prompt_tokens
      traceBasedEvaluators.outputTokens,  // gen_ai.usage.completion_tokens
      traceBasedEvaluators.latency,       // span.duration
      traceBasedEvaluators.toolCalls,     // count TOOL spans
      traceBasedEvaluators.cachedTokens,  // gen_ai.usage.prompt_tokens_cached

      // SECONDARY: LLM-as-judge (for quality assessment)
      { name: 'correctness', kind: 'LLM', evaluate: ... },
      { name: 'groundedness', kind: 'LLM', evaluate: ... },
    ]
  );

  return experiment;
}
```

---

## Trace Querying for Skill Analysis

**Query traces-* indices to analyze skill execution**:

```typescript
// Query OTEL traces for a specific eval run

async function getTracesForEvalRun(
  runId: string,
  traceEsClient: ElasticsearchClient
): Promise<TraceSpan[]> {
  // Get all trace IDs for this run from kibana-evaluations*
  const scores = await traceEsClient.search({
    index: 'kibana-evaluations*',
    body: {
      query: { term: { 'run_id': runId } },
      _source: ['trace_id'],
      size: 1000,
    },
  });

  const traceIds = scores.hits.hits.map(hit => hit._source.trace_id);

  // Fetch all spans for these traces
  const traces = await traceEsClient.search({
    index: 'traces-*',
    body: {
      query: {
        terms: { 'trace.id': traceIds },
      },
      size: 10000,
      sort: [{ timestamp: 'asc' }],
    },
  });

  return traces.hits.hits.map(hit => hit._source);
}

// Analyze skill performance from traces
function analyzeSkillPerformance(spans: TraceSpan[]): SkillPerformanceMetrics {
  return {
    // Token efficiency
    avgInputTokens: avg(spans.map(s => s.attributes['gen_ai.usage.prompt_tokens'])),
    avgOutputTokens: avg(spans.map(s => s.attributes['gen_ai.usage.completion_tokens'])),
    tokenEfficiency: computeTokensPerCorrectAnswer(spans),

    // Latency
    p50Latency: percentile(spans.map(s => s.duration), 0.5),
    p99Latency: percentile(spans.map(s => s.duration), 0.99),

    // Tool usage
    toolCallsPerExecution: avg(spans.map(s => countToolSpans(s))),
    mostUsedTools: topK(spans.map(s => s.attributes['tool.name'])),

    // Errors
    errorRate: spans.filter(s => s.status === 'ERROR').length / spans.length,
    commonErrors: groupBy(
      spans.filter(s => s.status === 'ERROR'),
      s => s.attributes['error.message']
    ),
  };
}
```

---

## LangSmith Cross-Validation (SECONDARY - Goal: Remove)

**Purpose**: Verify Elastic o11y traces provide same insights as LangSmith during development

**When to use**:
- ✅ During initial AESOP development (validate our approach)
- ✅ When debugging trace extraction logic (sanity check)
- ⚠️ **NOT in production** (LangSmith is optional dependency)

**How it works**:

```typescript
// server/lib/aesop/validation/langsmith_cross_validation.ts

import { LangSmithClient } from 'langsmith';  // Optional import

export async function crossValidateWithLangSmith(
  elasticMetrics: TraceMetrics,
  experiment: RanExperiment,
  langsmithClient?: LangSmithClient  // Optional
): Promise<CrossValidationResult | null> {
  if (!langsmithClient) {
    // LangSmith not configured - skip cross-validation
    return null;
  }

  // Run same experiment in LangSmith
  const langsmithProject = `aesop-cross-validation-${Date.now()}`;
  const langsmithRuns = await langsmithClient.createRuns(
    experiment.runs.map(run => ({
      project_name: langsmithProject,
      name: run.exampleIndex.toString(),
      inputs: run.input,
      outputs: run.output,
      tags: ['aesop', 'cross-validation'],
    }))
  );

  // Fetch LangSmith traces
  const langsmithTraces = await Promise.all(
    langsmithRuns.map(run => langsmithClient.readRun(run.id))
  );

  // Compare metrics
  const comparison = {
    tokenCountMatch: compareTokens(elasticMetrics, langsmithTraces),
    latencyMatch: compareLatency(elasticMetrics, langsmithTraces),
    toolCallMatch: compareToolCalls(elasticMetrics, langsmithTraces),
    verdict: 'PENDING',
  };

  // Determine verdict
  if (comparison.tokenCountMatch.diff < 5% &&
      comparison.latencyMatch.diff < 10% &&
      comparison.toolCallMatch.diff < 2) {
    comparison.verdict = '✅ ELASTIC_MATCHES_LANGSMITH';
  } else {
    comparison.verdict = '⚠️ DIVERGENCE_DETECTED';
    console.warn('[AESOP] LangSmith divergence:', comparison);
  }

  return comparison;
}

// Helpers
function compareTokens(elastic, langsmith): TokenComparison {
  const elasticTotal = elastic.totalInputTokens + elastic.totalOutputTokens;
  const langsmithTotal = sum(langsmith.map(r => r.prompt_tokens + r.completion_tokens));
  const diff = Math.abs(elasticTotal - langsmithTotal);
  const diffPercent = (diff / langsmithTotal) * 100;

  return {
    elastic: elasticTotal,
    langsmith: langsmithTotal,
    diff,
    diffPercent,
    match: diffPercent < 5,  // Tolerate <5% difference
  };
}
```

**Monitoring LangSmith Parity**:

Store cross-validation results in `.aesop-langsmith-comparisons` index for monitoring over time:

```typescript
{
  "comparison_id": "abc-123",
  "skill_id": "skill-001",
  "eval_run_id": "run-456",
  "timestamp": "2026-03-21T10:00:00Z",
  "metrics": {
    "token_count_match": true,
    "latency_match": true,
    "tool_call_match": true
  },
  "verdict": "ELASTIC_MATCHES_LANGSMITH",
  "divergences": []
}
```

**Exit Criteria for Dropping LangSmith**:

We can drop LangSmith when:
- ✅ 100 consecutive cross-validations show "ELASTIC_MATCHES_LANGSMITH"
- ✅ Token counts differ by <2% (not <5%)
- ✅ Latency differs by <5% (not <10%)
- ✅ Zero divergences in tool call tracking
- ✅ Evals team confident in o11y traces as ground truth

---

## Trace-Based Metrics Extracted

### 1. Token Usage

**From span attributes**:
- `gen_ai.usage.prompt_tokens` - Input tokens
- `gen_ai.usage.completion_tokens` - Output tokens
- `gen_ai.usage.prompt_tokens_cached` - Cached tokens (if prompt caching enabled)

**Metrics**:
- Total tokens per skill execution
- Avg tokens per example
- Token efficiency (tokens per correct answer)
- Caching hit rate (cached / total)

### 2. Latency

**From span duration**:
- Root span duration = end-to-end latency
- LLM span duration = LLM inference time
- Tool span duration = tool execution time

**Metrics**:
- P50 latency (median)
- P99 latency (99th percentile)
- Breakdown: LLM time vs tool time vs overhead

### 3. Tool Calls

**From span kind and attributes**:
- Count spans where `kind = "TOOL"`
- Extract `tool.name` attribute
- Parse `tool.input` and `tool.output`

**Metrics**:
- Total tool calls per execution
- Most frequently used tools
- Tool call success rate
- Tool call latency

### 4. Errors

**From span status**:
- Count spans where `status = "ERROR"`
- Extract `error.message` and `error.type`

**Metrics**:
- Error rate (errors / total spans)
- Error types (group by error.type)
- Error locations (which tool/step failed)

### 5. Model Usage

**From span attributes**:
- `gen_ai.request.model` - Model used
- `gen_ai.request.temperature` - Temperature setting
- `gen_ai.response.finish_reason` - Why generation stopped

**Metrics**:
- Model distribution (which models used most)
- Finish reasons (normal, max_tokens, stop)
- Temperature impact on quality

---

## Example: Skill Validation with O11y Traces

**Workflow**: Validate proposed skill "investigate_high_severity_alerts"

```typescript
// 1. Run evaluation via @kbn/evals
const experiment = await evalsClient.runExperiment(
  {
    dataset: {
      name: 'high_severity_alerts_validation',
      examples: [
        { input: { alert_id: 'alert-1' }, output: { classification: 'CRITICAL' } },
        { input: { alert_id: 'alert-2' }, output: { classification: 'HIGH' } },
        // ... 20 examples
      ],
    },
    task: async (example) => {
      // Execute skill via Agent Builder
      // This emits OTEL traces automatically
      return await agentBuilderClient.executeSkill('investigate_high_severity_alerts', example.input);
    },
  },
  [
    // Trace-based evaluators (extract from traces-*)
    traceBasedEvaluators.inputTokens,
    traceBasedEvaluators.outputTokens,
    traceBasedEvaluators.latency,
    traceBasedEvaluators.toolCalls,

    // LLM-as-judge evaluators
    { name: 'correctness', kind: 'LLM', evaluate: checkCorrectness },
  ]
);

// 2. Fetch traces for analysis
const traceIds = Object.values(experiment.runs).map(r => r.traceId);
const spans = await fetchTracesFromElasticsearch(traceIds, traceEsClient);

// 3. Analyze trace data
const analysis = {
  // From trace-based evaluators
  avgInputTokens: experiment.evaluationRuns.find(e => e.evaluator === 'input_tokens').avg,
  avgOutputTokens: experiment.evaluationRuns.find(e => e.evaluator === 'output_tokens').avg,
  p50Latency: experiment.evaluationRuns.find(e => e.evaluator === 'latency').p50,
  toolCallCount: experiment.evaluationRuns.find(e => e.evaluator === 'tool_calls').avg,

  // From LLM-as-judge
  correctnessScore: experiment.evaluationRuns.find(e => e.evaluator === 'correctness').avg,

  // Custom span analysis
  toolBreakdown: groupToolCallsByType(spans),
  errorPatterns: groupErrorsByType(spans),
  cachingEffectiveness: computeCacheHitRate(spans),
};

// 4. Decision: Pass or improve?
if (analysis.correctnessScore >= 0.85 &&
    analysis.avgInputTokens < 5000 &&
    analysis.p50Latency < 3000) {
  return { status: 'PASSED', metrics: analysis };
} else {
  // Improve skill based on trace insights
  const improvements = suggestImprovementsFromTraces(analysis);
  return { status: 'NEEDS_IMPROVEMENT', suggestions: improvements, metrics: analysis };
}
```

**Output** (shown in AESOP UI):

```
✅ Skill Validation PASSED

📊 Performance Metrics (from O11y Traces):
- Input tokens: 1,234 avg (✅ under 5K limit)
- Output tokens: 567 avg
- P50 latency: 2.1s (✅ under 3s target)
- P99 latency: 4.5s
- Tool calls: 3 avg
- Error rate: 0% (✅ no errors)

🎯 Quality Metrics (LLM-as-judge):
- Correctness: 0.92 (✅ above 0.85 threshold)
- Groundedness: 0.88

🔗 View full traces: /app/evals/runs/run-123/traces
```

---

## Trace Waterfall UI Integration

**From PR #254845**: Evals plugin includes `TraceWaterfall` component

**Integration in AESOP**:

```tsx
// public/pages/aesop/skill_review.tsx

import { TraceWaterfall } from '@kbn/evals-plugin/public';

export const SkillReviewPage = ({ skill }: { skill: ProposedSkillDocument }) => {
  const [showTraceFlyout, setShowTraceFlyout] = useState(false);

  return (
    <EuiPage>
      {/* Skill content, eval scores, etc. */}

      {/* Button to view traces */}
      <EuiButton
        iconType="apmTrace"
        onClick={() => setShowTraceFlyout(true)}
      >
        View Execution Traces ({skill.validation.eval_trace_id})
      </EuiButton>

      {/* Trace waterfall flyout */}
      {showTraceFlyout && skill.validation.eval_trace_id && (
        <EuiFlyout onClose={() => setShowTraceFlyout(false)} size="l">
          <EuiFlyoutHeader>
            <EuiTitle><h2>Skill Execution Trace</h2></EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {/* Reuse TraceWaterfall from evals plugin! */}
            <TraceWaterfall traceId={skill.validation.eval_trace_id} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </EuiPage>
  );
};
```

**Benefits**:
- ✅ Reuse existing component (zero UI code needed)
- ✅ Consistent UX with evals plugin
- ✅ Full trace visualization (span tree, timings, attributes)
- ✅ Copy trace ID, span IDs for debugging

---

## Migration Path: LangSmith → Pure Elastic

### Phase 1 (Weeks 1-4): Dual Validation

Run BOTH Elastic o11y traces AND LangSmith in parallel:

```typescript
const result = await validateSkill(skill, {
  evalsClient,  // Elastic
  traceEsClient,  // Elastic
  langsmithClient,  // LangSmith (for comparison)
});

// Store comparison results
await storeCrossValidation(result.elasticMetrics, result.langsmithMetrics);
```

**Success metric**: ≥95% agreement between Elastic and LangSmith

---

### Phase 2 (Weeks 5-8): Confidence Building

LangSmith becomes OPTIONAL:

```typescript
const result = await validateSkill(skill, {
  evalsClient,  // PRIMARY
  traceEsClient,  // PRIMARY
  langsmithClient: process.env.ENABLE_LANGSMITH_VALIDATION ? langsmithClient : undefined,  // OPTIONAL
});

// Only run LangSmith if explicitly enabled
```

**Success metric**: Team confident in o11y traces alone

---

### Phase 3 (Week 9+): Drop LangSmith

Remove LangSmith entirely:

```typescript
const result = await validateSkill(skill, {
  evalsClient,  // ONLY
  traceEsClient,  // ONLY
  // langsmithClient removed!
});
```

**Success metric**: Zero LangSmith dependencies in code

---

## Advantages of O11y Traces for AESOP

### 1. Data Sovereignty

**Elastic**: All trace data stays in YOUR Elasticsearch cluster
**LangSmith**: Trace data sent to external SaaS platform

**Why it matters for AESOP**:
- Security workflows contain sensitive data (alert details, IP addresses, usernames)
- Compliance requirements (GDPR, HIPAA) may prohibit external trace storage
- Self-exploration agent queries reveal internal infrastructure

---

### 2. Query Power

**Elastic**: Full ES|QL + aggregations on trace data

```sql
FROM traces-*
| WHERE trace.id == "abc123"
  AND attributes.gen_ai.system == "anthropic.claude"
| STATS
    total_tokens = SUM(attributes.gen_ai.usage.prompt_tokens + attributes.gen_ai.usage.completion_tokens),
    avg_latency = AVG(duration),
    error_rate = COUNT_IF(status == "ERROR") / COUNT(*)
  BY attributes.aesop.skill.name
| SORT total_tokens DESC
```

**LangSmith**: Limited to API query parameters

**Why it matters**:
- Complex analyses (e.g., "which skills use most tokens?")
- Custom aggregations (e.g., "p99 latency by skill type")
- Correlations (e.g., "error rate vs token count")

---

### 3. Cost

**Elastic**: Free (self-hosted Elasticsearch)
**LangSmith**: $39-99/user/month + trace storage fees

**Why it matters**:
- AESOP will generate MANY traces (exploration + validation + improvement loops)
- With 10 SOC analysts, LangSmith = $500-1000/month
- With Elastic = $0/month

---

### 4. Integration

**Elastic**: Native integration with Kibana UI (TraceWaterfall component)
**LangSmith**: External UI, separate login

**Why it matters**:
- Users stay in Kibana (single pane of glass)
- Trace → Skill → Approval workflow is seamless
- No context switching

---

### 5. Extensibility

**Elastic**: Add custom span attributes for AESOP-specific metadata

```typescript
// Add AESOP metadata to spans
span.setAttribute('aesop.skill.id', skill.id);
span.setAttribute('aesop.skill.confidence', skill.confidence);
span.setAttribute('aesop.validation.iteration', iteration);
span.setAttribute('aesop.pattern.frequency', pattern.frequency);
```

**LangSmith**: Limited to predefined metadata fields

**Why it matters**:
- Track skill lineage (which pattern → which skill)
- Correlate skill quality with discovery confidence
- Debug improvement iterations

---

## Summary

| Validation Mechanism | Status | Timeline |
|---------------------|--------|----------|
| **O11y Traces in Elasticsearch** | ✅ **PRIMARY** | Use from Week 1 |
| **Trace-Based Evaluators (@kbn/evals)** | ✅ **PRIMARY** | Use from Week 1 |
| **LangSmith Cross-Validation** | ⚠️ **SECONDARY** | Weeks 1-8 only |
| **LangSmith Removal** | 🎯 **GOAL** | Week 9+ |

**Key Insight**: O11y traces + @kbn/evals provide EVERYTHING LangSmith does, but:
- ✅ 100% Elastic-native
- ✅ Zero external dependencies
- ✅ Zero cost
- ✅ Better data sovereignty
- ✅ More powerful querying

**Next Steps**:
1. Implement o11y trace validation (Week 3)
2. Add LangSmith cross-validation (Week 4)
3. Monitor parity for 4 weeks (Weeks 5-8)
4. Drop LangSmith if parity ≥95% (Week 9)
