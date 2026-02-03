# Migration Guide: @kbn/esql-composer → @kbn/esql-ast

**Target Audience**: Kibana developers using `@kbn/esql-composer`  
**Prerequisite**: Functional helpers added to `@kbn/esql-ast` (see Enhancement Proposal)  
**Date**: 2025-11-05

---

## Overview

This guide shows how to migrate from `@kbn/esql-composer` to `@kbn/esql-ast` with minimal code changes. After the migration, you'll have access to:

✅ Full ES|QL command support (not just 9 commands)  
✅ Complete AST access and manipulation  
✅ Parameter inspection and inlining  
✅ Rich debugging and validation tools  
✅ Same ergonomic functional API you're used to

---

## Quick Migration Checklist

### Step 1: Update Imports ⚡️

```diff
- import { from, where, stats, keep, limit } from '@kbn/esql-composer';
+ import { esql, where, stats, keep, limit } from '@kbn/esql-ast';
```

### Step 2: Update Source Commands

```diff
- from('logs-*')
+ esql.from('logs-*')

- timeseries('metrics-*')
+ esql.ts('metrics-*')
```

### Step 3: Update Output Methods

```diff
- query.toString()
+ query.print()

- query.asRequest()
+ query.toRequest()
```

### Step 4: Test!

Most code should work identically. Run your tests and verify output.

---

## Detailed Migration Examples

### Example 1: Basic Query

#### Before (@kbn/esql-composer)
```typescript
import { from, where, keep, limit } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('service.name == ?svc', { svc: 'api' }),
    keep('@timestamp', 'message'),
    limit(100)
  )
  .toString();
```

#### After (@kbn/esql-ast)
```typescript
import { esql, where, keep, limit } from '@kbn/esql-ast';

const query = esql.from('logs-*')  // Changed: from → esql.from
  .pipe(
    where('service.name == ?svc', { svc: 'api' }),
    keep('@timestamp', 'message'),
    limit(100)
  )
  .print();  // Changed: toString → print
```

**Changes**: 
- Import source: `@kbn/esql-composer` → `@kbn/esql-ast`
- Source command: `from()` → `esql.from()`
- Output: `.toString()` → `.print()`

---

### Example 2: Reusable Filters (APM Pattern)

#### Before (@kbn/esql-composer)
```typescript
// File: filters.ts
import { where } from '@kbn/esql-composer';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

// File: query.ts
import { from, limit } from '@kbn/esql-composer';
import { filterByServiceName, filterByEnvironment } from './filters';

const query = from('traces-*')
  .pipe(
    filterByServiceName('checkout'),
    filterByEnvironment('production'),
    limit(1000)
  )
  .toString();
```

#### After (@kbn/esql-ast)
```typescript
// File: filters.ts
import { where } from '@kbn/esql-ast';  // ← Only change!
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

// File: query.ts
import { esql, limit } from '@kbn/esql-ast';  // ← Changed import
import { filterByServiceName, filterByEnvironment } from './filters';

const query = esql.from('traces-*')  // ← Changed from → esql.from
  .pipe(
    filterByServiceName('checkout'),
    filterByEnvironment('production'),
    limit(1000)
  )
  .print();  // ← Changed toString → print
```

**Changes**:
- `filters.ts`: Only import changes!
- `query.ts`: Import, `esql.from()`, and `.print()`

---

### Example 3: Dynamic Filters with Spreading

#### Before (@kbn/esql-composer)
```typescript
import type { QueryOperator } from '@kbn/esql-composer';
import { timeseries, where, stats } from '@kbn/esql-composer';

interface Filter {
  field: string;
  value: string;
}

export function createQuery(
  index: string,
  filters: Filter[]
): string {
  const whereConditions: QueryOperator[] = [];
  
  filters.forEach(filter => {
    whereConditions.push(
      where(`${filter.field} == ?value`, { value: filter.value })
    );
  });
  
  return timeseries(index)
    .pipe(
      ...whereConditions,  // Spread array of operators
      stats('count = COUNT(*)')
    )
    .toString();
}
```

#### After (@kbn/esql-ast)
```typescript
import type { QueryOperator } from '@kbn/esql-ast';  // ← Changed import
import { esql, where, stats } from '@kbn/esql-ast';  // ← Changed import

interface Filter {
  field: string;
  value: string;
}

export function createQuery(
  index: string,
  filters: Filter[]
): string {
  const whereConditions: QueryOperator[] = [];
  
  filters.forEach(filter => {
    whereConditions.push(
      where(`${filter.field} == ?value`, { value: filter.value })
    );
  });
  
  return esql.ts(index)  // ← Changed timeseries → esql.ts
    .pipe(
      ...whereConditions,  // Still works!
      stats('count = COUNT(*)')
    )
    .print();  // ← Changed toString → print
}
```

