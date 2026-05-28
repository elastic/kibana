# ES|QL Composer Solutions: Executive Summary for Platform Team

**Date**: November 5, 2025  
**Author**: Analysis of @kbn/esql-composer vs @kbn/esql-ast composer  
**Status**: Recommendation for consolidation

---

## The Situation

Two ES|QL query builder solutions exist in the codebase:

| Package | Created By | Production Usage | Status |
|---------|-----------|------------------|---------|
| **@kbn/esql-composer** | Observability team | ✅ **17 files** | Active, proven |
| **@kbn/esql-ast composer** | Platform team | ❌ **0 files** | New, unused |

---

## Key Findings

### Production Impact
- **@kbn/esql-composer** is heavily used:
  - `kbn-unified-metrics-grid` - complex metrics queries
  - APM plugin - trace/transaction filtering  
  - Unified doc viewer - log correlation
  
- **@kbn/esql-ast composer** has no production adoption despite being more powerful

### Why @kbn/esql-composer Is Popular
1. ✅ **Simple functional API** - easy to learn
2. ✅ **Perfect for dynamic queries** - spreading operators work naturally
3. ✅ **Composable pattern** - reusable query operators
4. ✅ **Clear syntax** - `?param` and `??identifier` intuitive

### Why @kbn/esql-ast composer Is Better Long-Term
1. ✅ **Full ES|QL support** - all commands, not just 9
2. ✅ **Rich ecosystem** - parser, walker, mutate, builder
3. ✅ **Advanced features** - parameter inlining, SET commands, AST manipulation
4. ✅ **Platform maintained** - official solution
5. ✅ **Better debugging** - tree view, multiple formats

### The Problem
@kbn/esql-ast composer is more powerful but less ergonomic:
- ⚠️ Tagged template syntax less familiar
- ⚠️ Multiple ways to do same thing (confusing)
- ⚠️ Conditional commands more verbose
- ⚠️ No functional operator pattern

---

## Recommendation

**Consolidate to @kbn/esql-ast composer, BUT add functional helpers first.**

### Phase 1: Feature Parity (2 weeks)
Add to @kbn/esql-ast:

```typescript
// 1. Simple functional command builders
export const where = (body: string, params?: Record<string, unknown>) => 
  /* returns command compatible with .pipe() */;

export const stats = (body: string, params?: Record<string, unknown>) => 
  /* same pattern */;

// 2. QueryOperator type support
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// Enable: query.pipe(where('x'), stats('y'), ...operators)

// 3. Better conditional pattern
query.pipeIf(condition, command);  // Helper method
// OR ensure: query.pipe(condition ? cmd : (q) => q) works naturally
```

### Phase 2: Migration (6-8 weeks)
1. Start with simple files (single command usage)
2. Migrate file-by-file with full testing
3. Keep both packages temporarily
4. Monitor for issues

### Phase 3: Deprecation (1 week)
1. Mark @kbn/esql-composer deprecated
2. Archive once all files migrated

---

## Code Comparison

### Current (@kbn/esql-composer)
```typescript
// Clean, functional, proven
from('logs-*')
  .pipe(
    where('service == ?svc', { svc: 'my-service' }),
    includeStats ? stats('avg = AVG(??field)', { field: 'duration' }) : (q) => q,
    keep('@timestamp', 'message'),
    limit(100)
  )
  .toString()
```

### Future (@kbn/esql-ast with helpers)
```typescript
// Same ergonomics + full platform support
esql.from('logs-*')
  .pipe(
    where('service == ?svc', { svc: 'my-service' }),
    includeStats ? stats('avg = AVG(??field)', { field: 'duration' }) : (q) => q,
    keep('@timestamp', 'message'),
    limit(100)
  )
  .print()

// OR use tagged template for static queries:
esql`FROM logs-*
  | WHERE service == ${{ svc: 'my-service' }}
  | ${includeStats ? esql.cmd`STATS avg = AVG(duration)` : esql.nop}
  | KEEP @timestamp, message
  | LIMIT 100`
```

---

## What Makes @kbn/esql-composer Great

### 1. Reusable Query Operators (APM Pattern)
```typescript
// Simple, testable filter functions
export const filterByServiceName = (serviceName: string) => {
  return where(`service.name == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`service.environment == ?environment`, { environment });
};

// Compose easily
from('traces-*')
  .pipe(
    filterByServiceName('checkout'),
    filterByEnvironment('production'),
    ...conditionalFilters,  // Spreading works naturally
    limit(100)
  )
```

**Platform solution needs this pattern!**

### 2. Conditional Commands
```typescript
// Beautiful ternary pattern
const query = from('logs-*')
  .pipe(
    addFilter ? where('x > 1') : (query) => query,  // Identity function
    includeStats ? stats('count = COUNT()') : (q) => q,
    limit(100)
  );

// OR spreading
const optionalCommands = includeStats ? [stats('...')] : [];
query.pipe(...optionalCommands);
```

**Platform solution needs better conditional support!**

### 3. Complex Dynamic Queries (Metrics Grid)
```typescript
// Handles complex programmatic query building
const whereConditions: QueryOperator[] = [];
filters.forEach(f => {
  whereConditions.push(where(`${f.field} IN (...)`, values));
});

