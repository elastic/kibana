# @kbn/core-capabilities-common

Common capabilities type definitions for Kibana Core. This package provides shared TypeScript interfaces and types for the capabilities system used across both client and server-side code.

## Overview

The `@kbn/core-capabilities-common` package defines the fundamental `Capabilities` interface that represents user permissions and feature availability throughout Kibana.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/kibana-core`
- **Visibility**: Shared across platform
- **Dependencies**: Core TypeScript definitions

## Core Types

### Capabilities Interface
Defines the structure of capabilities objects that control feature access and UI visibility across Kibana.

## Usage Examples

```typescript
import type { Capabilities } from '@kbn/core-capabilities-common';

const userCapabilities: Capabilities = {
  catalogue: {
    discover: true,
    dashboard: true
  },
  management: {
    kibana: {
      settings: false
    }
  },
  navLinks: {
    discover: true,
    dashboard: true
  }
};
```

## Integration

Used by both client and server-side capabilities services to ensure type consistency across the capabilities system.
