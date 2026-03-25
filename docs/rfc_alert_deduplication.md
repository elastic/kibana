# RFC: Extract Alert Deduplication as Standalone Package

**RFC ID**: SEC-2026-001
**Author**: Patryk Kopycinski
**Status**: Draft
**Created**: 2026-03-20
**Team**: @elastic/security-generative-ai

---

## Summary

Extract the alert deduplication algorithm from the Alert Investigation Pipeline spike into a standalone, reusable package: `@kbn/alert-deduplication`.

**Current Location**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/deduplication/`
**Proposed Location**: `x-pack/platform/packages/shared/kbn-alert-deduplication/`

**Reusability Score**: ⭐⭐⭐⭐⭐ (Very High)
**Extraction Effort**: 4 days
**Dependencies**: Zero (pure algorithm, no Kibana dependencies)

---

## Motivation

### Problem Statement

The Alert Investigation Pipeline implements a Union-Find clustering algorithm to deduplicate security alerts based on feature similarity. This is a **generic algorithm** applicable to any alert deduplication scenario, not specific to security or Attack Discovery.

**Current Issues:**
1. Code is buried in `elastic_assistant` plugin (hard to discover)
2. Can't be reused by Observability, ML, or other teams
3. Tightly coupled to Attack Discovery context (unnecessary)

### Use Cases Beyond Security

| Team | Use Case | Benefit |
|------|----------|---------|
| **Observability** | Deduplicate infrastructure alerts (same host, similar error) | Reduce noise in alerting dashboard |
| **ML** | Cluster anomaly detection alerts by feature similarity | Group related anomalies |
| **Uptime** | Deduplicate monitor down alerts across regions | Single alert for multi-region outage |
| **Fleet** | Cluster agent heartbeat failures | Identify correlated agent issues |

---

## Proposed Solution

### Package Structure

```
x-pack/platform/packages/shared/kbn-alert-deduplication/
├── README.md
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts                    # Public API
│   ├── types.ts                    # TypeScript types
│   ├── union_find.ts               # Core Union-Find implementation
│   ├── feature_extraction.ts      # Text hashing, field extraction
│   ├── similarity.ts               # Jaccard similarity
│   └── deduplicate.ts              # Main deduplication orchestrator
└── __tests__/
    ├── union_find.test.ts          # 50 tests
    ├── feature_extraction.test.ts  # 40 tests
    ├── similarity.test.ts          # 30 tests
    └── deduplicate.test.ts         # 36 tests (156 total)
```

### Public API

```typescript
// src/index.ts
export { deduplicateAlerts } from './deduplicate';
export { UnionFind } from './union_find';
export { extractFeatures, hashText } from './feature_extraction';
export { jaccardSimilarity } from './similarity';
export type {
  Alert,
  DeduplicationConfig,
  DeduplicationResult,
  Cluster
} from './types';
```

### Example Usage

```typescript
import { deduplicateAlerts } from '@kbn/alert-deduplication';

const alerts = [
  { id: '1', message: 'SSH brute force from 10.0.0.1', severity: 'high' },
  { id: '2', message: 'SSH brute force from 10.0.0.1', severity: 'medium' },
  { id: '3', message: 'Port scan detected', severity: 'low' },
];

const result = deduplicateAlerts(alerts, {
  featureFields: ['message', 'source.ip', 'destination.ip'],
  similarityThreshold: 0.7,
  leaderSelectionCriteria: (a, b) => a.severity > b.severity ? a : b,
});

