# @kbn/as-code-filters-transforms

Transform utilities for converting between **AsCodeFilter** and **StoredFilter** formats.

## Overview

This package provides bidirectional conversion functions between two filter representations in Kibana:

- **AsCodeFilter**: Modern filter format used in As Code APIs (defined in `@kbn/as-code-filters-schema`)
- **StoredFilter**: Legacy filter format used in saved objects and URL state (defined in `@kbn/es-query-server`)

## Usage

### Convert StoredFilter → AsCodeFilter

```typescript
import { fromStoredFilter, fromStoredFilters } from '@kbn/as-code-filters-transforms';
import type { Logger } from '@kbn/logging';

// Single filter conversion
const storedFilter = {
  meta: { key: 'status', type: 'phrase' },
  query: { match_phrase: { status: 'active' } }
};

const asCodeFilter = fromStoredFilter(storedFilter);
// Result: { condition: { field: 'status', operator: 'is', value: 'active' } }

// Array conversion with logger
const logger: Logger = /* ... */;
const storedFilters = [/* array of stored filters */];
const asCodeFilters = fromStoredFilters(storedFilters, logger);
// Filters that fail conversion are filtered out, warnings logged
```

### Convert AsCodeFilter → StoredFilter

```typescript
import { toStoredFilter, toStoredFilters } from '@kbn/as-code-filters-transforms';

// Single filter conversion
const asCodeFilter = {
  condition: {
    field: 'status',
    operator: 'is',
    value: 'active',
  },
};

const storedFilter = toStoredFilter(asCodeFilter);
// Result: {
//   meta: { key: 'status', field: 'status', type: 'phrase', params: { query: 'active' } },
//   query: { match_phrase: { status: 'active' } }
// }

// Array conversion
const asCodeFilters = [
  /* array of AsCode filters */
];
const storedFilters = toStoredFilters(asCodeFilters);
```

## Type Guards

The package exports type guard functions to detect filter types:

```typescript
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isRangeConditionFilter,
  isAsCodeFilter,
} from '@kbn/as-code-filters-transforms';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';

function processFilter(filter: AsCodeFilter) {
  if (isConditionFilter(filter)) {
    // TypeScript knows filter is AsCodeConditionFilter
    console.log(filter.condition.field, filter.condition.operator);
  } else if (isGroupFilter(filter)) {
    // TypeScript knows filter is AsCodeGroupFilter
    console.log(filter.group.operator, filter.group.conditions);
  } else if (isDSLFilter(filter)) {
    // TypeScript knows filter is AsCodeDSLFilter
    console.log(filter.dsl);
  }
}

// Check if condition filter is a range filter (has negate property)
if (isRangeConditionFilter(filter)) {
  console.log(filter.negate); // TypeScript knows negate exists
}

// Validate AsCodeFilter structure
if (isAsCodeFilter(filter)) {
  // Filter has exactly one of: condition, group, or dsl
}
```

## Conversion Behavior

### FromStoredFilter Conversion

**Type-First Routing**:

- Uses `meta.type` (FILTERS enum) for deterministic conversion
- Preserves complex queries as DSL to prevent data loss
- Filters without `meta.type` → preserved as DSL (safe fallback)

**Supported Conversions**:

- `phrase` → condition filter with `is`/`is_not` operator
- `phrases` → condition filter with `is_one_of`/`is_not_one_of` operator
- `range` → condition filter with `range` operator (preserves `negate`)
- `exists` → condition filter with `exists`/`not_exists` operator
- `combined` → group filter with `and`/`or` type
- `custom`, `match_all`, `query_string`, `spatial_filter` → DSL filter

**Special Cases**:

- Pinned filters (globalState) are skipped → returns `undefined`
- Script queries → preserved as DSL even if `meta.type='phrase'`
- OR groups with same-field IS conditions → optimized to `phrases` filter

### ToStoredFilter Conversion

**Smart Type Detection**:

- Uses preserved `filterType` if available
- Detects query structure to determine filter type
- Minimizes round-trip differences

**Operator Mapping**:

- `is`/`is_not` → `match_phrase` query, type `phrase`
- `is_one_of`/`is_not_one_of` → `bool.should` with `match_phrase`, type `phrases`
- `range` → `range` query, type `range` or `range_from_value`
- `exists`/`not_exists` → `exists` query, type `exists`

**Group Optimization**:

- OR group with same-field IS conditions → `phrases` filter (compact representation)
- Other groups → `combined` filter with nested params

## Error Handling

```typescript
import { FilterConversionError } from '@kbn/as-code-filters-transforms';

try {
  const asCodeFilter = fromStoredFilter(storedFilter);
} catch (error) {
  if (error instanceof FilterConversionError) {
    console.log('Conversion failed:', error.message);
    console.log('Original filter:', error.originalFilter);
  }
}
```

**Safe Conversion** (returns `undefined` on failure):

```typescript
const logger = /* ... */;

// Logs warning, returns undefined
const result = fromStoredFilter(invalidFilter, logger);
if (!result) {
  // Handle failed conversion
}
```

## Round-Trip Compatibility

The transforms are designed for high-fidelity round trips:

```typescript
const original = /* StoredFilter */;
const asCode = fromStoredFilter(original);
const roundTrip = toStoredFilter(asCode);

// roundTrip should be functionally equivalent to original
// Minor differences in property order or representation are expected
```

**Example of Optimization During Round-Trip:**

An OR group with same-field IS conditions gets optimized to a more compact `phrases` filter:

```typescript
// Original: Group filter with OR operator
const asCodeFilter = {
  group: {
    operator: 'or',
    conditions: [
      { field: 'status', operator: 'is', value: 'active' },
      { field: 'status', operator: 'is', value: 'pending' },
      { field: 'status', operator: 'is', value: 'approved' },
    ],
  },
};

const stored = toStoredFilter(asCodeFilter);
// Result: StoredFilter with type='phrases'
// {
//   meta: { type: 'phrases', key: 'status', field: 'status', params: ['active', 'pending', 'approved'] },
//   query: { bool: { should: [{ match_phrase: { status: 'active' } }, ...], minimum_should_match: 1 } }
// }

const roundTrip = fromStoredFilter(stored);
// Result: Condition filter with is_one_of operator (even more compact)
// {
//   condition: {
//     field: 'status',
//     operator: 'is_one_of',
//     value: ['active', 'pending', 'approved']
//   }
// }

// All three representations are functionally equivalent
// The transformation: group(OR) → phrases filter → condition(is_one_of)
```

**Preserved Properties**:

- Field metadata (`meta.field`, `meta.key`)
- Display values (`meta.params`)
- Negation (`meta.negate` or encoded in operator)
- Data view ID (`meta.index` ↔ `dataViewId`)
- Disabled state, labels, controlledBy
