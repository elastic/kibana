# @kbn/tracing-utils

Distributed tracing utilities for Kibana observability. This package provides utilities for implementing distributed tracing across Kibana services and components.

## Overview

Contains utilities for distributed tracing, performance monitoring, and observability instrumentation within Kibana applications.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Distributed tracing and observability utilities
- **Integration**: Used by services requiring tracing

## Core Features

### Tracing Instrumentation
- Span creation and management
- Trace context propagation
- Performance measurement utilities

### Integration Helpers
- Service tracing setup
- Request/response tracing
- Custom instrumentation utilities

## Usage

```typescript
import { createTracer, withSpan } from '@kbn/tracing-utils';

const tracer = createTracer('my-service');

await withSpan(tracer, 'operation-name', async (span) => {
  // Traced operation
});
```

## Integration

Used by Kibana services to provide distributed tracing capabilities for performance monitoring and debugging.