**Changes**:
- Import source
- `timeseries()` → `esql.ts()`
- `.toString()` → `.print()`
- Everything else identical!

---

### Example 4: Conditional Commands

#### Before (@kbn/esql-composer)
```typescript
import { from, where, keep, limit } from '@kbn/esql-composer';

export function buildQuery(
  addTimeFilter: boolean,
  limitFields: boolean
) {
  return from('logs-*')
    .pipe(
      addTimeFilter 
        ? where('@timestamp >= NOW() - 1h') 
        : (query) => query,  // Identity function
      limitFields
        ? keep('@timestamp', 'service.name')
        : (query) => query,
      limit(100)
    )
    .toString();
}
```

#### After (@kbn/esql-ast)

**Option 1: Same Pattern**
```typescript
import { esql, where, keep, limit, identity } from '@kbn/esql-ast';

export function buildQuery(
  addTimeFilter: boolean,
  limitFields: boolean
) {
  return esql.from('logs-*')
    .pipe(
      addTimeFilter 
        ? where('@timestamp >= NOW() - 1h') 
        : identity,  // Use exported identity helper
      limitFields
        ? keep('@timestamp', 'service.name')
        : identity,
      limit(100)
    )
    .print();
}
```

**Option 2: New .pipeIf() Helper (Cleaner!)**
```typescript
import { esql, where, keep, limit } from '@kbn/esql-ast';

export function buildQuery(
  addTimeFilter: boolean,
  limitFields: boolean
) {
  return esql.from('logs-*')
    .pipeIf(addTimeFilter, where('@timestamp >= NOW() - 1h'))
    .pipeIf(limitFields, keep('@timestamp', 'service.name'))
    .pipe(limit(100))
    .print();
}
```

---

### Example 5: Complex Dynamic Query (Metrics Grid)

This is the most complex real-world example from production.

#### Before (@kbn/esql-composer)
```typescript
import type { QueryOperator } from '@kbn/esql-composer';
import { drop, evaluate, stats, timeseries, where } from '@kbn/esql-composer';

export function createESQLQuery({ 
  metric, 
  dimensions = [], 
  filters 
}: CreateESQLQueryParams) {
  const source = timeseries(metric.index);
  
  const whereConditions: QueryOperator[] = [];
  const valuesByField = new Map<string, Set<string>>();
  
  // Build dynamic WHERE conditions
  if (filters?.length) {
    for (const filter of filters) {
      const values = valuesByField.get(filter.field) ?? new Set();
      values.add(filter.value);
      valuesByField.set(filter.field, values);
    }
    
    valuesByField.forEach((values, field) => {
      const placeholders = Array.from(values).map(() => '?').join(', ');
      whereConditions.push(
        where(`${field} IN (${placeholders})`, Array.from(values))
      );
    });
  }
  
  const unfilteredDimensions = dimensions.filter(
    dim => !valuesByField.has(dim)
  );
  
  // Build pipeline with conditional logic
  const queryPipeline = source.pipe(
    ...whereConditions,
    unfilteredDimensions.length > 0
      ? where(
          unfilteredDimensions
            .map(dim => `${dim} IS NOT NULL`)
            .join(' AND ')
        )
      : (query) => query,
    stats(
      `${createAggregation()} BY ${createBucket()}${dimensionList}`,
      { metricField: metric.name }
    ),
    ...(dimensions.length > 1
      ? [
          evaluate(`combined = CONCAT(${dimensions.join(', " | ", ')})`),
          drop(dimensions.join(','))
        ]
      : [])
  );
  
  return queryPipeline.toString();
}
```

