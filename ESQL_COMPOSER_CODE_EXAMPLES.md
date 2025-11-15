# ES|QL Composer Code Examples: Side-by-Side Comparison

This document shows real-world code patterns from both implementations to help understand their differences and guide migration.

---

## Example 1: Basic Query Construction

### @kbn/esql-composer (Your Solution)
```typescript
import { from, where, keep, limit } from '@kbn/esql-composer';

const query = from('logs-*')
  .pipe(
    where('service.name == ?svc AND @timestamp > NOW() - 1h', { 
      svc: 'my-service' 
    }),
    keep('@timestamp', 'service.name', 'message'),
    limit(100)
  );

console.log(query.toString());
// Output:
// FROM logs-*
//   | WHERE service.name == "my-service" AND @timestamp > NOW() - 1h
//   | KEEP @timestamp, service.name, message
//   | LIMIT 100

const request = query.asRequest();
// Output:
// {
//   query: "FROM logs-*\n  | WHERE service.name == ?svc ...",
//   params: [{ svc: 'my-service' }]
// }
```

**Key characteristics**:
- ✅ Clean functional style
- ✅ Parameters separated in second argument
- ✅ Simple `.toString()` and `.asRequest()` methods
- ✅ Immutable - each `.pipe()` returns new query

---

### @kbn/esql-ast composer (Platform Solution)

**Option A: Tagged Template (Most Concise)**
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql`
  FROM logs-*
  | WHERE service.name == ${{ svc: 'my-service' }} AND @timestamp > NOW() - 1h
  | KEEP @timestamp, service.name, message
  | LIMIT 100
`;

console.log(query.print());
// Same output as above

const request = query.toRequest();
// Output:
// {
//   query: "FROM logs-*\n  | WHERE service.name == ?svc ...",
//   params: [{ svc: 'my-service' }]
// }
```

**Option B: Method Chaining (Most Flexible)**
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql.from('logs-*')
  .where`service.name == ${{ svc: 'my-service' }} AND @timestamp > NOW() - 1h`
  .keep('@timestamp', 'service.name', 'message')
  .limit(100);

// Same output methods
console.log(query.print());
const request = query.toRequest();
```

**Option C: Mixed (Most Like esql-composer)**
```typescript
import { esql } from '@kbn/esql-ast';

const query = esql.from('logs-*')
  .pipe`WHERE service.name == ${{ svc: 'my-service' }} AND @timestamp > NOW() - 1h`
  .pipe`KEEP @timestamp, service.name, message`
  .limit(100);
```

**Key characteristics**:
- ✅ Multiple API styles for different use cases
- ✅ Tagged template syntax powerful but unusual
- ✅ Built-in AST manipulation
- ✅ More output options (`.print()`, `.print('basic')`)

---

## Example 2: Reusable Query Builders (APM Pattern)

This is a real pattern from APM plugin - building reusable filter functions.

### @kbn/esql-composer
```typescript
// File: filters.ts
import { where } from '@kbn/esql-composer';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  SPAN_NAME,
} from '@kbn/apm-types';

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

export const filterByTransactionNameOrSpanName = (
  transactionName: string | undefined,
  spanName: string | undefined
) => {
  return where(`??nameField == ?name`, {
    nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
    name: (transactionName ?? spanName) as string,
  });
};

export const filterBySampleRange = (
  sampleRangeFrom: number,
  sampleRangeTo: number,
  transactionName: string | undefined
) => {
  return where(
    `??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`,
    {
      durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
      sampleRangeFrom,
      sampleRangeTo,
    }
  );
};

// Usage:
import { from } from '@kbn/esql-composer';

const query = from('traces-*')
  .pipe(
    filterByServiceName('checkout-service'),
    filterByEnvironment('production'),
    filterBySampleRange(100, 5000, 'checkout'),
    limit(1000)
  );
```

**Why this works well**:
- ✅ Each filter is a pure function
- ✅ Easy to test in isolation
- ✅ Compose with spreading: `.pipe(...conditionalFilters)`
- ✅ Clear what each filter does
- ✅ Type-safe parameters

---

### @kbn/esql-ast composer

