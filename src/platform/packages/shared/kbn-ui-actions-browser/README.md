# @kbn/ui-actions-browser

Browser-side UI actions framework for Kibana. This package provides the client-side implementation of Kibana's UI actions system, enabling dynamic action registration and execution.

## Overview

Contains the browser-side implementation of Kibana's UI actions framework, allowing plugins to register actions that can be triggered from various UI contexts.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Browser UI actions framework
- **Integration**: Used by browser-side plugins for action systems

## Core Features

### Action Registration
- Dynamic action registration system
- Context-sensitive action triggers
- Action execution framework

### UI Integration
- Context menu integration
- Button action binding
- Trigger-based action systems

## Usage

```typescript
import { uiActionsService } from '@kbn/ui-actions-browser';

// Register an action
uiActionsService.registerAction({
  id: 'my-action',
  execute: async (context) => {
    // Action implementation
  }
});

// Execute actions
uiActionsService.executeTriggerActions('my-trigger', context);
```

## Integration

Core component of Kibana's extensibility system, used by plugins to provide contextual actions and interactions in the browser.
