# @kbn/as-code-filters-schema

Validation schemas and TypeScript types for the **Kibana As Code Filter Interface**.

## Overview

This package provides runtime validation schemas and corresponding TypeScript types for filters in the Kibana As Code API. It uses `@kbn/config-schema` for validation and is designed for server-side use in API route handlers.

## Filter Structure

The As Code filter interface supports three main filter types:

### 1. Condition Filters

Single field-value comparisons with type-safe operators:

```typescript
import {
  asCodeConditionFilterSchema,
  type AsCodeConditionFilter,
} from '@kbn/as-code-filters-schema';

// Examples of condition filters:
const isFilter: AsCodeConditionFilter = {
  condition: { field: 'status', operator: 'is', value: 'active' },
};

const isOneOfFilter: AsCodeConditionFilter = {
  condition: { field: 'category', operator: 'is_one_of', value: ['A', 'B', 'C'] },
};

const rangeFilter: AsCodeConditionFilter = {
  condition: { field: 'price', operator: 'range', value: { gte: 10, lte: 100 } },
  negate: false, // Only range filters have negate property
};

const existsFilter: AsCodeConditionFilter = {
  condition: { field: 'description', operator: 'exists' },
};
```

**Operators:**

- `is` / `is_not` - Single value comparison
- `is_one_of` / `is_not_one_of` - Array value comparison
- `range` - Numeric/date range (has `negate` property)
- `exists` / `not_exists` - Field existence check

### 2. Group Filters

Logical combinations of conditions with AND/OR:

```typescript
import { asCodeGroupFilterSchema, type AsCodeGroupFilter } from '@kbn/as-code-filters-schema';

const groupFilter: AsCodeGroupFilter = {
  group: {
    operator: 'and',
    conditions: [
      { field: 'status', operator: 'is', value: 'active' },
      { field: 'priority', operator: 'range', value: { gte: 5 } },
    ],
  },
  negate: false, // Can negate entire group
};
```

Groups support nesting for complex logic:

```typescript
const nestedGroup: AsCodeGroupFilter = {
  group: {
    operator: 'or',
    conditions: [
      { field: 'region', operator: 'is', value: 'US' },
      {
        group: {
          operator: 'and',
          conditions: [
            { field: 'region', operator: 'is', value: 'EU' },
            { field: 'vip', operator: 'is', value: true },
          ],
        },
      },
    ],
  },
};
```

### 3. DSL Filters

Raw Elasticsearch Query DSL for advanced queries:

```typescript
import { asCodeDSLFilterSchema, type AsCodeDSLFilter } from '@kbn/as-code-filters-schema';

const dslFilter: AsCodeDSLFilter = {
  dsl: {
    match_phrase: {
      message: 'quick brown fox',
    },
  },
  negate: false,
};
```

## Common Properties

All filters support these optional metadata properties:

```typescript
interface CommonProperties {
  disabled?: boolean; // Filter is disabled
  controlledBy?: string; // Component managing this filter
  dataViewId?: string; // Associated data view
  label?: string; // Human-readable label
  isMultiIndex?: boolean; // Applies to multiple indices

  // Legacy compatibility (deprecated):
  filterType?: string; // Legacy filter type
  key?: string; // Legacy field name
  value?: string; // Legacy value
}
```

## Usage in API Routes

```typescript
import { asCodeFilterSchema, type AsCodeFilter } from '@kbn/as-code-filters-schema';

router.post(
  {
    path: '/api/dashboards/{id}/filters',
    validate: {
      body: schema.object({
        filters: schema.arrayOf(asCodeFilterSchema),
      }),
    },
  },
  async (context, request, response) => {
    const { filters } = request.body;
    // filters is typed as AsCodeFilter[]
    // ... process filters
  }
);
```

## Exported Schemas

- `asCodeFilterSchema` - Main discriminated union schema
- `asCodeConditionFilterSchema` - Condition filter schema
- `asCodeGroupFilterSchema` - Group filter schema
- `asCodeDSLFilterSchema` - DSL filter schema

## Exported Types Inferred from Schemas

- `AsCodeFilter` - Main discriminated union type
- `AsCodeConditionFilter` - Condition filter type
- `AsCodeGroupFilter` - Group filter type
- `AsCodeDSLFilter` - DSL filter type