console.log(result);
// {
//   clusters: [
//     {
//       leader: { id: '1', ... },
//       members: [{ id: '2', ... }],
//       similarity: 0.85
//     },
//     {
//       leader: { id: '3', ... },
//       members: [],
//       similarity: 1.0
//     }
//   ],
//   stats: { total: 3, duplicates: 1, clusters: 2 }
// }
```

---

## Technical Design

### Core Algorithm (Union-Find)

**Current Implementation** (262 lines):
- Disjoint set data structure with path compression
- Union by rank optimization
- O(α(n)) amortized time complexity (α = inverse Ackermann, effectively O(1))

**Extraction Changes**:
- Remove Attack Discovery-specific leader selection (parameterize via callback)
- Generalize "alert" to "item" (keep alert as default type)
- Add configurable feature extraction (currently hardcoded ECS fields)

### Feature Extraction

**Current Implementation** (192 lines):
- Text hashing using DJB2 algorithm
- Field path extraction (supports nested objects)
- String normalization (lowercase, trim, dedupe whitespace)

**Extraction Changes**:
- Remove ECS-specific field mappings (make configurable)
- Add plugin system for custom extractors
- Keep DJB2 hash as default, allow custom hash functions

### Similarity Calculation

**Current Implementation** (Jaccard coefficient):
```typescript
similarity = |A ∩ B| / |A ∪ B|
```

**Extraction Changes**:
- Add pluggable similarity functions (Jaccard, Cosine, Levenshtein)
- Keep Jaccard as default (best for set-based features)

---

## Migration Path

### Phase 1: Extract Package (Week 1)
- [ ] Create package structure in `x-pack/platform/packages/shared/`
- [ ] Copy source files from pipeline spike
- [ ] Remove Attack Discovery-specific code
- [ ] Generalize types (`Alert` → `DeduplicableItem<TAlert>`)
- [ ] Add unit tests (reuse 156 existing tests)

### Phase 2: Update Pipeline (Week 1)
- [ ] Update pipeline to import from `@kbn/alert-deduplication`
- [ ] Remove old deduplication code
- [ ] Verify integration tests still pass

### Phase 3: Documentation (Week 1)
- [ ] Write README with examples
- [ ] Add TSDoc comments to public API
- [ ] Create usage guide for other teams

### Phase 4: Socialize (Week 2)
- [ ] Demo to Observability team
- [ ] Demo to ML team
- [ ] Add to Kibana package registry

---

## API Design

### TypeScript Interface

```typescript
/**
 * Configuration for alert deduplication
 */
export interface DeduplicationConfig<T = unknown> {
  /**
   * Fields to extract for feature comparison
   * @example ['message', 'host.name', 'source.ip']
   */
  featureFields: string[];

  /**
   * Similarity threshold (0-1). Items with similarity >= threshold are clustered.
   * @default 0.7
   */
  similarityThreshold?: number;

  /**
   * Function to select cluster leader from candidates.
   * @default First item in cluster
   */
  leaderSelectionFn?: (a: T, b: T) => T;

  /**
   * Custom feature extractor (optional)
   * @default Built-in text extraction
   */
  featureExtractor?: (item: T, field: string) => string | string[];

  /**
   * Custom similarity function (optional)
   * @default Jaccard coefficient
   */
  similarityFn?: (featuresA: Set<string>, featuresB: Set<string>) => number;
}

/**
 * Result of deduplication
 */
export interface DeduplicationResult<T> {
  /** Clusters of deduplicated items */
  clusters: Array<{
    /** Cluster leader (highest priority item) */
    leader: T;
    /** Other items in cluster */
    members: T[];
    /** Average similarity within cluster */
    similarity: number;
  }>;

  /** Statistics */
  stats: {
    /** Total items processed */
    total: number;
    /** Number of duplicates found */
    duplicates: number;
    /** Number of unique clusters */
    clusters: number;
    /** Processing time (ms) */
    durationMs: number;
  };
}

/**
 * Deduplicate a list of items based on feature similarity
 *
 * @param items - Items to deduplicate
 * @param config - Deduplication configuration
 * @returns Deduplicated clusters with statistics
 *
 * @example
 * ```typescript
 * const alerts = [
 *   { id: '1', message: 'Error A', severity: 10 },
 *   { id: '2', message: 'Error A', severity: 5 },
 * ];
 *
 * const result = deduplicateAlerts(alerts, {
 *   featureFields: ['message'],
 *   similarityThreshold: 0.8,
 *   leaderSelectionFn: (a, b) => a.severity > b.severity ? a : b,
 * });
 * // result.clusters[0].leader.id === '1' (higher severity)
 * ```
 */
