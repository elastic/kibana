# ES|QL Composer Usage Comparison: Current State

**Document Date**: 2025-11-05  
**Status**: Production Analysis

---

## Executive Summary

The Kibana codebase currently has **two competing solutions** for programmatically building ES|QL queries:

1. **`@kbn/esql-composer`** - Functional, lightweight approach with **~17-19 production files**
2. **`@kbn/esql-ast` composer** - Comprehensive AST-based approach with **~0 production files**

### Key Finding

> `@kbn/esql-composer` is actively used in production across critical observability features (APM, metrics, traces), while `@kbn/esql-ast` composer remains unused despite being more feature-complete.

---

## Production Usage Breakdown

### @kbn/esql-composer: 17-19 Production Files ✅

**Primary Usage Areas:**

#### 1. **Unified Metrics Grid** (2 files)
- `src/platform/packages/shared/kbn-unified-metrics-grid/src/common/utils/esql/create_esql_query.ts`
- `src/platform/packages/shared/kbn-unified-metrics-grid/src/common/utils/esql/create_aggregation.ts`

**Pattern**: Complex dynamic query building with conditional dimensions, filters, and aggregations.

```typescript
const queryPipeline = timeseries(index).pipe(
  ...whereConditions,                    // Spread dynamic filters
  unfilteredDimensions.length > 0
    ? where(/* ... */)
    : (query) => query,                  // Identity function for no-op
  stats(/* dynamic aggregation */),
  ...(dimensions.length > 1 ? [/* ... */] : [])  // Conditional array
);
```

---

#### 2. **APM Plugin** (5 files)
Files:
- `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/filters.ts`
- `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/filters.test.ts`
- `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/open_span_in_discover_link.tsx`
- `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/open_in_discover_button.tsx`
- `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/open_error_in_discover_button.tsx`

**Pattern**: Reusable filter functions for building Discover links.

```typescript
// Reusable filter builders
export const filterByServiceName = (serviceName: string) => 
  where(`${SERVICE_NAME} == ?serviceName`, { serviceName });

export const filterByEnvironment = (environment: string) => 
  where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });

export const filterBySampleRange = (from: number, to: number, txName?: string) => 
  where(`??durationField >= ?from AND ??durationField <= ?to`, {
    durationField: txName ? TRANSACTION_DURATION : SPAN_DURATION,
    from,
    to,
  });

// Usage: Compose filters functionally
from('traces-*').pipe(
  filterByServiceName('checkout'),
  filterByEnvironment('production'),
  filterBySampleRange(100, 5000, 'checkout')
);
```

**Why it works**: Each filter is a pure, testable function that returns a `QueryOperator`.

---

#### 3. **Unified Doc Viewer - Traces** (5 files)
Files:
- `src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/common/create_trace_context_where_clause.ts`
- `src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/common/create_trace_context_where_clause.test.ts`
- `src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/components/similar_spans/get_esql_query.ts`
- `src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/components/similar_spans/get_esql_query.test.ts`
- `src/platform/plugins/shared/unified_doc_viewer/public/components/observability/traces/hooks/use_get_generate_discover_link.ts`

**Pattern**: Building WHERE clauses for trace context queries.

```typescript
export function getEsqlQuery({ serviceName, spanName, transactionName, transactionType }) {
  if (transactionType && serviceName && transactionName) {
    return where(
      `${SERVICE_NAME} == ?serviceName 
       AND ${TRANSACTION_NAME} == ?transactionName 
       AND ${TRANSACTION_TYPE} == ?transactionType`,
      { serviceName, transactionName, transactionType }
    );
  }
  if (serviceName && spanName) {
    return where(
      `${SERVICE_NAME} == ?serviceName AND ${SPAN_NAME} == ?spanName`,
      { serviceName, spanName }
    );
  }
  return undefined;
}
```

---

### @kbn/esql-ast composer: 0 Production Files ❌

**Current Usage**: Only test files and examples

Found usages in:
- Test files (`*.test.ts`, `*.test.tsx`)
- Example applications (`examples/esql_ast_inspector/*`)
- Documentation and README files

