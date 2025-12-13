# ES|QL Query Composer Solutions Comparison

## Executive Summary

Both `@kbn/esql-composer` and `@kbn/esql-ast` (composer module) solve the same problem: building ES|QL queries programmatically in a safe, maintainable way. After analyzing the codebase, **@kbn/esql-composer is currently being used in production** (17 files), while **@kbn/esql-ast composer has no production usage** yet—it's a newer, more comprehensive platform solution.

**Recommendation**: Consolidate to `@kbn/esql-ast` composer, but migrate key ergonomic features from `@kbn/esql-composer` first.

---

## Usage Analysis

### @kbn/esql-composer (Your Solution) - **17 Production Files**
- ✅ **Active production usage**
- **Primary users**:
  - `kbn-unified-metrics-grid` - metrics visualization queries
  - APM plugin - service/transaction filtering
  - Unified doc viewer - trace context queries
  
### @kbn/esql-ast composer (Platform Solution) - **0 Production Files**
- ❌ **No production adoption yet**
- Only test files and examples
- Part of comprehensive AST library

---

## Architecture Comparison

### @kbn/esql-composer (Functional, String-Based)

**Core Pattern**: Functions that return query operators

```typescript
// Simple, functional approach
from('logs-*')
  .pipe(
    where('host.name == ?hostName', { hostName: 'my-host' }),
    stats('avg_duration = AVG(??metricField) BY service.name', { metricField: 'duration' }),
    keep('service.name', 'avg_duration'),
    limit(10)
  )
  .toString()
```

**How it works**:
1. Each command is a function that returns a `QueryOperator`
2. Operators are functions: `(Query) => Query`
3. Pipeline is immutable - each `.pipe()` returns new pipeline
4. Parameters are replaced in AST at `.toString()` or `.asRequest()` time

**Key Files**:
- `src/commands/*.ts` - Individual command builders
- `src/pipeline/create_pipeline.ts` - Pipeline orchestration
- `src/transformers/parameter_replacer.ts` - Parameter substitution

---

### @kbn/esql-ast composer (Tagged Template, AST-First)

**Core Pattern**: Tagged template literals with rich AST manipulation

```typescript
// Tagged template approach
esql`FROM logs-* 
  | WHERE host.name == ${{ hostName: 'my-host' }}
  | STATS avg_duration = AVG(${{ metricField: 'duration' }}) BY service.name
  | KEEP service.name, avg_duration
  | LIMIT 10`
  .print()
```

**How it works**:
1. Uses JavaScript tagged template literals
2. Builds complete AST immediately via `synth` module
3. Parameters stored in `Map<string, unknown>`
4. Supports piping via `.pipe()` tagged template
5. Rich query manipulation methods (`.keep()`, `.drop()`, `.sort()`, etc.)

**Key Files**:
- `src/composer/esql.ts` - Main tag function
- `src/composer/composer_query.ts` - Query class with 1100+ lines
- `src/composer/parameter_hole.ts` - Parameter handling
- Integrates with entire `@kbn/esql-ast` ecosystem (parser, synth, walker, mutate, etc.)

---

## Feature Comparison

| Feature | @kbn/esql-composer | @kbn/esql-ast composer |
|---------|-------------------|----------------------|
| **API Style** | Functional (functions) | Tagged templates + methods |
| **Production Usage** | ✅ 17 files | ❌ 0 files |
| **Parameter Syntax** | `?name` and `??identifier` | `${{ name }}`, `?name`, `esql.par()` |
| **Type Safety** | TypeScript inference on params | Full TypeScript support |
| **Query Construction** | `.pipe()` with operators | `.pipe\`...\``, method chaining |
| **Immutability** | ✅ Each pipe returns new query | ✅ Mutable AST, immutable facade |
| **AST Access** | Limited (via `@kbn/esql-ast` imports) | ✅ Full AST access (`query.ast`) |
| **Error Handling** | Basic parse errors | ✅ Comprehensive validation |
| **Command Support** | 9 commands | ✅ Full ES|QL command set |
| **Output Formats** | `toString()`, `asRequest()` | ✅ `.print()`, `.toRequest()`, multiple formats |
| **Parameter Inlining** | ❌ No | ✅ `.inlineParams()` |
| **SET Commands** | ❌ No | ✅ Full support |
| **Conditional Commands** | `condition ? cmd : (q) => q` | `condition ? esql.cmd\`...\` : esql.nop` |
| **Debug Tools** | Basic | ✅ Rich (`.toString()` shows tree) |
| **Documentation** | 305 lines README | ✅ 656 lines comprehensive README |
| **Testing** | Basic tests | ✅ Extensive test coverage |
| **Integration** | Standalone | ✅ Part of full AST ecosystem |

