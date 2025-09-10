# Core Deprecations Packages

## Description
The Core Deprecations packages provide a comprehensive system for managing, communicating, and resolving deprecated features, configurations, and APIs within the Kibana platform. This collection enables the platform to proactively inform users about deprecated functionality specific to their deployment, facilitating smooth upgrade experiences through the Upgrade Assistant.

## Package Collection Overview

### [@kbn/core-deprecations-common](./common)
Contains shared TypeScript types and interfaces used across both browser and server environments. This package defines the core data structures for deprecation details, including different deprecation types (config, API, feature), severity levels (warning, critical, fetch_error), and corrective action specifications.

### [@kbn/core-deprecations-browser](./browser)
Provides browser-side contracts and types for the deprecations service. Includes the `DeprecationsServiceStart` interface that allows browser applications to fetch deprecations, check if they're resolvable, and trigger automatic resolution through API calls.

### [@kbn/core-deprecations-server](./server)
Contains server-side contracts and types for registering and managing deprecations. Includes interfaces for deprecation registration, context provision, and request handling that enable plugins to contribute their own deprecation checks and resolution APIs.

### [@kbn/core-deprecations-browser-internal](./browser-internal)
Houses the internal implementation of the browser-side deprecations service, containing the actual service logic that communicates with server endpoints to fetch and resolve deprecations.

### [@kbn/core-deprecations-server-internal](./server-internal)
Contains the internal server-side implementation including the core deprecations service, configuration schemas, and route handlers that process deprecation requests and manage the deprecation registry.

### [@kbn/core-deprecations-browser-mocks](./browser-mocks)
Provides mock implementations of the browser deprecations service for use in testing scenarios, enabling unit tests to simulate deprecation service behavior without actual server communication.

### [@kbn/core-deprecations-server-mocks](./server-mocks)
Contains mock implementations of server-side deprecations functionality for testing purposes, allowing plugins to test their deprecation registration and resolution logic in isolation.

## Architecture

The deprecations system follows a client-server architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Layer                            │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   Public API    │  │        Internal Service         │  │
│  │   (browser)     │  │    (browser-internal)           │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Server Layer                             │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   Public API    │  │        Internal Service         │  │
│  │   (server)      │  │     (server-internal)           │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                    ┌─────────────────┐
                    │  Common Types   │
                    │   (common)      │
                    └─────────────────┘
```

### Key Design Patterns

- **Domain-Driven Design**: Deprecations are organized by domain (plugin/service), allowing each component to manage its own deprecation lifecycle
- **Type Safety**: Strong TypeScript typing across all layers ensures consistent data structures and API contracts
- **Separation of Concerns**: Clear boundaries between public APIs, internal implementations, and shared types
- **Testability**: Dedicated mock packages enable comprehensive testing strategies
- **Extensibility**: Plugin-based registration system allows any Kibana component to contribute deprecations

## Usage

### Registering Deprecations (Server-side)
```typescript
import { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core-deprecations-server';

// Register deprecations during plugin setup
setup(core: CoreSetup) {
  core.deprecations.registerDeprecations({
    getDeprecations: async (context: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
      return [
        {
          title: 'Deprecated Configuration Setting',
          message: 'The configuration setting "oldSetting" is deprecated and will be removed in the next major version.',
          level: 'warning',
          correctiveActions: {
            manualSteps: ['Update your kibana.yml to use "newSetting" instead'],
            api: {
              path: '/api/deprecations/fix/oldSetting',
              method: 'POST'
            }
          }
        }
      ];
    }
  });
}
```

### Consuming Deprecations (Browser-side)
```typescript
import { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';

// Fetch and display deprecations
async function handleDeprecations(deprecationsService: DeprecationsServiceStart) {
  const deprecations = await deprecationsService.getAllDeprecations();
  
  for (const deprecation of deprecations) {
    if (deprecationsService.isDeprecationResolvable(deprecation)) {
      // Show option to auto-resolve
      await deprecationsService.resolveDeprecation(deprecation);
    }
  }
}
```

## Tutorials
- [Advanced Settings Tutorial](../../../../dev_docs/tutorials/advanced_settings.mdx) - Shows how to handle deprecation notices for configuration settings
- [Versioning HTTP APIs](../../../../dev_docs/tutorials/versioning_http_apis.mdx) - Covers deprecation strategies for REST APIs
- [Versioning Interfaces](../../../../dev_docs/tutorials/versioning_interfaces.mdx) - Discusses deprecation approaches for TypeScript interfaces

## Attribution
This README was generated by an AI assistant based on the code and TSDocs of the package collection
