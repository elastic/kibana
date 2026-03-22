# ADR-004: Incremental Exploration for Production Scale

**Status:** ✅ Accepted (Implementation in progress)
**Date:** 2026-03-22
**Author:** Patryk Kopycinski
**Context:** AESOP production deployment performance

---

## Context

AESOP's self-exploration workflow currently performs **full scans** of all scoped indices every execution:
- **Duration:** 1.5-2 hours for 100+ indices
- **Cost:** ~50K LLM tokens per exploration
- **Frequency:** Initially one-shot, but production needs continuous learning

**Problem for Production:**
- Daily full scans = 14 hours/week compute time
- 350K tokens/week = $175/week = $9,100/year just for exploration
- Redundant work: Re-discovers same schemas/relationships daily

**Need:** Incremental exploration that only processes **new/changed data**

---

## Decision

**Implement incremental exploration as primary production mode.**

Full scans become:
- Initial baseline (first run ever)
- Weekly refresh (every 7 days)
- Manual trigger (when force_full_scan=true)

---

## Approach

### Architecture: State-Based Change Detection

```
┌──────────────────────────────────────────────┐
│         Exploration State Storage            │
│      (.aesop-exploration-state index)        │
│                                              │
│  {                                           │
│    last_run_timestamp: "2026-03-22T02:00",  │
│    discovered_indices: ["index1", "index2"], │
│    discovered_relationships: [...],         │
│    discovered_patterns: [...]               │
│  }                                           │
└──────────────────┬───────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────┐
│         Change Detection Logic               │
│                                              │
│  1. Detect new indices (not in previous)    │
│  2. Detect modified indices (doc count +20%)│
│  3. Detect new data (timestamp > last_run)  │
└──────────────────┬───────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────┐
│      Explore Changes Only                    │
│                                              │
│  - Explore: New indices (full schema)       │
│  - Explore: Modified indices (new data only)│
│  - Skip: Unchanged indices                  │
└──────────────────┬───────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────┐
│      Merge with Previous State               │
│                                              │
│  - Add: New relationships discovered        │
│  - Update: Pattern frequencies              │
│  - Remove: Patterns that disappeared        │
│  - Save: Updated state for next run         │
└──────────────────────────────────────────────┘
```

---

## Performance Comparison

### Scenario: Daily Exploration in Production SOC

**Assumptions:**
- 150 indices total in environment
- 5 new indices per day (3% growth)
- 20 indices modified daily (new alerts/events)
- 125 indices unchanged

---

**Full Scan (Current):**
```
Explore: 150 indices × 60s avg = 9,000s (2.5 hours)
Token usage: 150 × 300 tokens = 45,000 tokens
Cost: $22.50 per exploration
Monthly: $675 (30 explorations)
```

**Incremental Scan (New):**
```
Explore: (5 new + 20 modified) × 60s = 1,500s (25 minutes)
Token usage: 25 × 300 tokens = 7,500 tokens
Cost: $3.75 per exploration
Monthly: $112.50 (30 explorations)

Speedup: 6x faster (150 min → 25 min)
Cost savings: $562.50/month = $6,750/year
```

---

### Real-World Performance Targets

| Metric | Full Scan | Incremental | Improvement |
|--------|-----------|-------------|-------------|
| **Duration** | 2 hours | 15 minutes | **8x faster** ✅ |
| **Token usage** | 50K tokens | 8K tokens | **6x cheaper** ✅ |
| **Cost** | $25/exploration | $4/exploration | **$252/year savings** ✅ |
| **Frequency** | Weekly (too slow) | Daily (practical) | **7x more data** ✅ |

**Key insight:** Incremental makes **daily** exploration feasible (weekly was max before)

---

## Change Detection Strategy

### 1. New Indices Detection

**Logic:**
```typescript
const currentIndices = await esClient.cat.indices({ format: 'json' });
const lastState = await loadState();

const newIndices = currentIndices.filter(
  idx => !lastState.discovered_indices.includes(idx.index)
);
```

**Complexity:** O(n) - simple set difference

**Accuracy:** 100% (deterministic)

---

### 2. Modified Indices Detection

**Logic:**
```typescript
for (const index of lastState.discovered_indices) {
  const newDocCount = await esClient.count({
    index,
    query: {
      range: {
        '@timestamp': { gte: lastState.last_run_timestamp }
      }
    }
  });

  if (newDocCount > 0) {
    modifiedIndices.push(index);
  }
}
```

**Threshold:** Any new documents (>0)

**Accuracy:** 100% for time-series indices (have @timestamp)

**Limitation:** Non-time-series indices (no @timestamp) treated as unchanged
- **Mitigation:** Check doc_count delta (>20% increase = modified)

---

### 3. Data Sampling Strategy

**For modified indices:**

**Full scan:** Sample ALL documents
**Incremental:** Sample ONLY new documents

```typescript
// Old approach
const sample = await esClient.search({
  index: 'logs-endpoint.*',
  size: 100,
  sort: [{ '@timestamp': 'desc' }]
});

// New approach (incremental)
const sample = await esClient.search({
  index: 'logs-endpoint.*',
  size: 100,
  query: {
    range: {
      '@timestamp': { gte: lastRunTimestamp }  // New data only!
    }
  },
  sort: [{ '@timestamp': 'desc' }]
});
```