**Option A: Return Command Nodes**
```typescript
// File: filters.ts
import { esql } from '@kbn/esql-ast';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  SPAN_NAME,
} from '@kbn/apm-types';

export const filterByServiceName = (serviceName: string) => {
  return esql.cmd`WHERE ${SERVICE_NAME} == ${esql.par(serviceName, 'serviceName')}`;
};

export const filterByEnvironment = (environment: string) => {
  return esql.cmd`WHERE ${SERVICE_ENVIRONMENT} == ${esql.par(environment, 'environment')}`;
};

export const filterByTransactionNameOrSpanName = (
  transactionName: string | undefined,
  spanName: string | undefined
) => {
  const nameField = transactionName ? TRANSACTION_NAME : SPAN_NAME;
  const name = (transactionName ?? spanName) as string;
  
  return esql.cmd`WHERE ${esql.dpar(nameField, 'nameField')} == ${esql.par(name, 'name')}`;
};

export const filterBySampleRange = (
  sampleRangeFrom: number,
  sampleRangeTo: number,
  transactionName: string | undefined
) => {
  const durationField = transactionName ? TRANSACTION_DURATION : SPAN_DURATION;
  
  return esql.cmd`WHERE ${esql.dpar(durationField, 'durationField')} >= ${esql.par(sampleRangeFrom, 'from')}
    AND ${esql.dpar(durationField, 'durationField')} <= ${esql.par(sampleRangeTo, 'to')}`;
};

// Usage:
const query = esql.from('traces-*')
  .pipe`${filterByServiceName('checkout-service')}`
  .pipe`${filterByEnvironment('production')}`
  .pipe`${filterBySampleRange(100, 5000, 'checkout')}`
  .limit(1000);
```

**Option B: Return Query Operators (More Like esql-composer)**
```typescript
// Define operator type first
type QueryOperator = (query: ComposerQuery) => ComposerQuery;

export const filterByServiceName = (serviceName: string): QueryOperator => {
  return (query) => query.pipe`WHERE ${SERVICE_NAME} == ${esql.par(serviceName, 'serviceName')}`;
};

// Usage (same as esql-composer if .pipe() accepts functions):
const query = esql.from('traces-*')
  .pipe(
    filterByServiceName('checkout-service'),
    filterByEnvironment('production'),
    limit(1000)
  );

// Note: This would require .pipe() to accept function operators
```

**Option C: Just Use Methods Directly (Simplest for this case)**
```typescript
// No separate filter functions needed
const query = esql.from('traces-*')
  .where`${SERVICE_NAME} == ${{ serviceName: 'checkout-service' }}
    AND ${SERVICE_ENVIRONMENT} == ${{ environment: 'production' }}`
  .limit(1000);
```

---

## Example 3: Complex Dynamic Query (Metrics Grid)

This is the most complex real-world example from `kbn-unified-metrics-grid`.

### @kbn/esql-composer (Original Implementation)
```typescript
import type { QueryOperator } from '@kbn/esql-composer';
import { drop, evaluate, stats, timeseries, where } from '@kbn/esql-composer';
import { sanitizeESQLInput } from '@kbn/esql-utils';

interface CreateESQLQueryParams {
  metric: MetricField;
  dimensions?: string[];
  filters?: Array<{ field: string; value: string }>;
}

export function createESQLQuery({ 
  metric, 
  dimensions = [], 
  filters 
}: CreateESQLQueryParams) {
  const { name: metricField, instrument, index, dimensions: metricDimensions } = metric;
  
  // Start with timeseries command
  const source = timeseries(index);
  
  // Build WHERE conditions from filters
  const whereConditions: QueryOperator[] = [];
  const valuesByField = new Map<string, Set<string>>();
  
  if (filters && filters.length) {
    for (const filter of filters) {
      const currentValues = valuesByField.get(filter.field);
      if (currentValues) {
        currentValues.add(filter.value);
      } else {
        valuesByField.set(filter.field, new Set([filter.value]));
      }
    }

    valuesByField.forEach((values, key) => {
      const placeholders = new Array(values.size).fill('?').join(', ');
      whereConditions.push(
        where(`${sanitizeESQLInput(key)} IN (${placeholders})`, Array.from(values))
      );
    });
  }
  
  // Determine dimension type for casting
  const dimensionTypeMap = new Map(
    metricDimensions?.map((dim) => [dim.name, dim.type])
  );
  
  const unfilteredDimensions = dimensions.filter((dim) => !valuesByField.has(dim));
  
  // Build the complete pipeline
  const queryPipeline = source.pipe(
    // Spread WHERE conditions
    ...whereConditions,
    
    // Add IS NOT NULL check for unfiltered dimensions
    unfilteredDimensions.length > 0
      ? where(
          unfilteredDimensions
            .map((dim) => `${sanitizeESQLInput(dim)} IS NOT NULL`)
            .join(' AND ')
        )
      : (query) => query,  // No-op if no dimensions
    
    // STATS aggregation with dynamic grouping
    stats(
      `${createMetricAggregation({
        instrument,
        placeholderName: 'metricField',
      })} BY ${createTimeBucketAggregation({})}${
        dimensions.length > 0
          ? `, ${dimensions.map((dim) => sanitizeESQLInput(dim)).join(',')}`
          : ''
      }`,
      { metricField }
    ),
    
    // Conditionally add dimension concatenation (only if multiple dimensions)
    ...(dimensions.length > 1
      ? [
          evaluate(
            `${DIMENSIONS_COLUMN} = CONCAT(${dimensions
              .map((dim) => {
                const dimType = dimensionTypeMap.get(dim);
                const escapedDim = sanitizeESQLInput(dim);
                // Cast non-keyword types to string for CONCAT
                return dimType && needsStringCasting(dimType)
                  ? `${escapedDim}::STRING`
                  : escapedDim;
              })
              .join(`, " ${separator} ", `)})`
          ),
          drop(`${dimensions.map((dim) => sanitizeESQLInput(dim)).join(',')}`),
        ]
      : [])  // Empty array if single dimension
  );

  return queryPipeline.toString();
}

// Helper functions
function createMetricAggregation({ instrument, placeholderName }) {
  return instrument === 'counter'
    ? `SUM(RATE(??${placeholderName}))`
    : `AVG(??${placeholderName})`;
}

function createTimeBucketAggregation() {
  return `BUCKET(@timestamp, 100, ?_tstart, ?_tend)`;
}

function needsStringCasting(fieldType: ES_FIELD_TYPES): boolean {
  return DIMENSION_TYPES.includes(fieldType) && fieldType !== ES_FIELD_TYPES.KEYWORD;
}
```