**Why no adoption?**
1. ❓ **Discoverability** - Teams may not know it exists
2. ❓ **Learning curve** - Tagged template syntax less familiar
3. ❓ **Ergonomics** - Missing functional helpers that `@kbn/esql-composer` has
4. ❓ **Timing** - `@kbn/esql-composer` was built first and filled the gap

---

## Architectural Comparison

### @kbn/esql-composer: Functional Pipeline

**Core Concepts:**
- **QueryOperator**: `(Query) => Query`
- **Immutable Pipeline**: Each `.pipe()` returns new query
- **Late Parameter Binding**: Parameters replaced at `.toString()` or `.asRequest()`

**API Style:**
```typescript
import { from, where, stats, keep, limit } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('host == ?host', { host: 'prod-1' }),
    stats('avg = AVG(??field)', { field: 'duration' }),
    keep('service.name', 'avg'),
    limit(100)
  )
  .toString();
```

**Strengths:**
- ✅ Simple, intuitive API
- ✅ Excellent for dynamic query building
- ✅ Perfect for conditional logic with ternaries
- ✅ Natural spreading: `.pipe(...operators)`
- ✅ Clear parameter syntax: `?value`, `??identifier`
- ✅ Lightweight (minimal dependencies)

**Weaknesses:**
- ❌ Limited commands (9 total)
- ❌ No AST access
- ❌ No advanced features (SET, SHOW, ENRICH, etc.)
- ❌ Late parameter binding (can't inspect before render)
- ❌ Not part of platform ecosystem

---

### @kbn/esql-ast composer: AST-First

**Core Concepts:**
- **ComposerQuery**: Rich query object with full AST
- **Tagged Templates**: `esql\`...\``
- **Immediate AST Construction**: Query parsed at creation
- **Parameter Map**: `Map<string, unknown>` for parameters

**API Style (Multiple Options):**

**Option 1: Tagged Template**
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql`
  FROM logs-*
  | WHERE host == ${{ host: 'prod-1' }}
  | STATS avg = AVG(${{ field: 'duration' }})
  | KEEP service.name, avg
  | LIMIT 100
`;

console.log(query.print());
const request = query.toRequest();
```

**Option 2: Method Chaining**
```typescript
const query = esql.from('logs-*')
  .where`host == ${{ host: 'prod-1' }}`
  .pipe`STATS avg = AVG(${{ field: 'duration' }})`
  .keep('service.name', 'avg')
  .limit(100);
```

**Strengths:**
- ✅ Complete ES|QL support (all commands)
- ✅ Full AST access and manipulation
- ✅ Rich features (parameter inlining, validation, etc.)
- ✅ Multiple output formats
- ✅ Part of comprehensive `@kbn/esql-ast` ecosystem
- ✅ Platform-maintained
- ✅ Extensive documentation

**Weaknesses:**
- ❌ Zero production adoption
- ❌ Steeper learning curve
- ❌ Tagged template syntax less familiar
- ❌ More complex (1100+ line ComposerQuery class)
- ❌ Missing functional helpers for dynamic queries
- ❌ Heavier (full AST parser dependency)

---

## Feature Matrix

| Feature | @kbn/esql-composer | @kbn/esql-ast |
|---------|-------------------|---------------|
| **Production Usage** | ✅ 17-19 files | ❌ 0 files |
| **Command Coverage** | ⚠️ 9 commands | ✅ Full ES|QL |
| **Parameter Syntax** | ✅ `?name`, `??identifier` | ⚠️ `${{ name }}`, `?name` |
| **API Style** | ✅ Functional (simple) | ⚠️ Tagged templates (complex) |
| **Dynamic Queries** | ✅ Excellent | ⚠️ Verbose |
| **Conditional Commands** | ✅ Natural ternaries | ⚠️ `esql.nop` or imperative |
| **Array Spreading** | ✅ `.pipe(...ops)` | ❌ Not supported |
| **Reusable Builders** | ✅ Pure functions | ⚠️ Requires wrappers |
| **AST Access** | ❌ Limited | ✅ Full access |
| **Type Safety** | ✅ Good | ✅ Excellent |
| **Output Formats** | ⚠️ Basic | ✅ Multiple |
| **Parameter Inspection** | ❌ No | ✅ Yes |
| **Parameter Inlining** | ❌ No | ✅ Yes |
| **SET Commands** | ❌ No | ✅ Yes |
| **Debug Tools** | ⚠️ Basic | ✅ Rich |
| **Learning Curve** | ✅ Easy | ⚠️ Moderate |
| **Bundle Size** | ✅ Small | ⚠️ Larger |

---

## Real-World Pattern Comparison

### Pattern 1: Reusable Filter Functions (APM)

**@kbn/esql-composer** ✅ **EXCELLENT**
```typescript
// filters.ts
export const filterByServiceName = (serviceName: string) => 
  where(`${SERVICE_NAME} == ?serviceName`, { serviceName });

export const filterByEnvironment = (environment: string) => 
  where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });

