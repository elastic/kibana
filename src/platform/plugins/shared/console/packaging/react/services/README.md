# Service Implementations

Drop-in implementations for Kibana core services that can be used in standalone packaging scenarios.

## Overview

These service implementations provide the necessary Kibana dependencies for running plugins outside of the full Kibana runtime. They are production-ready implementations (not test mocks) that accept configuration to mimic Kibana's internal services.

## Available Services

### createInjectedMetadata

Creates an `InternalInjectedMetadataSetup` for standalone environments.

```typescript
import { createInjectedMetadata } from './services';

const injectedMetadata = createInjectedMetadata({
  kibanaVersion: '8.12.0',
  kibanaBuildNumber: 54321,
  basePath: '/my-app',
  themeDarkMode: 'dark',
});
```

**Available Options:**
- `kibanaBranch` - Git branch name (default: 'main')
- `kibanaVersion` - Kibana version string (default: '9.1.0')
- `kibanaBuildNumber` - Build number (default: 12345)
- `basePath` - Application base path (default: '')
- `serverBasePath` - Server base path (default: '')
- `publicBaseUrl` - Public URL base (default: '')
- `elasticsearchClusterUuid` - ES cluster UUID
- `elasticsearchClusterName` - ES cluster name
- `elasticsearchClusterVersion` - ES version
- `themeDarkMode` - Theme mode: 'light' or 'dark'
- `themeName` - Theme name (default: 'default')

### createCoreContext

Creates a `CoreContext` with logging and environment info for standalone use.

```typescript
import { createCoreContext } from './services';

const coreContext = createCoreContext({
  version: '8.12.0',
  mode: 'production',
  enableConsoleLogging: false,
});
```

**Available Options:**
- `version` - Package version (default: '1.0.0')
- `branch` - Git branch (default: 'main')
- `buildNum` - Build number (default: 1)
- `buildSha` - Full build SHA (default: 'dev-build')
- `buildShaShort` - Short build SHA (default: 'dev')
- `buildDate` - Build date (default: `new Date()`)
- `mode` - Environment mode: 'development' or 'production'
- `enableConsoleLogging` - Enable browser console logs (default: true)

### createTrackUiMetric

Creates a UI metrics tracker for standalone use.

```typescript
import { createTrackUiMetric } from './services';

const trackUiMetric = createTrackUiMetric({
  onCount: (type, event) => {
    // Send to your own analytics
    console.log('UI Metric:', type, event);
  },
  onLoad: (type, event) => {
    // Track load events
    console.log('Load Metric:', type, event);
  },
});
```

**Available Options:**
- `onCount` - Callback for count metrics (default: no-op)
- `onLoad` - Callback for load metrics (default: no-op)

## Complete Example

Here's how to use these services in the Console standalone package:

```typescript
import React from 'react';
import {
  createInjectedMetadata,
  createCoreContext,
  createTrackUiMetric,
} from './services';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
import { HttpService } from '@kbn/core-http-browser-internal';

// Create services for standalone use
const injectedMetadata = createInjectedMetadata({
  kibanaVersion: '8.12.0',
  themeDarkMode: 'light',
});

const coreContext = createCoreContext({
  version: '8.12.0',
  mode: 'production',
  enableConsoleLogging: false,
});

const trackUiMetric = createTrackUiMetric({
  onCount: (type, event) => {
    // Integrate with your analytics service
  },
});

// Initialize Kibana services
const docLinksService = new DocLinksService(coreContext);
docLinksService.setup();
const docLinks = docLinksService.start({ injectedMetadata });

const httpService = new HttpService();
const http = httpService.setup({
  injectedMetadata,
  fatalErrors,
  executionContext,
});

// Use in your React component
export const MyStandaloneComponent = () => {
  return (
    <ServicesContextProvider
      value={{
        docLinks: docLinks.links,
        http,
        trackUiMetric,
        // ... other services
      }}
    >
      <YourComponent />
    </ServicesContextProvider>
  );
};
```

## Real-World Usage

These services are used in the Console plugin's standalone build. See:
- Service initialization: `index.ts` (this file)
- Implementation: `../index.tsx`

## Adding New Service Implementations

When adding new service implementations for Console's standalone build:

1. **Keep them Console-focused** - These services support Console's standalone packaging
2. **Provide type safety** - Export TypeScript interfaces for all options
3. **Document defaults** - Clearly specify default values for all options
4. **Add JSDoc comments** - Include usage examples in code comments
5. **Export from index.ts** - Add to `index.ts` in this directory
6. **Update this README** - Document the new service with examples

## Design Philosophy

These implementations follow these principles:

- **Configuration over mocking**: Use real Kibana service classes configured for standalone use
- **Production-ready**: Not test mocks; suitable for production builds
- **Minimal dependencies**: Avoid pulling in unnecessary Kibana internals
- **Flexibility**: Allow consumers to override/customize behavior via options
- **Console-specific**: Tailored to Console's standalone packaging needs