#### After (@kbn/esql-ast)
```typescript
import type { QueryOperator } from '@kbn/esql-ast';  // ← Import change
import { esql, drop, evaluate, stats, where } from '@kbn/esql-ast';  // ← Import change

export function createESQLQuery({ 
  metric, 
  dimensions = [], 
  filters 
}: CreateESQLQueryParams) {
  const source = esql.ts(metric.index);  // ← timeseries → esql.ts
  
  const whereConditions: QueryOperator[] = [];
  const valuesByField = new Map<string, Set<string>>();
  
  // Build dynamic WHERE conditions (IDENTICAL)
  if (filters?.length) {
    for (const filter of filters) {
      const values = valuesByField.get(filter.field) ?? new Set();
      values.add(filter.value);
      valuesByField.set(filter.field, values);
    }
    
    valuesByField.forEach((values, field) => {
      const placeholders = Array.from(values).map(() => '?').join(', ');
      whereConditions.push(
        where(`${field} IN (${placeholders})`, Array.from(values))
      );
    });
  }
  
  const unfilteredDimensions = dimensions.filter(
    dim => !valuesByField.has(dim)
  );
  
  // Build pipeline with conditional logic (IDENTICAL)
  const queryPipeline = source.pipe(
    ...whereConditions,
    unfilteredDimensions.length > 0
      ? where(
          unfilteredDimensions
            .map(dim => `${dim} IS NOT NULL`)
            .join(' AND ')
        )
      : (query) => query,  // Still works!
    stats(
      `${createAggregation()} BY ${createBucket()}${dimensionList}`,
      { metricField: metric.name }
    ),
    ...(dimensions.length > 1
      ? [
          evaluate(`combined = CONCAT(${dimensions.join(', " | ", ')})`),
          drop(dimensions.join(','))
        ]
      : [])
  );
  
  return queryPipeline.print();  // ← toString → print
}
```

**Changes**: Only imports, `esql.ts()`, and `.print()`! 🎉

---

## Migration by File Type

### Pattern 1: Simple Queries
**Effort**: Low (5 minutes per file)  
**Risk**: Very low

```typescript
// Just update imports and method names
- import { from } from '@kbn/esql-composer';
+ import { esql } from '@kbn/esql-ast';

- from('index').pipe(...).toString()
+ esql.from('index').pipe(...).print()
```

### Pattern 2: Reusable Filters
**Effort**: Low (10 minutes per file)  
**Risk**: Low

```typescript
// Update imports, rest stays same
- import { where } from '@kbn/esql-composer';
+ import { where } from '@kbn/esql-ast';
```

### Pattern 3: Complex Dynamic Queries
**Effort**: Medium (30 minutes per file)  
**Risk**: Medium

```typescript
// Same as simple, but more testing needed
// Verify array spreading still works
// Test all conditional branches
```

---

## New Capabilities After Migration

Once migrated, you get access to powerful new features:

### 1. AST Access
```typescript
const query = esql.from('logs').pipe(where('x > 42'));

// Access full AST
console.log(query.ast);
// {
//   type: 'query',
//   commands: [
//     { name: 'from', ... },
//     { name: 'where', ... }
//   ]
// }
```

### 2. Parameter Inspection
```typescript
const query = esql.from('logs')
  .pipe(where('host == ?host', { host: 'prod-1' }));

// Inspect parameters
console.log(query.getParams());
// { host: 'prod-1' }

// Update parameters
query.setParam('host', 'prod-2');

// Inline parameters
query.inlineParam('host');
console.log(query.print());
// FROM logs | WHERE host == "prod-2"
```

### 3. Multiple Output Formats
```typescript
const query = esql.from('logs').pipe(where('x > 42'));

query.print();           // Multi-line, human-readable
query.print('basic');    // Single line
query.toRequest();       // ES request format
query.ast;              // Full AST
```

### 4. Rich Query Manipulation
```typescript
let query = esql.from('logs');

// Method chaining
query = query
  .where`status == "error"`
  .keep('timestamp', 'message')
  .sort(['timestamp', 'DESC'])
  .limit(100);

// Or use functional style
query = query.pipe(
  where('severity == "high"'),
  limit(50)
);
```

### 5. Advanced Commands
```typescript
// SET commands (not in esql-composer!)
const query = esql`
  SET timezone = "UTC";
  FROM logs | WHERE @timestamp > NOW() - 1h
`;

// ENRICH (not in esql-composer!)
query.pipe`ENRICH user-data ON user_id`;

// DISSECT (not in esql-composer!)
query.pipe`DISSECT message "%{date} %{level} %{msg}"`;
```

---

## Common Migration Issues

### Issue 1: Identity Function Not Defined

**Before:**
```typescript
.pipe(condition ? where('x') : (q) => q)
```

**Solution:**
```typescript
import { identity } from '@kbn/esql-ast';
.pipe(condition ? where('x') : identity)
```

### Issue 2: Type Errors on QueryOperator

**Before:**
```typescript
import type { QueryOperator } from '@kbn/esql-composer';
```

**Solution:**
```typescript
import type { QueryOperator } from '@kbn/esql-ast';
```

### Issue 3: `.toString()` Returns Wrong Format

**Before:**
```typescript
query.toString()  // Returns formatted query
```

**Solution:**
```typescript
query.print()      // Multi-line (default)
query.print('basic')  // Single line
```

### Issue 4: `.asRequest()` Not Found

**Before:**
```typescript
query.asRequest()
```

