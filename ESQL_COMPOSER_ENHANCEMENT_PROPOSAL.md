# Enhancement Proposal: Functional Helpers for @kbn/esql-ast composer

**Status**: Proposal  
**Target Package**: `@kbn/esql-ast`  
**Author**: Analysis of `@kbn/esql-composer` production usage patterns  
**Date**: 2025-11-05

---

## Problem Statement

The `@kbn/esql-ast` composer is feature-complete and powerful, but has **zero production adoption** despite being the intended platform solution. Meanwhile, `@kbn/esql-composer` (a separate package) is actively used in **17-19 production files** across critical observability features.

### Why This Matters

- **Duplication**: Two packages solving the same problem
- **Maintenance burden**: Both need to be maintained
- **Fragmentation**: Teams don't know which to use
- **Technical debt**: Eventually need to consolidate

### Root Cause

`@kbn/esql-composer` succeeded because it provides **ergonomic patterns for dynamic query building** that `@kbn/esql-ast` composer lacks:

1. ✅ Simple functional API
2. ✅ Natural array spreading for dynamic filters
3. ✅ Clean conditional command pattern
4. ✅ Reusable query operators

---

## Proposal: Add Functional Helpers to @kbn/esql-ast

Add a thin functional layer on top of the existing `@kbn/esql-ast` composer that matches the ergonomics of `@kbn/esql-composer`, while preserving all the power of the full AST solution.

### Design Principles

1. **Backward compatible**: Don't break existing `@kbn/esql-ast` API
2. **Additive**: Build on top, don't replace
3. **Progressive enhancement**: Users can mix styles
4. **Type-safe**: Maintain full TypeScript support
5. **Minimal overhead**: Thin wrappers, no re-parsing

---

## Proposed API

### 1. Functional Command Builders

Add simple functions that return composable commands:

```typescript
// Add to @kbn/esql-ast exports
import { esql } from '@kbn/esql-ast';

export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

export const where = (
  condition: string, 
  params?: Record<string, unknown>
): QueryOperator => {
  return (query) => {
    const cmd = esql.cmd`WHERE ${condition}`;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        cmd.setParam(key, value);
      });
    }
    return query.pipe`${cmd}`;
  };
};

export const stats = (
  aggregation: string,
  params?: Record<string, unknown>
): QueryOperator => {
  return (query) => {
    const cmd = esql.cmd`STATS ${aggregation}`;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        cmd.setParam(key, value);
      });
    }
    return query.pipe`${cmd}`;
  };
};

export const keep = (...fields: string[]): QueryOperator => {
  return (query) => query.keep(...fields);
};

export const drop = (...fields: string[]): QueryOperator => {
  return (query) => query.drop(...fields);
};

export const sort = (
  fields: Array<string | [string, 'ASC' | 'DESC']>
): QueryOperator => {
  return (query) => query.sort(fields);
};

export const limit = (count: number): QueryOperator => {
  return (query) => query.limit(count);
};

export const evaluate = (
  expression: string,
  params?: Record<string, unknown>
): QueryOperator => {
  return (query) => {
    const cmd = esql.cmd`EVAL ${expression}`;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        cmd.setParam(key, value);
      });
    }
    return query.pipe`${cmd}`;
  };
};

export const rename = (
  mapping: Record<string, string>
): QueryOperator => {
  return (query) => {
    const renames = Object.entries(mapping)
      .map(([from, to]) => `${from} AS ${to}`)
      .join(', ');
    return query.pipe`RENAME ${renames}`;
  };
};

// Helper for identity (no-op)
export const identity: QueryOperator = (query) => query;
```

---

### 2. Enhanced .pipe() Method

Modify `ComposerQuery.pipe()` to accept both operators and commands:

```typescript
class ComposerQuery {
  // Existing signature
  pipe(template: TemplateStringsArray, ...holes: any[]): ComposerQuery;
  
  // NEW: Accept function operators
  pipe(...operators: QueryOperator[]): ComposerQuery;
  
  // Combined implementation
  pipe(
    templateOrOperator: TemplateStringsArray | QueryOperator,
    ...holesOrOperators: any[]
  ): ComposerQuery {
    // If first arg is a function, treat as operator(s)
    if (typeof templateOrOperator === 'function') {
      let result = this;
      const operators = [templateOrOperator, ...holesOrOperators];
      for (const op of operators) {
        result = op(result);
      }
      return result;
    }
    
    // Otherwise, existing tagged template behavior
    return this.pipeTaggedTemplate(templateOrOperator, holesOrOperators);
  }
}
```

---

### 3. Conditional Helper

Add `.pipeIf()` for cleaner conditional commands:

```typescript
class ComposerQuery {
  /**
   * Conditionally pipe a command or operator.
   * 
   * @example
   * query.pipeIf(includeFilter, where('host == "prod"'))
   */
  pipeIf(
    condition: boolean,
    operator: QueryOperator | TemplateStringsArray,
    ...holes: any[]
  ): ComposerQuery {
    if (!condition) {
      return this;
    }
    
    if (typeof operator === 'function') {
      return operator(this);
    }
    
    return this.pipe(operator as TemplateStringsArray, ...holes);
  }
}
```

---

## Usage Examples

### Before (Current @kbn/esql-composer)

```typescript
import { from, where, stats, keep, limit } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('host == ?host', { host: 'prod-1' }),
    where('service == ?svc', { svc: 'api' }),
    stats('avg = AVG(??field)', { field: 'duration' }),
    keep('service', 'avg'),
    limit(100)
  )
  .toString();
```

### After (Proposed @kbn/esql-ast)

```typescript
import { esql, where, stats, keep, limit } from '@kbn/esql-ast';

const query = esql.from('logs-*')
  .pipe(
    where('host == ?host', { host: 'prod-1' }),
    where('service == ?svc', { svc: 'api' }),
    stats('avg = AVG(??field)', { field: 'duration' }),
    keep('service', 'avg'),
    limit(100)
  )
  .print();
```

**Difference**: Import source only! The code is nearly identical.

---

## Migration Benefits

### 1. Dynamic Filters (Current Pain Point)

**Before (kbn-unified-metrics-grid)**
```typescript
// @kbn/esql-composer - works great
const whereConditions: QueryOperator[] = [];

filters.forEach(filter => {
  whereConditions.push(
    where(`${field} IN (${placeholders})`, values)
  );
});

const query = timeseries(index).pipe(
  ...whereConditions,  // Spread works!
  stats(/* ... */)
);
```

**After (Proposed @kbn/esql-ast)**
```typescript
// Same exact code, just different import
import { esql, where, stats } from '@kbn/esql-ast';

const whereConditions: QueryOperator[] = [];

filters.forEach(filter => {
  whereConditions.push(
    where(`${field} IN (${placeholders})`, values)
  );
});

const query = esql.ts(index).pipe(
  ...whereConditions,  // NOW WORKS!
  stats(/* ... */)
);
```

---

### 2. Conditional Commands

**Before (@kbn/esql-composer)**
```typescript
from('logs-*').pipe(
  addFilter ? where('x > 42') : (q) => q,  // Clean!
  limit(100)
);
```

**After (Proposed @kbn/esql-ast)**

**Option 1: Same pattern**
```typescript
import { esql, where, identity } from '@kbn/esql-ast';

esql.from('logs-*').pipe(
  addFilter ? where('x > 42') : identity,  // Same!
  limit(100)
);
```

**Option 2: New helper**
```typescript
esql.from('logs-*')
  .pipeIf(addFilter, where('x > 42'))  // Even cleaner!
  .limit(100);
```

---

### 3. Reusable Filters (APM Pattern)

**Before (@kbn/esql-composer)**
```typescript
// filters.ts
import { where } from '@kbn/esql-composer';

export const filterByServiceName = (serviceName: string) => 
  where(`service.name == ?serviceName`, { serviceName });

export const filterByEnvironment = (environment: string) => 
  where(`service.environment == ?environment`, { environment });

// Usage
import { from } from '@kbn/esql-composer';

from('traces-*').pipe(
  filterByServiceName('checkout'),
  filterByEnvironment('production')
);
```

**After (Proposed @kbn/esql-ast)**
```typescript
// filters.ts - EXACT SAME CODE
import { where } from '@kbn/esql-ast';  // Only import changes!

export const filterByServiceName = (serviceName: string) => 
  where(`service.name == ?serviceName`, { serviceName });

export const filterByEnvironment = (environment: string) => 
  where(`service.environment == ?environment`, { environment });

// Usage - EXACT SAME CODE
import { esql } from '@kbn/esql-ast';

esql.from('traces-*').pipe(
  filterByServiceName('checkout'),
  filterByEnvironment('production')
);
```

---

## Implementation Plan

### Phase 1: Core Functional Helpers (1 week)

**File**: `src/platform/packages/shared/kbn-esql-ast/src/composer/functional_helpers.ts`