---

## Detailed Feature Analysis

### 1. Parameter Handling

#### @kbn/esql-composer ✅ **SIMPLER**
```typescript
// Named parameters with ? prefix
where('host.name == ?hostName', { hostName: 'my-host' })

// Field identifiers with ?? prefix  
stats('avg = AVG(??field)', { field: 'duration' })

// Positional parameters
where('host.name IN (?,?,?)', ['host1', 'host2', 'host3'])
```

**Strengths**:
- ✅ Simple, intuitive syntax
- ✅ Clear distinction: `?` = value, `??` = identifier
- ✅ Type inference works well
- ✅ Positional arrays supported

**Weaknesses**:
- ❌ Parameter replacement happens late (at toString/asRequest)
- ❌ No parameter inspection before rendering
- ❌ Cannot inline parameters back into query

---

#### @kbn/esql-ast composer - **MORE FLEXIBLE**
```typescript
// Object shorthand syntax (unique to AST composer)
esql`WHERE host == ${{ hostName: 'my-host' }}`

// Named parameter syntax (similar to composer)
esql`WHERE host == ?hostName`.setParam('hostName', 'my-host')

// Explicit parameter holes
esql`WHERE host == ${esql.par('my-host', 'hostName')}`

// Pre-defined parameters
esql({ hostName: 'my-host' })`WHERE host == ?hostName`
```

**Strengths**:
- ✅ Multiple syntaxes for different use cases
- ✅ Parameters stored immediately in Map
- ✅ Can inspect/modify parameters: `.getParams()`, `.setParam()`, `.inlineParam()`
- ✅ Parameters validated at construction time
- ✅ Automatic parameter renaming on conflicts

**Weaknesses**:
- ❌ More complex API (multiple ways to do same thing)
- ❌ `${{ }}` syntax unusual (though type-safe)

---

### 2. Query Construction Patterns

#### @kbn/esql-composer ✅ **EXCELLENT FUNCTIONAL STYLE**
```typescript
// Beautiful functional composition
const limitReturnedFields = true;

const pipeline = from('logs-*')
  .pipe(
    where('@timestamp <= NOW()'),
    limitReturnedFields 
      ? keep('@timestamp', 'service.name') 
      : (query) => query,
    limit(100)
  );
```

**Strengths**:
- ✅ Very clean functional style
- ✅ Easy to understand and debug
- ✅ Great for conditional logic with ternaries
- ✅ Each command is independent, testable function
- ✅ Perfect for programmatic query building

---

#### @kbn/esql-ast composer - **MORE EXPRESSIVE**
```typescript
// Tagged template literal approach
let query = esql`FROM logs-* | WHERE @timestamp <= NOW()`;

if (limitReturnedFields) {
  query = query.keep('@timestamp', 'service.name');
}

query = query.limit(100);

// OR: inline conditional with esql.nop
const query = esql`FROM logs-*
  | WHERE @timestamp <= NOW()
  | ${limitReturnedFields ? esql.cmd`KEEP @timestamp, service.name` : esql.nop}
  | LIMIT 100`;

// OR: method chaining
const query = esql.from('logs-*')
  .where`@timestamp <= NOW()`
  .keep('@timestamp', 'service.name')
  .limit(100);
```

**Strengths**:
- ✅ Multiple patterns for different scenarios
- ✅ Method chaining feels natural
- ✅ Tagged templates great for static queries
- ✅ Rich query manipulation: `.keep()`, `.drop()`, `.sort()`, `.where\`...\``
- ✅ Supports complex expressions via `esql.exp\`...\``

**Weaknesses**:
- ❌ More ways to do the same thing = more cognitive load
- ❌ Tagged template syntax less familiar to developers

---

### 3. Command Coverage

#### @kbn/esql-composer - **MINIMAL (9 commands)**
```typescript
from, timeseries  // Source commands
where            // Filtering
stats            // Aggregation
eval (as evaluate) // Computation
keep, drop       // Projection
sort             // Ordering
limit            // Limiting
rename           // Renaming
```