**Why this works well**:
- ✅ Spreading `...whereConditions` is natural
- ✅ Conditional operators with ternary: `condition ? where(...) : (q) => q`
- ✅ Spreading arrays: `...(dimensions.length > 1 ? [...] : [])`
- ✅ Each piece is modular and testable
- ✅ Clear flow from top to bottom

---

### @kbn/esql-ast composer (Refactored Version)

**Approach 1: Imperative (Most Similar)**
```typescript
import { esql } from '@kbn/esql-ast';
import { sanitizeESQLInput } from '@kbn/esql-utils';

export function createESQLQuery({ 
  metric, 
  dimensions = [], 
  filters 
}: CreateESQLQueryParams) {
  const { name: metricField, instrument, index, dimensions: metricDimensions } = metric;
  
  // Start with timeseries
  let query = esql.ts(index);
  
  // Build filter map
  const valuesByField = new Map<string, Set<string>>();
  if (filters?.length) {
    for (const filter of filters) {
      const values = valuesByField.get(filter.field) ?? new Set();
      values.add(filter.value);
      valuesByField.set(filter.field, values);
    }
  }
  
  // Add WHERE conditions
  for (const [field, values] of valuesByField) {
    const valueArray = Array.from(values);
    const params = Object.fromEntries(
      valueArray.map((v, i) => [`filter_${field}_${i}`, v])
    );
    
    const placeholders = valueArray.map((_, i) => `?filter_${field}_${i}`).join(', ');
    query = query.pipe`WHERE ${sanitizeESQLInput(field)} IN (${placeholders})`;
    
    // Set parameters
    for (const [k, v] of Object.entries(params)) {
      query.setParam(k, v);
    }
  }
  
  // Add IS NOT NULL for unfiltered dimensions
  const unfilteredDimensions = dimensions.filter(dim => !valuesByField.has(dim));
  if (unfilteredDimensions.length > 0) {
    const conditions = unfilteredDimensions
      .map(dim => `${sanitizeESQLInput(dim)} IS NOT NULL`)
      .join(' AND ');
    query = query.where(conditions);
  }
  
  // Build STATS
  const aggFunction = createMetricAggregation({ instrument, placeholderName: 'metricField' });
  const bucket = createTimeBucketAggregation();
  const dimensionList = dimensions.length > 0
    ? `, ${dimensions.map(d => sanitizeESQLInput(d)).join(', ')}`
    : '';
  
  query = query.pipe`STATS ${aggFunction} BY ${bucket}${dimensionList}`;
  query.setParam('metricField', metricField);
  
  // Combine dimensions if multiple
  if (dimensions.length > 1) {
    const dimensionTypeMap = new Map(
      metricDimensions?.map(dim => [dim.name, dim.type])
    );
    
    const concatArgs = dimensions
      .map(dim => {
        const escapedDim = sanitizeESQLInput(dim);
        const dimType = dimensionTypeMap.get(dim);
        return dimType && needsStringCasting(dimType)
          ? `${escapedDim}::STRING`
          : escapedDim;
      })
      .join(`, " ${separator} ", `);
    
    query = query
      .evaluate(`${DIMENSIONS_COLUMN} = CONCAT(${concatArgs})`)
      .drop(...dimensions);
  }
  
  return query.print();
}
```