export function deduplicateAlerts<T extends { id: string }>(
  items: T[],
  config: DeduplicationConfig<T>
): DeduplicationResult<T>;
```

---

## Testing Strategy

### Unit Tests (Existing: 156 tests)

All existing tests from the pipeline spike will be migrated:
- `union_find.test.ts`: 50 tests (path compression, union by rank)
- `feature_extraction.test.ts`: 40 tests (text hashing, field extraction)
- `similarity.test.ts`: 30 tests (Jaccard, edge cases)
- `deduplicate.test.ts`: 36 tests (E2E deduplication scenarios)

### Integration Tests (New: 20 tests)

Test integration with real Kibana alert data:
- Security alerts (ECS fields)
- Observability alerts (custom fields)
- ML anomaly alerts (numeric features)

### Performance Tests (New: 10 tests)

Benchmark at scale:
- 100 alerts: <10ms
- 1,000 alerts: <100ms
- 10,000 alerts: <2s

---

## Dependencies

### Current Dependencies (from pipeline spike)
- **Zero Kibana dependencies** ✅ (pure algorithm)
- Uses only standard TypeScript/Node.js

### Proposed Dependencies
- `lodash.get` (for nested field extraction) — 5KB
- **Total bundle size**: ~15KB (minified)

---

## Performance Considerations

### Time Complexity
- **Union-Find**: O(α(n)) amortized per operation
- **Feature extraction**: O(n * m) where m = avg fields per alert
- **Similarity**: O(n²) worst case (all-pairs comparison)
- **Overall**: O(n²) for n alerts (acceptable for n < 10,000)

### Optimizations
- Early termination if similarity < threshold
- Memoize feature extraction results
- Parallel similarity computation for large datasets

### Benchmarks (from pipeline spike)
```
100 alerts:   8ms
500 alerts:   45ms
1000 alerts:  102ms
5000 alerts:  1.2s
10000 alerts: 2.1s
```

---

## Alternatives Considered

### Alternative 1: Keep in elastic_assistant
**Pros**: No extraction work
**Cons**: Not discoverable, can't be reused
**Decision**: ❌ Rejected (poor developer experience)

### Alternative 2: Extract to security-specific package
**Location**: `x-pack/solutions/security/packages/kbn-alert-deduplication`
**Pros**: Security team owns it
**Cons**: Observability/ML teams can't easily use it
**Decision**: ❌ Rejected (limits reusability)

### Alternative 3: Extract to platform package (CHOSEN)
**Location**: `x-pack/platform/packages/shared/kbn-alert-deduplication`
**Pros**: Maximum discoverability and reusability
**Cons**: Platform team must approve
**Decision**: ✅ **Selected**

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Platform team rejects package | Low | High | Get early buy-in, show use cases |
| Breaking changes to pipeline | Low | Medium | Comprehensive integration tests |
| Performance regression | Low | Medium | Benchmark before/after extraction |
| Other teams don't adopt | Medium | Low | Proactive demos, documentation |

---

## Success Metrics

### Adoption
- [ ] Used by Alert Investigation Pipeline (baseline)
- [ ] Adopted by ≥1 Observability use case
- [ ] Adopted by ≥1 ML use case
- [ ] Added to Kibana package registry

### Quality
- [ ] 100% test coverage maintained
- [ ] Zero performance regression vs. current implementation
- [ ] <15KB bundle size

### Documentation
- [ ] README with 5+ examples
- [ ] TSDoc comments on all public APIs
- [ ] Usage guide for teams

---

## Timeline

| Week | Milestone | Owner |
|------|-----------|-------|
| **Week 1** | Extract package, update pipeline | @generative-ai |
| **Week 2** | Documentation, demos | @generative-ai |
| **Week 3** | Observability pilot | @observability |
| **Week 4** | ML pilot, package registry | @ml-team |

---

## Open Questions

1. **Package Ownership**: Should @security-generative-ai own this long-term, or transfer to Platform team?
2. **Versioning**: Start at v1.0.0 or v0.1.0 (experimental)?
3. **Similarity Functions**: Should we include Cosine/Levenshtein out-of-the-box or just Jaccard?
4. **Bundle Size**: Is 15KB acceptable for a utility package?

---

## Stakeholders

### Decision Makers
- **@elastic/security-generative-ai** (package owner)
- **@elastic/kibana-operations** (platform package approval)

### Informed
- **@elastic/obs-ux-infra_services-team** (potential consumer)
- **@elastic/ml-ui** (potential consumer)
- **@elastic/kibana-alerting-services** (potential consumer)

---

## Next Steps

1. **Get RFC approval** from Gen AI team lead
2. **Present to Platform team** for package location approval
3. **Create tracking issue** in kibana repo
4. **Assign engineer** for extraction work
5. **Schedule demos** with Observability and ML teams

---

## References

- **Pipeline Spike PR**: https://github.com/elastic/kibana/pull/257957
- **Deduplication Source**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/deduplication/`
- **Union-Find Algorithm**: https://en.wikipedia.org/wiki/Disjoint-set_data_structure
- **Jaccard Similarity**: https://en.wikipedia.org/wiki/Jaccard_index

---

**Approval Signatures**:
- [ ] @elastic/security-generative-ai Team Lead
- [ ] @elastic/kibana-operations (Platform approval)
- [ ] Engineering Manager

**Status**: Draft → awaiting Gen AI team review