// Usage
from('traces-*').pipe(
  filterByServiceName('checkout'),
  filterByEnvironment('prod'),
  limit(100)
);
```

**@kbn/esql-ast composer** ⚠️ **REQUIRES WRAPPER**
```typescript
// Need to wrap in function that returns compatible format
export const filterByServiceName = (serviceName: string) => 
  esql.cmd`WHERE ${SERVICE_NAME} == ${esql.par(serviceName, 'serviceName')}`;

// Usage - less ergonomic
esql.from('traces-*')
  .pipe`${filterByServiceName('checkout')}`
  .pipe`${filterByEnvironment('prod')}`
  .limit(100);
```

---

### Pattern 2: Dynamic Conditional Commands

**@kbn/esql-composer** ✅ **EXCELLENT**
```typescript
const queryPipeline = from('logs-*').pipe(
  ...whereConditions,                    // Spread array of filters
  unfilteredDimensions.length > 0
    ? where(/* condition */)
    : (query) => query,                  // No-op identity
  stats(/* ... */),
  ...(dimensions.length > 1 ? [eval(), drop()] : [])  // Conditional array
);
```

**@kbn/esql-ast composer** ⚠️ **VERBOSE**
```typescript
let query = esql.from('logs-*');

// Must use imperative style or esql.nop
for (const condition of whereConditions) {
  query = query.pipe`${condition}`;
}

if (unfilteredDimensions.length > 0) {
  query = query.where(/* condition */);
}

query = query.pipe`STATS ...`;

if (dimensions.length > 1) {
  query = query.evaluate(/* ... */).drop(/* ... */);
}
```

---

### Pattern 3: Complex Metrics Query

**From**: `kbn-unified-metrics-grid/create_esql_query.ts`

**@kbn/esql-composer** ✅ **PRODUCTION CODE**
```typescript
const queryPipeline = timeseries(index).pipe(
  ...whereConditions,                              // Dynamic filters
  unfilteredDimensions.length > 0
    ? where(conditions)
    : (query) => query,                            // Identity function
  stats(aggregation, { metricField }),             // Parametrized
  ...(dimensions.length > 1                        // Conditional transform
    ? [evaluate(concat), drop(dimensions)]
    : [])
);
```

**Why it works:**
- ✅ Natural array spreading for dynamic commands
- ✅ Clean ternary for conditional logic
- ✅ Identity function `(q) => q` for no-ops
- ✅ Reads top-to-bottom like a pipeline

---

## Migration Challenges

### If migrating from @kbn/esql-composer → @kbn/esql-ast

**Challenge 1: Array Spreading**
```typescript
// Current (esql-composer)
.pipe(...whereConditions, stats(...), ...transforms)

// Proposed (esql-ast) - NOT SUPPORTED
.pipe(...whereConditions)  // ❌ Doesn't work

// Workaround
let query = base;
for (const cond of whereConditions) {
  query = query.pipe`${cond}`;
}
```

**Challenge 2: Identity Function Pattern**
```typescript
// Current (esql-composer)
.pipe(
  condition ? where('x') : (query) => query  // Clean!
)

// Proposed (esql-ast)
.pipe`${condition ? esql.cmd`WHERE x` : esql.nop}`  // Verbose
```

**Challenge 3: Reusable Builders**
```typescript
// Current (esql-composer)
export const filterByX = (x: string) => where(`field == ?x`, { x });

