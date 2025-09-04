# @kbn/router-to-openapispec

## Description

The `@kbn/router-to-openapispec` package provides utilities for generating OpenAPI Specification (OAS) documents from Kibana router definitions. It automatically converts route schemas defined with `@kbn/config-schema` or Zod into comprehensive OpenAPI 3.0 specifications, enabling API documentation generation and external client integrations.

## Contents

- `src/generate_oas.ts`: Main entry point that orchestrates the OpenAPI document generation process
- `src/process_router.ts`: Processes standard Kibana routers and extracts route information
- `src/process_versioned_router.ts`: Handles versioned routers with multi-version API support
- `src/oas_converter/`: Schema conversion system supporting multiple validation libraries
  - `kbn_config_schema/`: Converts `@kbn/config-schema` definitions to OpenAPI schemas
  - `zod/`: Converts Zod schemas to OpenAPI schemas
  - `catch_all.ts`: Fallback converter for unsupported schema types
- `src/util.ts`: Utility functions for route processing, tag extraction, and path manipulation
- `src/type.ts`: TypeScript interfaces and type definitions
- `src/extract_authz_description.ts`: Extracts authorization descriptions from route metadata
- `src/merge_operation.ts`: Merges operation objects for complex route configurations

## Architecture

The package follows a modular converter architecture with the following key components:

### Core Components
- **OasConverter**: Central conversion orchestrator that manages multiple schema converters
- **Router Processors**: Separate processors for standard and versioned routers
- **Schema Converters**: Pluggable converters for different validation libraries (config-schema, Zod)

### Dependencies
- `@kbn/core-http-router-server-internal`: Core HTTP routing functionality
- `@kbn/core-http-server`: HTTP server utilities and validation helpers
- `openapi-types`: OpenAPI 3.0 TypeScript definitions

### Design Patterns
- **Strategy Pattern**: Multiple schema converters implementing a common interface
- **Builder Pattern**: Incremental construction of OpenAPI documents
- **Factory Pattern**: Operation ID generation and tag extraction utilities

### Key Features
- Multi-version API support through versioned routers
- Filtering by path patterns, access levels, and API versions
- Automatic security scheme generation (basic auth, API key)
- Tag extraction from route metadata
- Response validation schema conversion

## Usage

### Basic Usage

```typescript
import { generateOpenApiDocument } from '@kbn/router-to-openapispec';

const openApiDoc = await generateOpenApiDocument(
  {
    routers: [myRouter],
    versionedRouters: [myVersionedRouter]
  },
  {
    title: 'My API',
    version: '1.0.0',
    baseUrl: 'http://localhost:5601',
    filters: {
      access: 'public',
      pathStartsWith: ['/api/my-plugin'],
      version: '2023-10-31'
    }
  }
);
```

### Filtering Options

```typescript
const filters = {
  // Include only public routes
  access: 'public' as const,
  // Include paths starting with specific prefixes
  pathStartsWith: ['/api/cases', '/api/alerts'],
  // Exclude paths matching patterns
  excludePathsMatching: ['/internal'],
  // Generate for specific API version
  version: '2023-10-31'
};
```

### Environment Configuration

```typescript
const options = {
  title: 'Kibana API',
  version: '8.15.0',
  baseUrl: 'https://localhost:5601',
  docsUrl: 'https://docs.elastic.co',
  env: { serverless: true },
  tags: ['kibana', 'elasticsearch']
};
```

## Tutorials

- [Generating OAS for HTTP APIs](dev_docs/tutorials/generating_oas_for_http_apis.mdx) - Comprehensive guide on using OpenAPI specification generation in Kibana development