```typescript
/**
 * Functional query builder helpers for @kbn/esql-ast composer.
 * 
 * These helpers provide an ergonomic functional API for building queries
 * programmatically, inspired by @kbn/esql-composer patterns.
 */

import { ComposerQuery } from './composer_query';
import { esql } from './esql';

export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

export const where = (
  condition: string,
  params?: Record<string, unknown>
): QueryOperator => { /* implementation */ };

export const stats = (
  aggregation: string,
  params?: Record<string, unknown>
): QueryOperator => { /* implementation */ };

export const keep = (...fields: string[]): QueryOperator => { /* implementation */ };

export const drop = (...fields: string[]): QueryOperator => { /* implementation */ };

export const limit = (count: number): QueryOperator => { /* implementation */ };

export const sort = (
  fields: Array<string | [string, 'ASC' | 'DESC']>
): QueryOperator => { /* implementation */ };

export const evaluate = (
  expression: string,
  params?: Record<string, unknown>
): QueryOperator => { /* implementation */ };

export const rename = (
  mapping: Record<string, string>
): QueryOperator => { /* implementation */ };

export const identity: QueryOperator = (query) => query;
```

**Export from index**:
```typescript
// src/platform/packages/shared/kbn-esql-ast/index.ts
export { esql, e } from './src/composer/esql';
export { ComposerQuery } from './src/composer/composer_query';
export type { QueryOperator } from './src/composer/functional_helpers';
export {
  where,
  stats,
  keep,
  drop,
  limit,
  sort,
  evaluate,
  rename,
  identity,
} from './src/composer/functional_helpers';
```

---

### Phase 2: Enhanced .pipe() Method (1 week)

Update `ComposerQuery.pipe()` to accept function operators:

```typescript
// src/platform/packages/shared/kbn-esql-ast/src/composer/composer_query.ts

class ComposerQuery {
  pipe(
    templateOrOperator: TemplateStringsArray | QueryOperator | QueryOperator[],
    ...holesOrOperators: any[]
  ): ComposerQuery {
    // Case 1: Array of operators
    if (Array.isArray(templateOrOperator)) {
      return templateOrOperator.reduce(
        (query, op) => op(query),
        this
      );
    }
    
    // Case 2: Single operator function
    if (typeof templateOrOperator === 'function') {
      const operators = [templateOrOperator, ...holesOrOperators];
      return operators.reduce(
        (query, op) => op(query),
        this
      );
    }
    
    // Case 3: Tagged template (existing behavior)
    return this.pipeTaggedTemplate(templateOrOperator, holesOrOperators);
  }
  
  pipeIf(
    condition: boolean,
    operator: QueryOperator,
    ...args: any[]
  ): ComposerQuery {
    return condition ? this.pipe(operator, ...args) : this;
  }
}
```

---

### Phase 3: Documentation & Examples (3 days)

1. Update `@kbn/esql-ast` README with functional examples
2. Add migration guide from `@kbn/esql-composer`
3. Create example files showing both styles
4. Add API documentation

---

### Phase 4: Testing (1 week)

```typescript
// src/platform/packages/shared/kbn-esql-ast/src/composer/__tests__/functional_helpers.test.ts

describe('Functional helpers', () => {
  describe('where', () => {
    it('creates WHERE operator with parameters', () => {
      const query = esql.from('logs')
        .pipe(where('host == ?host', { host: 'prod-1' }));
      
      expect(query.print()).toContain('WHERE host == ?host');
      expect(query.getParams()).toEqual({ host: 'prod-1' });
    });
  });
  
  describe('pipe with operators', () => {
    it('accepts multiple operators', () => {
      const query = esql.from('logs').pipe(
        where('x == 1'),
        where('y == 2'),
        limit(10)
      );
      
      expect(query.ast.commands).toHaveLength(4); // FROM, WHERE, WHERE, LIMIT
    });
    
    it('supports spreading operator arrays', () => {
      const filters = [
        where('x == 1'),
        where('y == 2'),
      ];
      
      const query = esql.from('logs').pipe(...filters, limit(10));
      
      expect(query.ast.commands).toHaveLength(4);
    });
  });
  
  describe('pipeIf', () => {
    it('pipes when condition is true', () => {
      const query = esql.from('logs')
        .pipeIf(true, where('x == 1'));
      
      expect(query.print()).toContain('WHERE x == 1');
    });
    
    it('skips when condition is false', () => {
      const query = esql.from('logs')
        .pipeIf(false, where('x == 1'));
      
      expect(query.print()).not.toContain('WHERE');
    });
  });
});
```

---

## Compatibility Matrix