**Missing**:
- ❌ JOIN, ENRICH, LOOKUP (data enrichment)
- ❌ DISSECT, GROK (parsing)
- ❌ MV_EXPAND (array expansion)
- ❌ ROW (inline data)
- ❌ SET (query settings)
- ❌ SHOW (metadata)
- ❌ FORK, FUSE (advanced flow)
- ❌ INLINESTATS, CHANGEPOINT, RERANK

---

#### @kbn/esql-ast composer ✅ **COMPLETE ES|QL SUPPORT**

Has comprehensive command coverage including:
- All basic commands (FROM, WHERE, STATS, etc.)
- Advanced commands (JOIN, ENRICH, LOOKUP)
- Parsing (DISSECT, GROK)
- Flow control (FORK, FUSE)
- Analytics (CHANGEPOINT, RERANK)
- Settings (SET)
- Metadata (SHOW)

Plus rich ecosystem:
- Full AST manipulation via `mutate` module
- Command-specific helpers in `commands_registry`
- Validation and autocomplete support
- Pretty printing with multiple formats

---

### 4. Output and Debugging

#### @kbn/esql-composer - **BASIC**
```typescript
query.toString()   // Returns formatted query string
query.asRequest()  // Returns { query: string, params: Params[] }
```

**Strengths**:
- ✅ Simple, focused API
- ✅ Parameters separated in asRequest() output

**Weaknesses**:
- ❌ No debug/inspection tools
- ❌ No AST access
- ❌ Single formatting option

---

#### @kbn/esql-ast composer ✅ **RICH TOOLING**
```typescript
// Multiple print formats
query.print()           // Wrapping format (default, multi-line)
query.print('basic')    // Single line
query.print('wrapping') // Explicit multi-line

// Request format for Elasticsearch
query.toRequest()  // { query: string, params: Array<Record<string, unknown>> }

// Debug view (tree structure)
console.log(query + '')
// ComposerQuery
// ├─ query
// │  └─ FROM index | WHERE foo > ?param
// └─ params
//    └─ param: 123

// Direct AST access
query.ast  // Full ESQLAstQueryExpression

// Parameter inspection/manipulation
query.getParams()           // Get all parameters
query.setParam('key', val)  // Add/update parameter
query.inlineParam('key')    // Inline specific parameter
query.inlineParams()        // Inline all parameters
```

**Strengths**:
- ✅ Rich debugging capabilities
- ✅ Multiple output formats
- ✅ Full AST access for advanced use cases
- ✅ Parameter manipulation post-construction

---

## Real-World Usage Examples

### @kbn/esql-composer Usage Pattern

**From `kbn-unified-metrics-grid/create_esql_query.ts`** (122 lines):
```typescript
export function createESQLQuery({ metric, dimensions = [], filters }: CreateESQLQueryParams) {
  const source = timeseries(metric.index);
  
  const whereConditions: QueryOperator[] = [];
  
  // Build dynamic filters
  if (filters?.length) {
    filters.forEach(filter => {
      whereConditions.push(
        where(`${sanitizeESQLInput(filter.field)} IN (${...})`, filterValues)
      );
    });
  }
  
  // Build query pipeline functionally
  const queryPipeline = source.pipe(
    ...whereConditions,
    unfilteredDimensions.length > 0
      ? where(unfilteredDimensions.map(dim => `${dim} IS NOT NULL`).join(' AND '))
      : (query) => query,
    stats(`${createMetricAggregation({...})} BY ${createTimeBucketAggregation()}...`),
    ...(dimensions.length > 1 ? [
      evaluate(`${DIMENSIONS_COLUMN} = CONCAT(...)`),
      drop(dimensions.join(','))
    ] : [])
  );
  
  return queryPipeline.toString();
}
```

**Strengths in practice**:
- ✅ Excellent for **dynamic, programmatic query building**
- ✅ Easy to conditionally include/exclude commands
- ✅ Natural spreading of command arrays
- ✅ Clear functional flow

**From APM `filters.ts`** - Reusable filter builders:
```typescript
export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

export const filterBySampleRange = (from: number, to: number, txName?: string) => {
  return where(`??durationField >= ?from AND ??durationField <= ?to`, {
    durationField: txName ? TRANSACTION_DURATION : SPAN_DURATION,
    from,
    to,
  });
};

// Usage:
from('traces-*')
  .pipe(
    filterByServiceName('my-service'),
    filterByEnvironment('production'),
    limit(100)
  )
```

