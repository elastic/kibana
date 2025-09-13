# @kbn/search-api-panels

UI panel components for search API functionality in Kibana. This package provides reusable panel components for displaying search API information, documentation, and integration examples.

## Overview

Contains React components for displaying search API panels, including API documentation, code examples, and integration guides within Kibana interfaces.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Search API panel components
- **Integration**: Used by search and developer tools

## Core Features

### API Documentation Panels
- Search API reference displays
- Code example components
- Integration guide panels

### Interactive Components
- API testing interfaces
- Parameter configuration panels
- Response visualization

## Usage

```typescript
import { SearchAPIPanel } from '@kbn/search-api-panels';

// Display search API documentation
<SearchAPIPanel
  apiEndpoint="/search"
  examples={codeExamples}
  documentation={apiDocs}
/>
```

## Integration

Used by Kibana's search interfaces and developer tools to provide accessible API documentation and integration guidance.