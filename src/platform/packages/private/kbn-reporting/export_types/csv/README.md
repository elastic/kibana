# @kbn/reporting-export-types-csv

This package contains the CSV export implementations for Kibana's Reporting functionality. Originally part of the reporting plugin, it has been extracted into a standalone package to improve modularity and maintainability.

## Overview

This package provides two CSV export solutions:

1. **`csv_searchsource`** (Legacy/Deprecated) - SearchSource-based API
2. **`csv_v2`** (Modern) - Locator-based API with enhanced features

## Migration: Legacy to Modern CSV Exports

### The Problem with Legacy `csv_searchsource`

The original CSV export implementation (`csv_searchsource`) was tightly coupled to the Data Plugin's SearchSource API:

```typescript
// Legacy approach - tightly coupled to SearchSource internals
{
  searchSource: {
    index: '5193f870-d861-11e9-a311-0fa548c5f953',
    fields: [
      { field: 'order_date', include_unmapped: true },
      { field: 'order_id', include_unmapped: true }
    ],
    filter: [{
      meta: { field: 'order_date', index: '...', params: {} },
      query: {
        range: {
          order_date: {
            format: 'strict_date_optional_time',
            gte: '2019-06-20T23:59:44.609Z',
            lte: '2019-06-21T00:01:06.957Z'
          }
        }
      }
    }],
    sort: [{ order_date: { format: 'strict_date_optional_time', order: 'desc' } }],
    query: { language: 'kuery', query: '' }
  }
}
```

**Key limitation:** **No saved search support**. The API cannot reference existing saved searches, limiting the ability to reuse predefined queries.

### The Modern Solution: `csv_v2`

The `csv_v2` implementation introduces a **locator-based architecture** that supports both saved and inline search expressions:

```typescript
// Modern approach - locator-based abstraction
{
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: {
      dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
      columns: ['order_date', 'order_id'],
      sort: [['order_date', 'desc']],
      timeRange: {
        from: '2019-06-20T23:59:44.609Z',
        to: '2019-06-21T00:01:06.957Z'
      }
    },
    version: '9.2.0'
  }]
}
```

## API Comparison Matrix

| Feature | csv_searchsource | csv_v2 |
|---------|------------------|--------|
| Saved search by ID | ❌ No | ✅ Yes |
| Inline/unsaved searches | ✅ Yes | ✅ Yes |
| ES\|QL support | ❌ No | ✅ Yes |
| Future-proof | ❌ Brittle | ✅ Stable |
| Maintenance burden | 🔴 High | 🟢 Low |

## Key Capabilities

### csv_v2 Supports Both Saved and Unsaved Searches

The `csv_v2` API is **feature-complete** and provides full support for:

1. **Saved Searches (by reference)** - Use `savedSearchId` to reference an existing saved search object. The search criteria are loaded from the saved object.

2. **Inline/Ad-hoc Searches** - Provide search parameters directly in the API call using `dataViewId`, `columns`, `query`, `filters`, etc. This is the "unsaved" search functionality.

Both approaches use the same locator-based architecture and are fully supported in production.

## Usage Examples

### Basic Export (Saved Search)

```typescript
import { reportingAPI } from '@kbn/reporting-api';

const jobParams = {
  title: 'Monthly Sales Report',
  browserTimezone: 'America/New_York',
  objectType: 'search',
  version: '9.2.0',
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: {
      savedSearchId: 'monthly-sales-abc123'
    },
    version: '9.2.0'
  }]
};

await reportingAPI.generateCsvV2(jobParams);
```

### Advanced Export (Inline Expression)

```typescript
const jobParams = {
  title: 'Error Logs Analysis',
  browserTimezone: 'UTC',
  objectType: 'search',
  version: '9.2.0',
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: {
      dataViewId: 'logs-*',
      columns: ['@timestamp', 'level', 'message', 'trace.id'],
      query: {
        language: 'kuery',
        query: 'level: error AND service.name: "checkout"'
      },
      filters: [{
        meta: { index: 'logs-*', negate: false },
        query: { range: { '@timestamp': { gte: 'now-24h' } } }
      }],
      sort: [['@timestamp', 'desc']],
      timeRange: { from: 'now-24h', to: 'now' }
    },
    version: '9.2.0'
  }]
};

await reportingAPI.generateCsvV2(jobParams);
```

### ES|QL Export

```typescript
const jobParams = {
  title: 'ESQL Analysis',
  browserTimezone: 'UTC',
  objectType: 'search',
  version: '9.2.0',
  locatorParams: [{
    id: 'DISCOVER_APP_LOCATOR',
    params: {
      query: {
        esql: `
          FROM logs-*
          | WHERE @timestamp >= NOW() - 7 days
          | WHERE level == "error"
          | STATS error_count = COUNT(*) BY service.name
          | SORT error_count DESC
          | LIMIT 100
        `
      }
    },
    version: '9.2.0'
  }]
};

await reportingAPI.generateCsvV2(jobParams);
```

## Testing

The package includes comprehensive test coverage for both implementations:

- **`generate_csv_searchsource.ts`**: Legacy API tests (deprecated)
- **`generate_csv_v2.ts`**: Modern API tests (raw locator params)
- **`csv_v2.ts`**: Tests with saved search references
- **`csv_v2_esql.ts`**: ES|QL specific tests

## Additional Resources

- [Reporting Plugin Documentation](../../../plugins/reporting/README.md)
- [Discover Locators](../../../plugins/discover/public/locator.ts)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