**Approach 2: Declarative (Using Tagged Template)**
```typescript
export function createESQLQuery({ 
  metric, 
  dimensions = [], 
  filters 
}: CreateESQLQueryParams) {
  // Build parameter object upfront
  const params: Record<string, unknown> = {
    metricField: metric.name,
    _tstart: '...',
    _tend: '...',
  };
  
  // Build filter conditions
  const filterConditions: string[] = [];
  filters?.forEach((filter, idx) => {
    const paramName = `filter_${idx}`;
    params[paramName] = filter.value;
    filterConditions.push(`${sanitizeESQLInput(filter.field)} == ?${paramName}`);
  });
  
  // Build dimension conditions
  const dimensionConditions = dimensions
    .map(dim => `${sanitizeESQLInput(dim)} IS NOT NULL`)
    .join(' AND ');
  
  // Combine all conditions
  const allConditions = [...filterConditions];
  if (dimensionConditions) {
    allConditions.push(dimensionConditions);
  }
  
  // Build complete query
  const whereClause = allConditions.length > 0
    ? `WHERE ${allConditions.join(' AND ')}`
    : '';
  
  const aggFunction = createMetricAggregation({ instrument: metric.instrument });
  const bucket = createTimeBucketAggregation();
  const dimensionList = dimensions.length > 0
    ? `, ${dimensions.map(d => sanitizeESQLInput(d)).join(', ')}`
    : '';
  
  let query = esql(params)`
    TS ${metric.index}
    | ${whereClause ? esql.cmd(whereClause) : esql.nop}
    | STATS ${aggFunction} BY ${bucket}${dimensionList}
  `;
  
  // Add dimension combination if needed
  if (dimensions.length > 1) {
    const concatArgs = dimensions.map(d => sanitizeESQLInput(d)).join(', " | ", ');
    query = query
      .evaluate(`${DIMENSIONS_COLUMN} = CONCAT(${concatArgs})`)
      .drop(...dimensions);
  }
  
  return query.print();
}
```

**Key Differences**:
- ⚠️ More verbose without spreading operators
- ⚠️ Parameter handling more manual
- ✅ Can use `.evaluate()` and `.drop()` methods
- ✅ Full AST access if needed
- ⚠️ Conditional commands less elegant without `(q) => q` pattern

---

## Example 4: Conditional Commands

### @kbn/esql-composer
```typescript
import { from, where, keep, limit } from '@kbn/esql-composer';

const limitReturnedFields = true;
const addTimeFilter = false;

const query = from('logs-*')
  .pipe(
    // Conditional filter
    addTimeFilter 
      ? where('@timestamp >= NOW() - 1h') 
      : (query) => query,
    
    // Conditional projection
    limitReturnedFields 
      ? keep('@timestamp', 'service.name') 
      : (query) => query,
    
    limit(100)
  );

// OR with spreading:
const optionalFilters = addTimeFilter 
  ? [where('@timestamp >= NOW() - 1h')] 
  : [];

const query = from('logs-*')
  .pipe(
    ...optionalFilters,
    limitReturnedFields ? keep('@timestamp', 'service.name') : (q) => q,
    limit(100)
  );
```

---

### @kbn/esql-ast composer

**Option A: Imperative Style**
```typescript
let query = esql`FROM logs-*`;

if (addTimeFilter) {
  query = query.where`@timestamp >= NOW() - 1h`;
}

if (limitReturnedFields) {
  query = query.keep('@timestamp', 'service.name');
}

query = query.limit(100);
```

**Option B: Using esql.nop**
```typescript
const query = esql`FROM logs-*
  | ${addTimeFilter ? esql.cmd`WHERE @timestamp >= NOW() - 1h` : esql.nop}
  | ${limitReturnedFields ? esql.cmd`KEEP @timestamp, service.name` : esql.nop}
  | LIMIT 100`;
```

