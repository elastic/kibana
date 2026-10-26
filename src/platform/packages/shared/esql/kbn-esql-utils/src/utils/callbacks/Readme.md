# ES|QL Callbacks

This directory contains callback functions that provide data and functionality to the ES|QL editor and language services. These callbacks are used by the Monaco editor's ES|QL language support to enable features like autocomplete, validation, and smart suggestions.

## Overview

The callbacks in this directory are designed to:
- Fetch data from Elasticsearch and Kibana APIs
- Provide intelligent caching to improve performance
- Support ES|QL editor features like autocomplete and validation

## Core Files

### Data Fetching Callbacks

- **`sources.ts`** - Fetches available data sources (indices, aliases, data streams) and integrations
  - Retrieves indices from Elasticsearch
  - Fetches Fleet package integrations
  - Supports remote cluster indices
  - Used for `FROM` command autocomplete and validation

- **`columns.ts`** - Executes ES|QL queries to get column information
  - Runs queries to determine available columns and their types
  - Formats results as `ESQLFieldWithMetadata`
  - Supports time ranges and control variables
  - Used for columns suggestions and validation

- **`lookup_indices.ts`** - Fetches indices available for JOIN operations
  - Provides indices that can be used in ES|QL LOOKUP JOIN commands
  - Supports remote cluster lookups
  - Includes caching for performance

- **`timeseries_indices.ts`** - Fetches time series specific indices
  - Retrieves indices suitable for time series operations
  - Used for `TS` command autocomplete and validation

- **`policies.ts`** - Fetches available enrich policies
  - Retrieves policies for `ENRICH` command autocomplete
  - Provides policy metadata and field information

- **`inference.ts`** - Fetches available inference endpoints
  - Retrieves ML inference endpoints for ES|QL `COMPLETION` and `RERANK` commands
  - Used for the autocomplete and validation

- **`extensions.ts`** - Fetches editor extensions and recommendations
  - Provides query and fields recommendations based on current context
  - Solution-aware suggestions


## Usage Example

```typescript
import { getESQLSources, getEsqlColumns, getJoinIndices } from '@kbn/esql-utils';
import { validateQuery } from '@kbn/esql-language';

// Usage for validating FROM sources and columns
  const esqlCallbacks: ESQLCallbacks = useMemo(() => {
    const callbacks: ESQLCallbacks = {
      getSources: async () => {
        const getLicense = licensing?.getLicense;
        return await getESQLSources({ application, http }, getLicense);
      },
      getColumnsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        const columns = await getEsqlColumns({
          query: queryToExecute,
          search: searchService,
          timeRange: { from: 'now-1h', to: 'now' }
        });
        return columns;
      },

    };
    return callbacks;
  }, [licensing, application, http, data?.search?.search]);

  const { errors, warnings } = await validateQuery("from index | stats avg(myColumn)", esqlCallbacks);

```