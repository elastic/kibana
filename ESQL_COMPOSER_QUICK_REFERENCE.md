# ES|QL Composer Quick Reference & Migration Guide

## TL;DR

**Status**: @kbn/esql-composer (yours) has 17 production files, @kbn/esql-ast composer (platform) has 0.

**Recommendation**: Migrate to @kbn/esql-ast, but add functional helpers first to preserve ergonomics.

---

## Side-by-Side API Comparison

### Basic Query Construction

| Task | @kbn/esql-composer | @kbn/esql-ast composer |
|------|-------------------|----------------------|
| **Simple query** | `from('logs-*').pipe(where('x > 1'), limit(10))` | `esql\`FROM logs-* \| WHERE x > 1 \| LIMIT 10\`` |
| **With parameters** | `where('host == ?name', { name: 'x' })` | `esql\`WHERE host == ${{ name: 'x' }}\`` |
| **Field identifiers** | `stats('avg = AVG(??field)', { field: 'duration' })` | `esql\`STATS avg = AVG(${{ field: 'duration' }})\`` |
| **Method chaining** | ❌ Not supported | `esql.from('logs').where\`x > 1\`.limit(10)` |

---

### Parameter Syntax

| Feature | @kbn/esql-composer | @kbn/esql-ast composer |
|---------|-------------------|----------------------|
| **Named params** | `'x == ?name'` + `{ name: val }` | `\`x == ${{ name: val }}\`` OR `?name` + `.setParam()` |
| **Identifiers** | `'??field'` + `{ field: 'col' }` | `${{ field: 'col' }}` (auto-detects context) |
| **Positional** | `'x IN (?,?,?)'` + `[1,2,3]` | ❌ Not directly supported |
| **Pre-defined** | ❌ | ✅ `esql({ name: val })\`WHERE x == ?name\`` |

---

### Query Output

| Method | @kbn/esql-composer | @kbn/esql-ast composer |
|--------|-------------------|----------------------|
| **String** | `query.toString()` | `query.print()` or `query.print('basic')` |
| **ES Request** | `query.asRequest()` | `query.toRequest()` |
| **Debug** | ❌ | ✅ `console.log(query + '')` shows tree |
| **AST** | ❌ | ✅ `query.ast` |

---

### Conditional Commands

| Pattern | @kbn/esql-composer | @kbn/esql-ast composer |
|---------|-------------------|----------------------|
| **If/else** | `condition ? where('x') : (q) => q` | `condition ? esql.cmd\`WHERE x\` : esql.nop` |
| **Spreading** | ✅ `.pipe(...filters)` | ✅ `.pipe(...filters)` (needs type setup) |
| **External** | `let q = base; if (c) q = q.pipe(...); return q;` | Same, or use `.pipe\`${condition ? cmd : nop}\`` |

---

### Advanced Features

| Feature | @kbn/esql-composer | @kbn/esql-ast composer |
|---------|-------------------|----------------------|
| **Command coverage** | 9 commands | ✅ All ES\|QL commands |
| **SET commands** | ❌ | ✅ `.addSetCommand()`, etc. |
| **Parameter inlining** | ❌ | ✅ `.inlineParams()` |
| **AST manipulation** | ❌ (must use separate imports) | ✅ Full integration |
| **Expression building** | ❌ | ✅ `esql.exp\`complex expr\`` |
| **Multiple sources** | `from('a', 'b', 'c')` | `esql.from('a', 'b', 'c')` |
| **Metadata fields** | ❌ | ✅ `esql.from(['idx'], ['_id', '_index'])` |

---

## Migration Examples

### Example 1: Simple Query

**Before (@kbn/esql-composer)**:
```typescript
import { from, where, keep, limit } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('service.name == ?svc', { svc: 'my-service' }),
    keep('@timestamp', 'message'),
    limit(100)
  )
  .toString();
```

**After (@kbn/esql-ast) - Option A (Tagged Template)**:
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql`
  FROM logs-*
  | WHERE service.name == ${{ svc: 'my-service' }}
  | KEEP @timestamp, message
  | LIMIT 100
`.print();
```

**After (@kbn/esql-ast) - Option B (Method Chaining)**:
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql.from('logs-*')
  .where`service.name == ${{ svc: 'my-service' }}`
  .keep('@timestamp', 'message')
  .limit(100)
  .print();
```

---

### Example 2: Dynamic Filters (Real APM Usage)

**Before (@kbn/esql-composer)**:
```typescript
import { from, where } from '@kbn/esql-composer';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

// Usage:
const query = from('traces-*')
  .pipe(
    filterByServiceName('my-service'),
    filterByEnvironment('production'),
    limit(100)
  );
```

