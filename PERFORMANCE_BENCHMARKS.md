# Incremental Attack Discovery - Performance Benchmarks

**Benchmark Date**: [Date]
**Model**: [Model Name]
**Environment**: [Local Dev / Staging / Production]

---

## Benchmark Results Summary

| Benchmark | Target | Actual | Status |
|-----------|--------|--------|--------|
| Delta mode latency (50 alerts) | <15s | [__s] | [✅/❌] |
| Progressive latency (200 alerts) | <120s | [__s] | [✅/❌] |
| Concurrent requests (5x) | <60s | [__s] | [✅/❌] |
| Context budget | <8K | [__K] | [✅/❌] |
| Delta efficiency | <20% | [__%] | [✅/❌] |

**Overall**: [PASS / FAIL]

---

## Detailed Results

### Benchmark 1: Delta Mode Latency

**Configuration**:
- Mode: Delta
- Alerts: 50
- Session: New (initial run)
- alertsPerRound: 50
- Expected rounds: 1

**Results**:
- Duration: [__] ms
- Rounds: [__]
- Alerts processed: [__]
- Context budget: [__] tokens
- Target: <15,000ms
- **Status**: [✅ PASS / ❌ FAIL]

**Breakdown**:
- Alert fetching: [__] ms
- LLM call: [__] ms
- State tracking: [__] ms
- Merging: [__] ms

---

### Benchmark 2: Progressive Mode Latency

**Configuration**:
- Mode: Progressive
- Alerts: 200
- alertsPerRound: 50
- Expected rounds: 4

**Results**:
- Duration: [__] ms
- Rounds: [__]
- Alerts processed: [__]
- Avg round duration: [__] ms
- Max context budget: [__] tokens
- Target: <120,000ms
- **Status**: [✅ PASS / ❌ FAIL]

**Per-Round Breakdown**:
| Round | Alerts | Duration | Context |
|-------|--------|----------|---------|
| 1 | [__] | [__]ms | [__] tokens |
| 2 | [__] | [__]ms | [__] tokens |
| 3 | [__] | [__]ms | [__] tokens |
| 4 | [__] | [__]ms | [__] tokens |

---

### Benchmark 3: Standard Mode Baseline

**Configuration**:
- Mode: Standard (no incremental)
- Alerts: 50

**Results**:
- Duration: [__] ms
- Context: [__] tokens

**Comparison**:
| Metric | Standard | Delta | Improvement |
|--------|----------|-------|-------------|
| Latency | [__]ms | [__]ms | [__%] |
| Context | [__]K | [__]K | [__%] reduction |

---

### Benchmark 4: Concurrent Requests

**Configuration**:
- Concurrent requests: 5
- Mode: Delta
- Alerts per request: 50

**Results**:
- Total duration: [__] ms
- Avg per request: [__] ms
- Min: [__] ms
- Max: [__] ms
- Target: <60,000ms
- **Status**: [✅ PASS / ❌ FAIL]

**Resource Contention**:
- Requests failed: [__]
- Timeouts: [__]
- Avg vs sequential: [__%] overhead

---

### Benchmark 5: State Index Growth

**Configuration**:
- Requests run: 10
- Alerts per request: 100
- Total alerts tracked: ~1000

**Results**:
- Document count: [__]
- Index size: [__] MB
- Avg document size: [__] bytes
- Growth rate: [__] MB/1000 alerts

**Projection**:
- 10K alerts/day: [__] MB/day
- 30 day retention: [__] GB total

---

## Performance Analysis

### Latency Analysis

**Delta Mode**:
- P50: [__] ms
- P95: [__] ms
- P99: [__] ms

**Progressive Mode**:
- P50: [__] ms
- P95: [__] ms
- P99: [__] ms

**Target vs Actual**:
```
Delta:       [____]ms vs 15,000ms = [PASS/FAIL]
Progressive: [____]ms vs 120,000ms = [PASS/FAIL]
```

### Throughput Analysis

**Alerts Processed per Second**:
- Delta mode: [__] alerts/sec
- Progressive mode: [__] alerts/sec
- Standard mode: [__] alerts/sec

**Scaling**:
- Linear: ✅/❌
- Bottlenecks: [List any found]

### Resource Usage

**Elasticsearch**:
- State index growth: [__] MB/day
- Query load: [__] queries/min
- CPU impact: [__%]

**Kibana**:
- Memory usage: [__] MB
- CPU usage: [__%]

---

## Comparison vs Baseline

### Context Budget

| Alerts | Standard | Incremental | Reduction |
|--------|----------|-------------|-----------|
| 50 | ~7K | ~5.5K | 21% |
| 100 | ~14K | ~5.5K | 61% |
| 200 | ~27K | ~6.5K | **76%** |

### Success Rate (Expected)

| Model | Standard | Incremental | Improvement |
|-------|----------|-------------|-------------|
| Qwen 2.5 7B | 20-80% | [__%] | [__]x |
| Llama 3.1 8B | 40-90% | [__%] | [__]x |

---

## Recommendations

### Performance Optimizations

[List any optimizations discovered during benchmarking]

### Configuration Tuning

**Recommended Settings**:
```json
{
  "alertsPerRound": [__],  // Tuned from 50
  "maxRounds": [__],        // Tuned from 20
  "similarityThreshold": [__] // Tuned from 0.8
}
```

**Rationale**: [Explain tuning decisions based on benchmark data]

---

## Go/No-Go Decision

**Performance Gates**:
- [ ] Delta latency <15s (p95)
- [ ] Progressive latency <120s (p95)
- [ ] Concurrent handling (5 requests)
- [ ] Context budget <8K (always)
- [ ] No resource contention
- [ ] Linear scaling verified

**Decision**: [PASS / FAIL]

**Approval**: _____________________________ Date: _______

---

**Benchmark Script**: `./scripts/benchmark_performance.sh`
**Results File**: `benchmark_results_<timestamp>.json`