**Strengths**:
- ✅ **Composable, reusable filter functions**
- ✅ Easy to test in isolation
- ✅ Clean dependency injection pattern

---

### @kbn/esql-ast composer - Potential Usage

**No production usage yet**, but examples from tests show:

```typescript
// Rich parameter handling
const query = esql({ 
  startTime: '2024-01-01',
  environment: 'production' 
})`
  FROM logs-*
  | WHERE @timestamp >= ?startTime AND env == ?environment
  | STATS count = COUNT(*) BY service.name
`;

// Method chaining
esql.from('logs-*')
  .where`status == "error"`
  .sort(['@timestamp', 'DESC'])
  .keep('service.name', 'message')
  .limit(100);

// Expression building
const conditions: [string[], number][] = [...];
let whereClause = esql.exp`TRUE`;
for (const [field, value] of conditions) {
  whereClause = esql.exp`${whereClause} AND ${esql.col(field)} > ${value}`;
}
const query = esql`FROM users`.pipe`WHERE ${whereClause}`;

// SET commands for query settings
const query = esql`
  SET timezone = "UTC";
  SET max_concurrent_shards = 2;
  FROM logs-* 
  | WHERE @timestamp >= NOW() - 1h
`;
```

---

## Strengths & Weaknesses Summary

### @kbn/esql-composer (Your Solution) ✅

**Strengths**:
1. ✅ **Proven in production** - 17 files across critical paths
2. ✅ **Simple, clean functional API** - easy to learn
3. ✅ **Excellent for dynamic queries** - spreading operators, conditionals work naturally
4. ✅ **Composable filter pattern** - reusable query operators
5. ✅ **Focused scope** - does one thing well
6. ✅ **Clear parameter syntax** - `?` for values, `??` for identifiers
7. ✅ **Immutable pipeline** - functional programming style
8. ✅ **Lightweight** - minimal dependencies

**Weaknesses**:
1. ❌ **Limited command support** - only 9 commands
2. ❌ **No AST access** - can't manipulate queries after construction
3. ❌ **Late parameter binding** - parameters replaced at render time
4. ❌ **No parameter inspection** - can't see params before rendering
5. ❌ **No SET command support**
6. ❌ **Basic output options** - only string and request format
7. ❌ **Not part of platform** - separate package
8. ❌ **No advanced features** - parameter inlining, expression building, etc.

---

### @kbn/esql-ast composer (Platform Solution) ✅

**Strengths**:
1. ✅ **Complete ES|QL support** - all commands, full language coverage
2. ✅ **Rich AST ecosystem** - parser, builder, walker, mutate, synth
3. ✅ **Flexible API** - multiple ways to build queries
4. ✅ **Advanced features** - parameter inlining, SET commands, expression building
5. ✅ **Excellent debugging** - tree view, multiple print formats
6. ✅ **Full parameter control** - inspect, modify, inline anytime
7. ✅ **Platform solution** - official, maintained by platform team
8. ✅ **Comprehensive docs** - 656 line README with examples
9. ✅ **Validation built-in** - catches errors early
10. ✅ **Method chaining** - `.keep()`, `.drop()`, `.sort()`, etc.

**Weaknesses**:
1. ❌ **Zero production usage** - unproven
2. ❌ **Steeper learning curve** - tagged templates, multiple APIs
3. ❌ **More complex** - 1100+ line ComposerQuery class
4. ❌ **Less intuitive** - `${{ param }}` syntax unusual
5. ❌ **Heavier** - full AST library as dependency
6. ❌ **Multiple ways to do same thing** - can be confusing

---

## Migration Considerations

### What Should Be Brought from @kbn/esql-composer to @kbn/esql-ast

#### 1. ✅ **Simple Functional Command Builders** (HIGH PRIORITY)

The platform solution should add convenience functions:

```typescript
// Add to @kbn/esql-ast
export const where = (body: string, params?: Record<string, unknown>) => 
  esql.cmd`WHERE ${body}`.withParams(params);

export const stats = (body: string, params?: Record<string, unknown>) =>
  esql.cmd`STATS ${body}`.withParams(params);

// etc...
```

This would enable:
```typescript
esql.from('logs-*')
  .pipe(
    where('host == ?host', { host: 'my-host' }),  // Simple!
    stats('avg = AVG(??field)', { field: 'duration' })
  )
```

#### 2. ✅ **QueryOperator Pattern** (MEDIUM PRIORITY)