**After (@kbn/esql-ast) - Recommended Pattern**:
```typescript
import { esql } from '@kbn/esql-ast';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';

// Option 1: Return command AST nodes
export const filterByServiceName = (serviceName: string) => {
  return esql.cmd`WHERE ${SERVICE_NAME} == ${esql.par(serviceName, 'serviceName')}`;
};

export const filterByEnvironment = (environment: string) => {
  return esql.cmd`WHERE ${SERVICE_ENVIRONMENT} == ${esql.par(environment, 'environment')}`;
};

// Usage:
const query = esql.from('traces-*')
  .pipe`${filterByServiceName('my-service')}`
  .pipe`${filterByEnvironment('production')}`
  .limit(100);

// Option 2: Just use inline (simpler for this case)
const query = esql.from('traces-*')
  .where`${SERVICE_NAME} == ${{ serviceName: 'my-service' }} 
    AND ${SERVICE_ENVIRONMENT} == ${{ environment: 'production' }}`
  .limit(100);
```

---

### Example 3: Conditional Commands

**Before (@kbn/esql-composer)**:
```typescript
const limitFields = true;

const query = from('logs-*')
  .pipe(
    where('@timestamp <= NOW()'),
    limitFields 
      ? keep('@timestamp', 'service.name') 
      : (query) => query,
    limit(100)
  );
```

**After (@kbn/esql-ast) - Option A**:
```typescript
let query = esql`FROM logs-* | WHERE @timestamp <= NOW()`;

if (limitFields) {
  query = query.keep('@timestamp', 'service.name');
}

query = query.limit(100);
```

**After (@kbn/esql-ast) - Option B**:
```typescript
const query = esql`FROM logs-*
  | WHERE @timestamp <= NOW()
  | ${limitFields ? esql.cmd`KEEP @timestamp, service.name` : esql.nop}
  | LIMIT 100`;
```

---

### Example 4: Complex Dynamic Query (Metrics Grid)

**Before (@kbn/esql-composer)**:
```typescript
import { timeseries, where, stats, evaluate, drop } from '@kbn/esql-composer';

export function createESQLQuery({ metric, dimensions = [], filters }) {
  const source = timeseries(metric.index);
  
  const whereConditions = [];
  if (filters?.length) {
    filters.forEach(filter => {
      whereConditions.push(
        where(`${sanitize(filter.field)} IN (${placeholders})`, values)
      );
    });
  }
  
  const queryPipeline = source.pipe(
    ...whereConditions,
    unfilteredDimensions.length > 0
      ? where(unfilteredDimensions.map(d => `${sanitize(d)} IS NOT NULL`).join(' AND '))
      : (query) => query,
    stats(`${createAgg()} BY ${bucket()}${dimensionList}`),
    ...(dimensions.length > 1 ? [
      evaluate(`combined = CONCAT(${dimensions.join(', " | ", ')})`),
      drop(dimensions.join(','))
    ] : [])
  );
  
  return queryPipeline.toString();
}
```

**After (@kbn/esql-ast)**:
```typescript
import { esql } from '@kbn/esql-ast';

export function createESQLQuery({ metric, dimensions = [], filters }) {
  let query = esql`TS ${metric.index}`;
  
  // Add filters
  if (filters?.length) {
    for (const filter of filters) {
      const field = sanitize(filter.field);
      query = query.pipe`WHERE ${field} IN (${filter.values.map((v, i) => 
        esql.par(v, `filter_${i}`)
      )})`;
    }
  }
  
  // Add dimension filters
  if (unfilteredDimensions.length > 0) {
    const conditions = unfilteredDimensions
      .map(d => `${sanitize(d)} IS NOT NULL`)
      .join(' AND ');
    query = query.where(conditions);
  }
  
  // Stats
  query = query.pipe`STATS ${createAgg()} BY ${bucket()}${dimensionList}`;
  
  // Combine dimensions
  if (dimensions.length > 1) {
    query = query
      .evaluate(`combined = CONCAT(${dimensions.join(', " | ", ')})`)
      .drop(...dimensions);
  }
  
  return query.print();
}
```

---

## Common Patterns Migration

### Pattern 1: Reusable Query Operators

**@kbn/esql-composer** (functional):
```typescript
type QueryOperator = (query: Query) => Query;

const addPaging = (page: number, size: number): QueryOperator => {
  return (query) => query.pipe(limit(size));
};

const addSorting = (field: string): QueryOperator => {
  return (query) => query.pipe(sort(field));
};

// Use:
base.pipe(addPaging(1, 100), addSorting('timestamp'));
```

**@kbn/esql-ast** (needs helper):
```typescript
// For now, would need to use:
let query = base;
query = addPaging(query, 1, 100);
query = addSorting(query, 'timestamp');

// OR define operator type:
type QueryOperator = (query: ComposerQuery) => ComposerQuery;

const addPaging = (page: number, size: number): QueryOperator => 
  (query) => query.limit(size);

// Then: query.pipe(addPaging(1, 100), addSorting('timestamp'))
// (would need .pipe() to accept functions)
```

---

### Pattern 2: Parameter Replacement in Sub-expressions

**@kbn/esql-composer** (with replaceParameters):
```typescript
import { replaceParameters } from '@kbn/esql-composer';
import { Parser, BasicPrettyPrinter } from '@kbn/esql-ast';

function replaceFunctionParams(functionString: string, params: Record<string, any>): string {
  const tempQuery = `TS metrics-* | STATS ${functionString}`;
  const { root: ast } = Parser.parse(tempQuery);
  
  replaceParameters(ast, params);
  
  const functionNode = extractFunctionFromAst(ast);
  return BasicPrettyPrinter.print(functionNode);
}

// Usage:
const result = replaceFunctionParams('AVG(??field)', { field: 'duration' });
// Returns: "AVG(duration)"
```