**Solution:**
```typescript
query.toRequest()  // Note: Different method name
```

---

## Testing Strategy

### Unit Tests

Update test imports and assertions:

```diff
- import { from, where } from '@kbn/esql-composer';
+ import { esql, where } from '@kbn/esql-ast';

  describe('createQuery', () => {
    it('builds query with filters', () => {
-     const result = from('logs')
+     const result = esql.from('logs')
        .pipe(where('x == 1'))
-       .toString();
+       .print();
      
      expect(result).toContain('FROM logs');
      expect(result).toContain('WHERE x == 1');
    });
  });
```

### Integration Tests

Verify query output matches:

```typescript
describe('Query output compatibility', () => {
  it('produces identical ES query', () => {
    const oldQuery = /* @kbn/esql-composer result */;
    const newQuery = /* @kbn/esql-ast result */;
    
    expect(newQuery).toEqual(oldQuery);
  });
});
```

---

## Rollback Plan

If you need to rollback:

1. Revert import changes
2. Restore `from()` / `timeseries()` calls
3. Restore `.toString()` / `.asRequest()` calls
4. Run tests

All logic should be identical, so rollback is straightforward.

---

## Automated Migration (Codemod)

We can build a codemod to automate most changes:

```javascript
// transform.js (for jscodeshift)
module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  
  // 1. Update imports
  root
    .find(j.ImportDeclaration, {
      source: { value: '@kbn/esql-composer' }
    })
    .forEach(path => {
      path.node.source.value = '@kbn/esql-ast';
      
      // Update 'from' to 'esql' in specifiers
      path.node.specifiers.forEach(spec => {
        if (spec.type === 'ImportSpecifier' && spec.imported.name === 'from') {
          spec.imported.name = 'esql';
        }
      });
    });
  
  // 2. Update from() calls to esql.from()
  root
    .find(j.CallExpression, {
      callee: { name: 'from' }
    })
    .forEach(path => {
      path.node.callee = j.memberExpression(
        j.identifier('esql'),
        j.identifier('from')
      );
    });
  
  // 3. Update timeseries() to esql.ts()
  root
    .find(j.CallExpression, {
      callee: { name: 'timeseries' }
    })
    .forEach(path => {
      path.node.callee = j.memberExpression(
        j.identifier('esql'),
        j.identifier('ts')
      );
    });
  
  // 4. Update .toString() to .print()
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'toString' }
      }
    })
    .forEach(path => {
      path.node.callee.property.name = 'print';
    });
  
  // 5. Update .asRequest() to .toRequest()
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'asRequest' }
      }
    })
    .forEach(path => {
      path.node.callee.property.name = 'toRequest';
    });
  
  return root.toSource();
};
```

**Usage**:
```bash
npx jscodeshift -t transform.js path/to/files/**/*.ts
```

---

## Migration Order (Recommended)

### Phase 1: Low-Risk Files (Week 1-2)
Start with simple queries that have good test coverage:
1. `unified_doc_viewer/.../get_esql_query.ts`
2. `unified_doc_viewer/.../create_trace_context_where_clause.ts`

### Phase 2: Medium-Risk Files (Week 3-4)
Reusable filter files:
1. `apm/.../filters.ts`
2. Files that use those filters

### Phase 3: High-Risk Files (Week 5-8)
Complex dynamic queries with extensive testing:
1. `kbn-unified-metrics-grid/.../create_esql_query.ts`
2. `kbn-unified-metrics-grid/.../create_aggregation.ts`

---

## Success Checklist

- [ ] All tests pass
- [ ] Query output matches (character-for-character or semantically)
- [ ] No runtime errors
- [ ] TypeScript compiles without errors
- [ ] Linting passes
- [ ] Integration tests pass
- [ ] Manual testing in dev environment

---

## Support

- **Questions**: Ask in #kibana-esql Slack channel
- **Issues**: File in kibana repo with label `Team:ESQL`
- **Documentation**: See `@kbn/esql-ast` README and this guide

---

## Conclusion

Migration from `@kbn/esql-composer` to `@kbn/esql-ast` is straightforward:

1. ✅ Most code stays identical
2. ✅ Only imports and method names change
3. ✅ All patterns (spreading, conditionals, reusable filters) still work
4. ✅ You gain powerful new capabilities (AST access, more commands)

**Estimated effort per file**: 5-30 minutes  
**Risk level**: Low to Medium (with testing)

Start with simple files, verify output, then tackle complex ones. Use the codemod for mechanical changes, but always review and test manually.

---

**Migration Guide Version**: 1.0  
**Last Updated**: 2025-11-05  
**Next Review**: After first successful migration