Export a type/helper for the functional operator pattern:

```typescript
// Add to @kbn/esql-ast
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// Enable spreading
query.pipe(
  ...conditionalFilters,  // Array of QueryOperators
  stats('...'),
  ...conditionalProjections
)
```

#### 3. ✅ **Simpler Conditional Command Pattern** (LOW PRIORITY)

The `esql.nop` is good but could be simpler:

```typescript
// Current (esql-ast)
query.pipe`${condition ? esql.cmd`WHERE x` : esql.nop}`

// Better (like esql-composer)
query.pipe(condition ? where('x') : (q) => q)
```

Platform could add: `.pipeIf(condition, command)` helper

---

## Recommendations for Migration

### Phase 1: Feature Parity (Before Migration)
1. ✅ Add functional command builders to `@kbn/esql-ast`
   - `where()`, `stats()`, `keep()`, `drop()`, `sort()`, `limit()`, etc.
   - Should return commands compatible with `.pipe()`
   
2. ✅ Improve conditional command pattern
   - Support: `.pipe(condition ? cmd : (q) => q)` pattern natively
   - Or add: `.pipeIf(condition, command)` helper

3. ✅ Document migration path
   - Clear guide showing @kbn/esql-composer → @kbn/esql-ast equivalents
   - Codemods if possible

### Phase 2: Gradual Migration
1. Start with low-risk files (single command usage)
2. Migrate file-by-file with testing
3. Keep both packages temporarily during transition
4. Monitor for issues

### Phase 3: Deprecation
1. Mark `@kbn/esql-composer` as deprecated
2. Prevent new usage (linter rule)
3. Once all migrated, archive package

---

## Specific Improvement Recommendations for @kbn/esql-ast

### 1. Add Functional Command Helpers

```typescript
// Current: verbose
esql`FROM logs-*`.pipe`WHERE host == ${{ host: 'x' }}`

// Proposed: simpler functional style (from esql-composer)
esql.from('logs-*')
  .pipe(where('host == ?host', { host: 'x' }))
```

### 2. Improve Conditional Command Experience

```typescript
// Current: verbose
const query = esql`FROM logs-*
  | ${includeFilter ? esql.cmd`WHERE x > 42` : esql.nop}`;

// Proposed: cleaner
const query = esql.from('logs-*')
  .pipeIf(includeFilter, where('x > 42'));

// Or support identity function pattern
.pipe(includeFilter ? where('x > 42') : identity)
```

### 3. Simplify Parameter Syntax

```typescript
// Current: unusual syntax
esql`WHERE x == ${{ value }}`  // Object destructuring in template

// Keep supporting, but promote simpler:
esql`WHERE x == ?value`.withParams({ value })
// Or use functional style:
where('x == ?value', { value })
```

### 4. Add Operator Spreading Support

```typescript
// Should work like esql-composer
const filters: QueryOperator[] = [...];
query.pipe(...filters);
```

### 5. Export replaceParameters Utility

Your composer uses `replaceParameters` - make it public in esql-ast:

```typescript
// Already exists internally, just export it
export { replaceParameters } from './composer/util';
```

---

## Conclusion

Both solutions are well-designed for their respective goals:

- **@kbn/esql-composer**: Focused, functional, proven in production
- **@kbn/esql-ast composer**: Comprehensive, flexible, part of platform

**The platform solution wins long-term** for:
- Full ES|QL support
- AST ecosystem integration
- Advanced features
- Platform maintenance

**But migration requires**:
1. Adding functional command helpers (like esql-composer)
2. Better conditional command pattern
3. Clear migration guide
4. Gradual, tested migration path

**Key insight**: Don't just migrate - **bring the best ergonomics from @kbn/esql-composer into @kbn/esql-ast first**, then migration will be easy and natural.

---

## Next Steps

1. **Review with platform team** - validate approach
2. **Implement functional helpers** in @kbn/esql-ast
3. **Create migration guide** with examples
4. **Write codemods** if feasible
5. **Pilot migration** with 1-2 files
6. **Gradual rollout** across codebase
7. **Deprecate @kbn/esql-composer** once complete

---

**Document prepared**: 2025-11-05  
**Analyzed**: 17 production files using @kbn/esql-composer, 0 using @kbn/esql-ast composer  
**Packages**: @kbn/esql-composer (17 files), @kbn/esql-ast (test files only)

