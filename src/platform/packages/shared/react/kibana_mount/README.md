# @kbn/react-kibana-mount

React utilities for mounting Kibana applications and components. This package provides mounting utilities and helpers for integrating React components with Kibana's application framework.

## Overview

Contains utilities for properly mounting React components within Kibana's application lifecycle, handling context providers, and managing application state.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: React application mounting utilities
- **Integration**: Used by React-based Kibana applications

## Core Features

### Application Mounting
- React component mounting utilities
- Context provider setup
- Application lifecycle integration
- State management helpers

### Framework Integration
- Kibana platform integration
- Theme and styling context
- Service dependency injection

## Usage

```typescript
import { KibanaMountProvider } from '@kbn/react-kibana-mount';

// Mount React app with Kibana context
<KibanaMountProvider dependencies={kibanaServices}>
  <MyKibanaApp />
</KibanaMountProvider>
```

## Integration

Used by React-based plugins and applications to ensure proper integration with Kibana's platform services and theming system.