const query = timeseries(index).pipe(
  ...whereConditions,  // Spread array of operators
  unfilteredDimensions.length > 0
    ? where(unfilteredDimensions.map(d => `${d} IS NOT NULL`).join(' AND'))
    : (q) => q,
  stats('...'),
  ...(needsCombining ? [evaluate('...'), drop('...')] : [])
);
```

**This pattern is heavily used and should be preserved!**

---

## Migration Risk Assessment

### Low Risk ✅
- Simple queries (single `from` + `limit`)
- Static queries with few parameters
- Files with comprehensive tests

### Medium Risk ⚠️
- Dynamic query building with spreading
- Reusable query operator functions
- Complex conditional logic

### High Risk ❌
- `kbn-unified-metrics-grid` (122-line complex builder)
- APM filters with dynamic field identifiers
- Queries using `replaceParameters` utility

**Recommendation**: Migrate low-risk first, tackle high-risk last with extra testing.

---

## What Platform Team Should Do

### Immediate (This Sprint)
1. ✅ Review this analysis with team
2. ✅ Agree on consolidation approach
3. ✅ Assign owner for feature parity work

### Short-term (Next 2 Weeks)
1. ✅ Add functional command builders to @kbn/esql-ast
   ```typescript
   export { where, stats, keep, drop, sort, limit, rename, evaluate } from './composer/commands';
   ```

2. ✅ Add QueryOperator type support
   ```typescript
   export type QueryOperator = (query: ComposerQuery) => ComposerQuery;
   
   // Modify .pipe() to accept functions:
   pipe(...operators: (QueryOperator | ESQLCommand | ESQLAstItem)[]): ComposerQuery
   ```

3. ✅ Add `.pipeIf()` helper
   ```typescript
   pipeIf(condition: boolean, operator: QueryOperator | ESQLCommand): this {
     return condition ? this.pipe(operator) : this;
   }
   ```

4. ✅ Document migration path with examples

### Medium-term (Next 2 Months)
1. ✅ Write migration guide with code examples
2. ✅ Create codemods if feasible
3. ✅ Pilot migration with 2-3 simple files
4. ✅ Migrate file-by-file with testing
5. ✅ Monitor for issues

### Long-term (Next Quarter)
1. ✅ Complete all migrations
2. ✅ Deprecate @kbn/esql-composer
3. ✅ Archive package
4. ✅ Update documentation

---

## Success Metrics

### Feature Parity Phase
- ✅ Functional helpers added and documented
- ✅ QueryOperator pattern works with spreading
- ✅ Conditional commands as clean as esql-composer
- ✅ Migration guide reviewed by users

### Migration Phase
- ✅ All 17 files successfully migrated
- ✅ Zero production issues
- ✅ Test coverage maintained or improved
- ✅ Team trained on new API

### Deprecation Phase
- ✅ No new usage of @kbn/esql-composer (linter enforced)
- ✅ Package archived
- ✅ Documentation updated

---

## Benefits of Consolidation

### For Developers
- ✅ Single way to build ES|QL queries
- ✅ Full ES|QL command support
- ✅ Better debugging tools
- ✅ Platform-maintained solution

### For Platform
- ✅ Reduced maintenance burden (one solution)
- ✅ Better ecosystem integration
- ✅ Consistent patterns across codebase
- ✅ Easier to add new ES|QL features

### For Product
- ✅ Access to all ES|QL commands
- ✅ Advanced features (SET, parameter inlining, etc.)
- ✅ Better query validation
- ✅ Future-proof solution

---

## Open Questions for Discussion

1. **Timeline**: Is 2 weeks realistic for feature parity work?

2. **Ownership**: Who owns the migration effort?

3. **Testing**: Should we require 1:1 query output matching or allow improvements?

4. **Breaking changes**: Are we willing to update call sites if it improves the API?

5. **Codemods**: Worth investing in automated migration tools?

6. **Deprecation**: How long should we maintain both packages in parallel?

---

## Detailed Analysis Documents

Three comprehensive documents have been created:

1. **ESQL_COMPOSER_COMPARISON.md** (10,000+ words)
   - Detailed feature comparison
   - Architecture deep-dive
   - Strengths and weaknesses
   - Migration recommendations

2. **ESQL_COMPOSER_QUICK_REFERENCE.md** (5,000+ words)
   - Side-by-side API comparison
   - Migration examples
   - Quick reference tables
   - Pattern migration guide

3. **ESQL_COMPOSER_CODE_EXAMPLES.md** (8,000+ words)
   - Real production code examples
   - Side-by-side comparisons
   - Complex query patterns
   - Testing strategies

**All documents available in repo root.**

---

## Conclusion

Both solutions are well-designed, but consolidation makes sense:

- **@kbn/esql-composer** proves the ergonomics work
- **@kbn/esql-ast composer** provides the foundation
- **Consolidation** combines best of both

**Key Insight**: Don't just migrate—**bring the functional elegance of @kbn/esql-composer into @kbn/esql-ast first**, then migration becomes natural.

**Next Step**: Review with platform team and agree on approach.

---

**Contact**: Ready to discuss implementation details, answer questions, or help with migration pilot.