**Option C: Method Chaining with pipeIf (If Added)**
```typescript
const query = esql.from('logs-*')
  .pipeIf(addTimeFilter, esql.cmd`WHERE @timestamp >= NOW() - 1h`)
  .pipeIf(limitReturnedFields, esql.cmd`KEEP @timestamp, service.name`)
  .limit(100);
```

---

## Example 5: Parameter Replacement in Expressions

This pattern is used in `kbn-unified-metrics-grid` to safely build aggregation expressions.

### @kbn/esql-composer (Current Pattern)
```typescript
import { replaceParameters } from '@kbn/esql-composer';
import { Parser, BasicPrettyPrinter } from '@kbn/esql-ast';

/**
 * Replaces parameters in a function expression string.
 * Example: replaceFunctionParams('AVG(??field)', { field: 'duration' })
 * Returns: 'AVG(duration)'
 */
export function replaceFunctionParams(
  functionString: string, 
  params: Record<string, any>
): string {
  // 1. Wrap in temporary query to parse
  const tempQuery = `TS metrics-* | STATS ${functionString}`;
  const { root: ast } = Parser.parse(tempQuery);
  
  // 2. Replace parameters in AST
  replaceParameters(ast, params);
  
  // 3. Extract and print the function node
  const functionNode = getFunctionNodeFromAst(ast);
  if (functionNode) {
    return BasicPrettyPrinter.print(functionNode).trim();
  }
  
  return functionString;
}

// Usage:
const aggregation = replaceFunctionParams('AVG(??metricField)', { 
  metricField: 'system.load.1' 
});
// Returns: "AVG(system.load.`1`)"  // Properly escaped!

const query = timeseries('metrics-*')
  .pipe(stats(`${aggregation} BY BUCKET(@timestamp, 100)`));
```

---

### @kbn/esql-ast composer (Integrated)
```typescript
import { esql, BasicPrettyPrinter } from '@kbn/esql-ast';

// Option 1: Build expression directly
const aggregation = esql.exp`AVG(${{ metricField: 'system.load.1' }})`;

// To get as string with parameters:
const aggString = BasicPrettyPrinter.print(aggregation);
// Returns: "AVG(?metricField)"

// To get with inlined values:
const query = esql`TS metrics-* | STATS ${aggregation} BY BUCKET(@timestamp, 100)`;
query.inlineParams();
const inlinedAgg = query.print();
// Returns: "TS metrics-* | STATS AVG(system.load.`1`) BY BUCKET(@timestamp, 100)"

// Option 2: Use Builder directly
import { Builder } from '@kbn/esql-ast';

const aggregation = Builder.expression.func.call('AVG', [
  Builder.expression.column({ name: 'system', parts: ['load', '1'] })
]);

// Option 3: If you have a parameterized expression string, just inline
const query = esql`TS metrics-*
  | STATS AVG(${{ metricField: 'system.load.1' }}) BY BUCKET(@timestamp, 100)
`;
query.inlineParam('metricField');  // Inline just this parameter
```

**Key Advantage**: 
- ✅ No need for temporary query wrapper
- ✅ Direct expression building
- ✅ Parameter inlining built-in
- ✅ Proper escaping handled automatically

---

## Example 6: Multiple Queries with Shared Filters

### @kbn/esql-composer
```typescript
import { from, where, stats, limit } from '@kbn/esql-composer';

// Define shared filters
const timeFilter = where('@timestamp >= NOW() - 1h');
const serviceFilter = where('service.name == ?svc', { svc: 'checkout' });

// Query 1: Count by level
const countByLevel = from('logs-*')
  .pipe(
    timeFilter,
    serviceFilter,
    stats('count = COUNT(*) BY log.level')
  );

// Query 2: Recent errors
const recentErrors = from('logs-*')
  .pipe(
    timeFilter,
    serviceFilter,
    where('log.level == "ERROR"'),
    limit(100)
  );

// Query 3: With additional filter
const productionErrors = from('logs-*')
  .pipe(
    timeFilter,
    serviceFilter,
    where('service.environment == "production"'),
    where('log.level == "ERROR"'),
    limit(100)
  );
```

---

### @kbn/esql-ast composer
```typescript
import { esql } from '@kbn/esql-ast';

// Define base query with shared filters
const baseQuery = esql`
  FROM logs-*
  | WHERE @timestamp >= NOW() - 1h 
    AND service.name == ${{ svc: 'checkout' }}