| Feature | @kbn/esql-composer | Proposed @kbn/esql-ast | Notes |
|---------|-------------------|----------------------|-------|
| `from()` | ✅ | ✅ `esql.from()` | Different import |
| `where()` | ✅ | ✅ NEW | Same API |
| `stats()` | ✅ | ✅ NEW | Same API |
| `keep()` | ✅ | ✅ NEW | Wrapper for existing method |
| `drop()` | ✅ | ✅ NEW | Wrapper for existing method |
| `limit()` | ✅ | ✅ NEW | Wrapper for existing method |
| `sort()` | ✅ | ✅ NEW | Wrapper for existing method |
| `evaluate()` | ✅ | ✅ NEW | Same API |
| `rename()` | ✅ | ✅ NEW | Same API |
| `.pipe(...ops)` | ✅ | ✅ ENHANCED | Add operator support |
| `.pipeIf()` | ❌ | ✅ NEW | Better than ternary |
| `?param` syntax | ✅ | ✅ | Already supported |
| `??identifier` | ✅ | ✅ Use `dpar` | Need doc update |
| `.toString()` | ✅ | ✅ `.print()` | Method name differs |
| `.asRequest()` | ✅ | ✅ `.toRequest()` | Method name differs |
| AST access | ❌ | ✅ | Major advantage |
| Parameter inlining | ❌ | ✅ | Major advantage |
| Full ES|QL support | ❌ | ✅ | Major advantage |

---

## Migration Checklist for Teams

### Automated (via codemod)
- [ ] Change imports: `@kbn/esql-composer` → `@kbn/esql-ast`
- [ ] Rename `from()` → `esql.from()`
- [ ] Rename `timeseries()` → `esql.ts()`
- [ ] Rename `.toString()` → `.print()`
- [ ] Rename `.asRequest()` → `.toRequest()`

### Manual Review Needed
- [ ] Verify parameter syntax still works
- [ ] Test conditional command patterns
- [ ] Ensure array spreading works
- [ ] Check reusable filter functions

### Testing
- [ ] Run existing unit tests
- [ ] Verify query output matches
- [ ] Test with real Elasticsearch

---

## Success Metrics

### Adoption
- [ ] 3+ files migrated from `@kbn/esql-composer` in first month
- [ ] New features use `@kbn/esql-ast` functional API
- [ ] Zero new usage of `@kbn/esql-composer`

### Quality
- [ ] No regressions in migrated queries
- [ ] Test coverage > 90% for new helpers
- [ ] Documentation complete with examples

### Long-term
- [ ] All 17-19 files migrated within 6 months
- [ ] `@kbn/esql-composer` deprecated
- [ ] Single source of truth for ES|QL query building

---

## Risks & Mitigations

### Risk 1: Breaking Changes
**Mitigation**: Make all changes additive. Don't modify existing API.

### Risk 2: Performance
**Mitigation**: Functional helpers are thin wrappers. Benchmark to confirm no regression.

### Risk 3: Adoption Resistance
**Mitigation**: 
- Make migration trivial (mostly import changes)
- Provide codemods
- Show clear benefits (AST access, more commands)

### Risk 4: Maintenance Burden
**Mitigation**: Helpers are ~200 lines of simple code. Low maintenance.

---

## Alternatives Considered

### Alternative 1: Keep Both Packages ❌
**Pros**: No migration needed  
**Cons**: Ongoing duplication, confusion, maintenance burden

### Alternative 2: Fork @kbn/esql-composer into Platform ❌
**Pros**: Preserve exact API  
**Cons**: Still two implementations, lose AST benefits

### Alternative 3: Force Migration Without Helpers ❌
**Pros**: Clean break  
**Cons**: Teams will resist, bad developer experience

### Alternative 4: Proposed Solution ✅
**Pros**: Best of both worlds, smooth migration  
**Cons**: Slight additional API surface in `@kbn/esql-ast`

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1** | 1 week | Core functional helpers implemented |
| **Phase 2** | 1 week | Enhanced `.pipe()` method |
| **Phase 3** | 3 days | Documentation & examples |
| **Phase 4** | 1 week | Comprehensive testing |
| **Phase 5** | 2 weeks | Pilot migration (2-3 files) |
| **Phase 6** | 3 months | Gradual rollout |
| **Phase 7** | 1 month | Deprecation of `@kbn/esql-composer` |

**Total**: ~4.5 months from start to deprecation

---

## Conclusion

This proposal adds a **thin functional layer** (~200 lines) to `@kbn/esql-ast` that enables the ergonomic patterns that made `@kbn/esql-composer` successful, while preserving all the power of the full AST solution.

**Key Benefits**:
1. ✅ Nearly drop-in replacement for `@kbn/esql-composer`
2. ✅ Enables existing production patterns (spreading, conditionals, reusable filters)
3. ✅ No breaking changes to existing `@kbn/esql-ast` users
4. ✅ Path to single, maintained solution
5. ✅ Teams get AST benefits + familiar API

**Next Steps**:
1. Review and approve proposal
2. Create implementation PR with Phase 1-4
3. Document migration guide
4. Pilot with 2-3 files
5. Roll out gradually
6. Deprecate `@kbn/esql-composer`

---

**Proposal Status**: Ready for Review  
**Estimated Effort**: 3-4 weeks implementation + 3 months migration  
**Impact**: Consolidate to single ES|QL query builder for Kibana

