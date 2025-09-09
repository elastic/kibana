# @kbn/search-connectors

Search connector utilities and components for Kibana. This package provides functionality for managing and integrating with Elasticsearch search connectors, enabling connectivity to external data sources.

## Overview

Contains utilities and components for working with Elasticsearch search connectors, which enable indexing and searching of external data sources within Kibana.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Search connector integration utilities
- **Integration**: Used by search and data ingestion features

## Core Features

### Connector Management
- Search connector configuration utilities
- Connection status monitoring
- Data source integration helpers

### Search Integration
- Connector-based search functionality
- External data source querying
- Index management for connector data

## Usage

```typescript
import { SearchConnectorUtils } from '@kbn/search-connectors';

// Manage search connectors
const connector = new SearchConnectorUtils(config);
```

## Integration

Used by Kibana's search features to provide connectivity to external data sources through Elasticsearch search connectors.
