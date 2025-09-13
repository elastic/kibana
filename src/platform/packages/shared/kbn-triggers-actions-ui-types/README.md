# @kbn/triggers-actions-ui-types

TypeScript type definitions for triggers and actions UI components. This package provides type interfaces for alerting and action-related UI functionality in Kibana.

## Overview

Contains TypeScript type definitions for triggers, actions, and alerting UI components used throughout Kibana's alerting and action systems.

## Package Details

- **Package Type**: `shared-types`
- **Purpose**: Type definitions for triggers and actions UI
- **Integration**: Used by alerting and action features

## Core Types

### Action Types
- Action configuration interfaces
- Trigger definition types
- UI component prop types

### Alerting Types
- Alert rule UI types
- Notification configuration types
- Action execution interfaces

## Usage

```typescript
import type { 
  TriggerActionsUIProps, 
  ActionTypeConfig,
  AlertRuleUIProps 
} from '@kbn/triggers-actions-ui-types';
```

## Integration

Used by alerting plugins and action configuration interfaces to ensure type consistency across the triggers and actions system.
