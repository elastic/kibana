# @kbn/standalone-packaging-utils

Utilities for packaging Kibana plugins as standalone components that can be used outside of the Kibana platform.

## Overview

This package provides utilities to help package Kibana plugins into standalone React components that can be embedded in external applications. It solves common challenges when extracting Kibana functionality:

- **Mocked Services**: Drop-in replacements for Kibana core services
- **Service Initialization**: Helpers to set up required services in standalone mode
- **Webpack Configuration**: (Coming soon) Pre-configured webpack settings

## Installation

This is an internal Kibana package. Reference it in your `tsconfig.json`:

```json
{
  "kbn_references": [
    "@kbn/standalone-packaging-utils"
  ]
}
```

## Mocked Services

### createMockedInjectedMetadata

Creates a mock `InternalInjectedMetadataSetup` for standalone environments.

```typescript
import { createMockedInjectedMetadata } from '@kbn/standalone-packaging-utils';

const injectedMetadata = createMockedInjectedMetadata({
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

### createMockedCoreContext

Creates a mock `CoreContext` with logging and environment info.

```typescript
import { createMockedCoreContext } from '@kbn/standalone-packaging-utils';

const coreContext = createMockedCoreContext({
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

### createMockedTrackUiMetric

Creates a mock UI metrics tracker.

```typescript
import { createMockedTrackUiMetric } from '@kbn/standalone-packaging-utils';

const trackUiMetric = createMockedTrackUiMetric({
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

Here's how to use these utilities in a standalone package:

```typescript
import React from 'react';
import {
  createMockedInjectedMetadata,
  createMockedCoreContext,
  createMockedTrackUiMetric,
} from '@kbn/standalone-packaging-utils';
import { DocLinksService } from '@kbn/core-doc-links-browser-internal';
import { HttpService } from '@kbn/core-http-browser-internal';

// Create mocked services
const injectedMetadata = createMockedInjectedMetadata({
  kibanaVersion: '8.12.0',
  themeDarkMode: 'light',
});

const coreContext = createMockedCoreContext({
  version: '8.12.0',
  mode: 'production',
  enableConsoleLogging: false,
});

const trackUiMetric = createMockedTrackUiMetric({
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

See the Console plugin's standalone packaging for a complete example: `src/platform/plugins/shared/console/packaging/`

## Contributing

When adding new utilities:

1. Keep them generic and configurable
2. Provide TypeScript interfaces for all options
3. Include JSDoc comments with examples
4. Add exports to `src/index.ts`
5. Document in this README

## Webpack Configuration

### createStandaloneWebpackConfig

Creates a pre-configured webpack setup for standalone plugin packaging with sensible defaults.

```javascript
const { createStandaloneWebpackConfig } = require('@kbn/standalone-packaging-utils');

module.exports = createStandaloneWebpackConfig({
  entry: require.resolve('./react/index.tsx'),
  outputPath: path.resolve(__dirname, '../target'),
  enableBundleAnalyzer: process.env.ANALYZE === 'true',
  additionalExternals: {
    'my-custom-lib': 'commonjs my-custom-lib',
  },
});
```

**Available Options:**
- `entry` - Entry point for the bundle (required)
- `outputPath` - Output directory (required)
- `outputFilename` - Output filename (default: 'index.js')
- `chunkFilename` - Chunk filename pattern (default: '[name].chunk.js')
- `additionalExternals` - Extra externals beyond standard ones
- `mode` - Webpack mode: 'development' or 'production' (default: process.env.NODE_ENV)
- `enableBundleAnalyzer` - Enable bundle analyzer (default: false)
- `kibanaRoot` - Path to Kibana root directory
- `babelPreset` - Path to Babel preset
- `additionalPlugins` - Extra webpack plugins
- `cleanOutputDir` - Clean output before build (default: true)
- `sourceMaps` - Enable source maps (default: true)
- `libraryTarget` - Library target (default: 'commonjs')

**Standard Externals Included:**
- React, ReactDOM
- Monaco Editor
- Elastic UI (@elastic/eui)
- Emotion
- Moment.js
- RxJS
- Lodash
- And more...

## Future Enhancements

- [ ] Service initialization helpers
- [ ] Translation loading utilities
- [ ] Provider adapter patterns
- [ ] Testing utilities for standalone packages