// Proposed (esql-ast) - needs adjustment
export const filterByX = (x: string) => 
  esql.cmd`WHERE field == ${esql.par(x, 'x')}`;
```

---

## Recommendations

### Short Term (Immediate)

**Keep using `@kbn/esql-composer` for:**
- ✅ Dynamic query building
- ✅ Conditional command logic
- ✅ Reusable filter patterns
- ✅ APM, metrics, trace queries

**Use `@kbn/esql-ast` (direct AST) for:**
- ✅ Query parsing and analysis
- ✅ Query manipulation/transformation
- ✅ Validation and autocomplete

---

### Medium Term (6-12 months)

**Option A: Enhance @kbn/esql-ast composer**
1. Add functional command helpers to match `@kbn/esql-composer` ergonomics
   ```typescript
   // Add to @kbn/esql-ast
   export const where = (condition: string, params?: object) => 
     esql.cmd`WHERE ${condition}`.withParams(params);
   ```

2. Support operator spreading in `.pipe()`
   ```typescript
   query.pipe(...operators)  // Enable this
   ```

3. Add `.pipeIf()` helper
   ```typescript
   query.pipeIf(condition, command)
   ```

4. Create migration guide and codemods

---

**Option B: Keep both, document use cases**
1. **@kbn/esql-composer**: For programmatic query building
2. **@kbn/esql-ast**: For AST manipulation and advanced features
3. Document when to use each
4. Ensure interoperability

---

### Long Term (12+ months)

**Consolidate to single solution** (likely `@kbn/esql-ast` with improved ergonomics)
1. Migrate all `@kbn/esql-composer` usage
2. Deprecate `@kbn/esql-composer`
3. Archive package

---

## Key Insights

### Why @kbn/esql-composer Won (So Far)

1. ✅ **Simple mental model**: Functions that return operators
2. ✅ **Familiar patterns**: Pure functions, composition, ternaries
3. ✅ **Solves real problems**: Dynamic queries for observability
4. ✅ **Low friction**: Easy to learn, easy to use
5. ✅ **Right timing**: Filled gap before platform solution ready

### Why @kbn/esql-ast Hasn't Been Adopted

1. ❌ **Discoverability**: Teams don't know it exists
2. ❌ **Missing ergonomics**: No functional helpers for common patterns
3. ❌ **Learning curve**: Tagged templates unfamiliar
4. ❌ **No clear migration path**: Hard to switch from working solution
5. ❌ **Overkill for common cases**: Full AST power not needed for simple queries

### The Path Forward

> **Don't just migrate - evolve.**

The platform solution (`@kbn/esql-ast`) should **incorporate the best ergonomics** from the community solution (`@kbn/esql-composer`) before expecting adoption.

**Success looks like:**
```typescript
// Future: Best of both worlds
import { esql, where, stats } from '@kbn/esql-ast';

// Functional style (from esql-composer)
const query = esql.from('logs-*')
  .pipe(
    where('host == ?host', { host }),
    ...dynamicFilters,
    condition ? keep('x', 'y') : identity
  );

// Tagged template style (from esql-ast)
const query2 = esql`
  FROM logs-*
  | WHERE host == ${{ host }}
  | STATS count BY service
`;

// Both work, use what fits your use case!
```

---

## Conclusion

**Current State**: `@kbn/esql-composer` is the de facto standard for programmatic ES|QL query building in Kibana observability features.

**Future State**: `@kbn/esql-ast` composer should be the unified solution, but only after incorporating the ergonomic patterns that made `@kbn/esql-composer` successful.

**Action Items**:
1. ✅ Document current usage patterns (this document)
2. ⏳ Propose ergonomic improvements to `@kbn/esql-ast` composer
3. ⏳ Create migration guide with code examples
4. ⏳ Build codemods for automated migration
5. ⏳ Pilot migration with 1-2 files
6. ⏳ Roll out gradually with monitoring
7. ⏳ Deprecate `@kbn/esql-composer` only after full migration

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-05  
**Next Review**: After platform team feedback