**Speedup:** Query time 5s → 0.5s (10x faster for large indices)

---

## State Management

### State Schema

```typescript
interface ExplorationState {
  // Timestamp
  last_run_timestamp: string;           // ISO 8601
  last_run_duration_ms: number;

  // Discovery results
  discovered_indices: string[];         // All known indices
  discovered_relationships: Array<{     // All validated joins
    from: string;
    to: string;
    via: string;
    confidence: number;
  }>;
  discovered_patterns: Array<{          // All identified patterns
    pattern_id: string;
    frequency: number;
    last_seen: string;
  }>;

  // Metadata
  generated_skills: string[];           // Skill IDs proposed
  discovery_coverage: number;           // % of expected relationships found
  exploration_mode: 'full' | 'incremental';
  version: string;                      // State schema version
}
```

### Storage

**Index:** `.aesop-exploration-state`

**Document ID:** `latest` (single doc with latest state, overwritten each run)

**Retention:**
- Keep latest state always
- Keep history for 90 days (historical states stored with unique IDs)

**Backup strategy:**
- State loss = fallback to full exploration (safe failure mode)
- Not critical data (can regenerate)

---

## Trade-Offs

### Advantages

- ✅ **8x faster** subsequent explorations
- ✅ **6x cheaper** (token usage)
- ✅ **Enables daily exploration** (was impractical before)
- ✅ **Detects drift/changes** (security posture monitoring)
- ✅ **Scales to large environments** (1000+ indices feasible)

### Disadvantages

- ⚠️ **State management complexity** (must persist/load state reliably)
- ⚠️ **Potential state corruption** (bad state = bad results until full scan)
- ⚠️ **Drift risk** (if change detection misses modifications)
- ⚠️ **Cold start penalty** (first run still takes 2 hours)

### Mitigations

**State corruption:**
- Add state validation on load (schema check, sanity tests)
- Add `force_full_scan` parameter for manual recovery
- Auto-trigger full scan if state age >30 days

**Change detection gaps:**
- Conservative thresholds (mark as modified if uncertain)
- Weekly full scan to catch missed changes
- User can always trigger full scan manually

**Cold start:**
- Provide demo data with pre-populated state (instant demo)
- Document that first run takes time (set expectations)

---

## Migration Strategy

### Phase 1: Implement Incremental (Week 1, Days 1-2)

- ✅ Create `ExplorationStateService` class
- ✅ Create `ChangeDetector` class
- ✅ Create `incremental_exploration.yaml` workflow
- ✅ Add UI toggle (Full vs Incremental)

### Phase 2: Test & Validate (Week 1, Day 2)

- Test: Full exploration → Save state → Incremental exploration → Verify correctness
- Test: Add new index → Incremental discovers it
- Test: Add data to existing index → Incremental processes it
- Test: No changes → Incremental completes in <1 min (early exit)

### Phase 3: Default to Incremental (Week 2)

- Change default: `exploration_mode: 'incremental'`
- Schedule: Daily incremental (2 AM)
- Schedule: Weekly full scan (Sunday 2 AM)
- Document: Recommendation in deployment guide

---

## Operational Model

### Production Schedule

**Daily (Incremental):**
- Trigger: 2 AM (off-peak)
- Duration: 15-30 minutes
- Discovers: Yesterday's new patterns
- Proposes: 0-3 new skills typically

**Weekly (Full Scan):**
- Trigger: Sunday 2 AM
- Duration: 1.5-2 hours
- Purpose: Catch any drift, refresh baseline
- Proposes: 0-5 skills (mostly refreshing existing)

**Manual (Ad-Hoc):**
- Trigger: User-initiated
- Use: After major environment changes (new data sources, integrations)
- Mode: User chooses full vs incremental

---

## Success Criteria

**Incremental exploration is successful if:**

1. **Correctness:** Discovers same relationships as full scan would (≥95% recall)
2. **Performance:** <30 minutes for typical daily delta (<10% of full scan time)
3. **Cost:** <$5 per run (<20% of full scan cost)
4. **Completeness:** Misses <5% of changes (high sensitivity)

**If fails:** Fall back to less frequent full scans (weekly) + manual incremental

---

## Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **State corruption** | High (bad results) | Low (10%) | State validation, force_full_scan recovery |
| **Missed changes** | Medium (incomplete discovery) | Medium (20%) | Weekly full scan, conservative thresholds |
| **Performance regression** | Low (incremental slower than expected) | Low (15%) | Query optimization, caching |
| **Complexity bugs** | Medium (state logic errors) | Medium (25%) | Comprehensive testing, gradual rollout |

---

## References

- Similar patterns in: Elasticsearch snapshot incremental backups
- Industry standard: Git uses incremental updates (not full repo scans)
- Database pattern: Incremental backups vs full backups

---

## Review & Update

**Next Review:** After Week 1, Day 2 (implementation complete)

**Validate:**
- Performance matches estimates (8x speedup)
- Cost savings realized (6x cheaper)
- No correctness regressions (≥95% recall)

**If successful:** ✅ Make incremental the default, document as best practice

**If unsuccessful:** ⚠️ Keep full scans, revisit approach
