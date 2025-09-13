# @kbn/core-capabilities-server

Server-side capabilities management for Kibana Core. This package provides the server-side types and contracts for managing application capabilities, feature toggles, and permission-based UI controls.

## Overview

The `@kbn/core-capabilities-server` package defines the server-side interfaces for Kibana's capabilities system. Capabilities control what features and UI elements are available to users based on their permissions, plugin configurations, and contextual factors. This package provides the foundational types used by the core capabilities service on the server.

## Package Details

- **Package Type**: `shared-server`
- **Owner**: `@elastic/kibana-core`
- **Visibility**: Shared across platform
- **Dependencies**: `@kbn/utility-types`, `@kbn/core-http-server`, `@kbn/core-capabilities-common`

## Core Types

### CapabilitiesProvider
A function that returns partial capabilities to be merged into the application's capability set.

```typescript
type CapabilitiesProvider = () => Partial<Capabilities>;
```

### CapabilitiesSwitcher  
A function that can modify capabilities based on request context, user permissions, or other runtime factors.

```typescript
type CapabilitiesSwitcher = (
  request: KibanaRequest,
  uiCapabilities: Capabilities,
  useDefaultCapabilities: boolean
) => MaybePromise<Partial<Capabilities>>;
```

### CapabilitiesSetup Interface
The setup contract for registering capabilities providers and switchers during plugin initialization.

## Key Contracts

### CapabilitiesSetup
Provides methods for plugins to register capabilities during the setup phase:

- `registerProvider(provider)` - Register capabilities that your plugin provides
- `registerSwitcher(switcher)` - Register logic to modify capabilities based on context

### CapabilitiesStart  
Runtime contract for resolving capabilities with options:

- `resolveCapabilities(request, options)` - Resolve final capabilities for a request

## Usage Examples

### Registering Plugin Capabilities
```typescript
// In plugin setup
public setup(core: CoreSetup) {
  core.capabilities.registerProvider(() => ({
    catalogue: {
      myPlugin: true,
    },
    myPlugin: {
      someFeature: true,
      advancedFeature: false,
    },
  }));
}
```

### Registering a Capabilities Switcher
```typescript
// In plugin setup - disable features based on license
core.capabilities.registerSwitcher(async (request, capabilities) => {
  const license = await licensing.getLicense(request);
  
  if (!license.hasFeature('advanced')) {
    return {
      myPlugin: {
        advancedFeature: false,
      },
    };
  }
  
  return {};
});
```

### Runtime Capabilities Resolution
```typescript
// In request handler
public start(core: CoreStart) {
  return {
    async getCapabilities(request: KibanaRequest) {
      return await core.capabilities.resolveCapabilities(request);
    }
  };
}
```

## Integration with Kibana Core

This package is used by:

- **Core Server**: Main capabilities service implementation
- **Security Plugin**: Applies role-based capability restrictions  
- **Plugin Mocks**: Testing utilities for capabilities
- **Integration Tests**: Validates capabilities behavior

The server-side capabilities system works in conjunction with the client-side capabilities to provide a complete feature control mechanism throughout Kibana, ensuring users only see and can access features they're authorized to use.