**@kbn/esql-ast**:
```typescript
// Already integrated! Use ComposerQuery:
const expr = esql.exp`AVG(${{ field: 'duration' }})`;
const result = BasicPrettyPrinter.print(expr);
// Returns: "AVG(?field)" with params { field: 'duration' }

// To inline:
const query = esql`FROM x | STATS ${expr}`;
query.inlineParams();
// Now: "FROM x | STATS AVG(duration)"
```

---

## API Equivalence Table

| @kbn/esql-composer | @kbn/esql-ast composer | Notes |
|-------------------|----------------------|-------|
| `from('index')` | `esql.from('index')` OR `esql\`FROM index\`` | Both work |
| `timeseries('index')` | `esql.ts('index')` OR `esql\`TS index\`` | Both work |
| `where('x == ?p', { p })` | `esql.cmd\`WHERE x == ${{ p }}\`` OR `.where\`x == ${{ p }}\`` | Multiple options |
| `stats('avg = AVG(??f)', {f})` | `esql\`STATS avg = AVG(${{ f }})\`` | Auto-detects identifier |
| `keep('a', 'b')` | `.keep('a', 'b')` | Method available |
| `drop('a')` | `.drop('a')` | Method available |
| `sort('field')` | `.sort('field')` OR `.sort(['field', 'ASC'])` | More options |
| `limit(100)` | `.limit(100)` | Same |
| `rename('old', 'new')` | `.rename({ old: 'new' })` | Different syntax |
| `evaluate('x = y')` | `esql\`EVAL x = y\`` OR `.eval\`x = y\`` | Tagged template |
| `.pipe(...ops)` | `.pipe(...ops)` | Same concept |
| `.toString()` | `.print()` OR `.print('basic')` | Different method |
| `.asRequest()` | `.toRequest()` | Different method |
| N/A | `.ast` | AST access |
| N/A | `.getParams()` | Param inspection |
| N/A | `.setParam(k, v)` | Param modification |
| N/A | `.inlineParams()` | Inline all params |

---

## Immediate Action Items for Platform Team

To make migration easy, add these to @kbn/esql-ast:

### 1. Functional Command Helpers
```typescript
// Add to @kbn/esql-ast/src/composer/commands.ts
export const where = (body: string, params?: Record<string, unknown>) => {
  const cmd = esql.cmd`WHERE ${body}`;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      cmd.setParam(k, v);
    }
  }
  return cmd;
};

export const stats = (body: string, params?: Record<string, unknown>) => {
  // Similar pattern
};

// Export:
export * from './composer/commands';
```

### 2. QueryOperator Type Support
```typescript
// Add to @kbn/esql-ast/src/composer/types.ts
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// Modify ComposerQuery.pipe() to accept:
pipe(...operators: (QueryOperator | ESQLCommand)[]): ComposerQuery;
```

### 3. Helper for Conditionals
```typescript
// Add to ComposerQuery class
pipeIf(condition: boolean, operator: QueryOperator | ESQLCommand): ComposerQuery {
  return condition ? this.pipe(operator) : this;
}
```

---

## Testing Strategy

### Unit Tests
- Test each migrated file's query output matches exactly
- Compare `.toString()` output before/after
- Verify parameter handling (named, positional, identifiers)

### Integration Tests
- Run actual queries against test ES cluster
- Verify results match between implementations
- Test edge cases (empty filters, null values, special characters)

### Performance Tests
- Compare query building performance
- Measure memory usage (especially for complex queries)
- Benchmark parameter replacement

---

## Rollout Plan

### Phase 1: Preparation (1-2 weeks)
- [ ] Add functional helpers to @kbn/esql-ast
- [ ] Write comprehensive migration guide
- [ ] Create codemods (optional but helpful)
- [ ] Set up dual testing (both packages)

### Phase 2: Pilot (1 week)
- [ ] Migrate 2-3 simple files
- [ ] Monitor for issues
- [ ] Gather feedback from developers
- [ ] Adjust migration guide

### Phase 3: Gradual Migration (4-6 weeks)
- [ ] Migrate file-by-file
- [ ] Keep both packages during transition
- [ ] Update documentation
- [ ] Train team members

### Phase 4: Cleanup (1 week)
- [ ] Remove @kbn/esql-composer dependencies
- [ ] Archive package
- [ ] Update linting rules
- [ ] Final documentation update

---

## Key Takeaways

1. ✅ **@kbn/esql-composer is proven** - 17 production files, works well
2. ✅ **@kbn/esql-ast is more powerful** - full ES|QL, better ecosystem
3. ⚠️ **Migration needs care** - add helpers first, test thoroughly
4. 🎯 **Best of both worlds** - bring functional style to platform solution
5. 📈 **Long-term win** - platform solution better for future

**Bottom line**: The migration is worthwhile, but enhance @kbn/esql-ast first to preserve the excellent ergonomics of @kbn/esql-composer.