`;

// Query 1: Count by level
const countByLevel = baseQuery
  .pipe`STATS count = COUNT(*) BY log.level`;

// Query 2: Recent errors
const recentErrors = baseQuery
  .where`log.level == "ERROR"`
  .limit(100);

// Query 3: With additional filter
const productionErrors = baseQuery
  .where`service.environment == "production" AND log.level == "ERROR"`
  .limit(100);

// Note: Each baseQuery.pipe() creates a new query with copied commands
// Parameters are shared via the Map
```

---

## Performance Considerations

### @kbn/esql-composer
```typescript
// Fast: Each operator is a simple function call
const operators = [
  where('x == 1'),
  where('y == 2'),
  where('z == 3'),
];

const query = from('index').pipe(...operators);
// Creates new Query object for each pipe, but shallow copy
```

**Performance**: 
- ✅ Lightweight function composition
- ✅ Minimal overhead
- ❌ Parameter replacement happens at render time (could be slow for complex queries)

---

### @kbn/esql-ast composer
```typescript
// Heavier: Full AST parsing and manipulation
const query = esql`
  FROM index
  | WHERE x == 1
  | WHERE y == 2
  | WHERE z == 3
`;
// Parses entire query string into AST upfront
```

**Performance**:
- ⚠️ AST parsing overhead at construction
- ✅ Parameters in Map (fast lookup)
- ✅ AST manipulation is fast once parsed
- ✅ No re-parsing at render time

---

## Testing Patterns

### @kbn/esql-composer Tests
```typescript
describe('createESQLQuery', () => {
  it('creates query with filters', () => {
    const result = createESQLQuery({
      metric: { name: 'duration', instrument: 'gauge', index: 'metrics-*' },
      dimensions: ['service.name'],
      filters: [{ field: 'host', value: 'prod-1' }],
    });
    
    expect(result).toContain('FROM metrics-*');
    expect(result).toContain('WHERE host IN (?)');
    expect(result).toContain('BY BUCKET(@timestamp');
  });
  
  it('handles conditional dimensions', () => {
    const withDimensions = createESQLQuery({
      metric: { name: 'duration', instrument: 'gauge', index: 'metrics-*' },
      dimensions: ['service.name', 'host'],
    });
    
    expect(withDimensions).toContain('EVAL combined = CONCAT');
    
    const noDimensions = createESQLQuery({
      metric: { name: 'duration', instrument: 'gauge', index: 'metrics-*' },
      dimensions: [],
    });
    
    expect(noDimensions).not.toContain('CONCAT');
  });
});
```

---

### @kbn/esql-ast composer Tests
```typescript
describe('createESQLQuery with esql-ast', () => {
  it('creates query with filters', () => {
    const query = createESQLQuery({
      metric: { name: 'duration', instrument: 'gauge', index: 'metrics-*' },
      dimensions: ['service.name'],
      filters: [{ field: 'host', value: 'prod-1' }],
    });
    
    expect(query.print()).toContain('FROM metrics-*');
    expect(query.ast.commands).toHaveLength(3); // FROM, WHERE, STATS
    expect(query.getParams()).toHaveProperty('filter_host_0', 'prod-1');
  });
  
  it('can manipulate AST', () => {
    const query = createESQLQuery({ /* ... */ });
    
    // Can access and modify AST
    expect(query.ast.commands[0].name).toBe('from');
    
    // Can add more commands
    query.limit(50);
    expect(query.ast.commands).toHaveLength(4);
  });
});
```

---

## Summary: When to Use Each Pattern

### Use @kbn/esql-composer style when:
- ✅ Building queries programmatically
- ✅ Need many conditional commands
- ✅ Want clean functional composition
- ✅ Spreading arrays of operators
- ✅ Simple, focused query building

### Use @kbn/esql-ast composer when:
- ✅ Need full ES|QL command support
- ✅ Want AST manipulation capabilities
- ✅ Need advanced features (SET, parameter inlining, etc.)
- ✅ Building complex queries with rich typing
- ✅ Want multiple output formats
- ✅ Need validation and debugging tools

### Hybrid approach (recommended for migration):
- ✅ Start with esql-ast tagged templates for static parts
- ✅ Add functional helpers for dynamic parts
- ✅ Use method chaining where it makes sense
- ✅ Keep operator composition pattern for complex builders

---

**Conclusion**: Both solutions are well-designed for their goals. The migration path should preserve the excellent ergonomics of @kbn/esql-composer while gaining the power of @kbn/esql-ast.

