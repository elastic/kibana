# @kbn/optimizer-webpack-helpers

Webpack build optimization utilities for Kibana's build system. This package provides helper functions and type definitions for analyzing, processing, and optimizing Webpack build outputs and module information.

## Overview

The `@kbn/optimizer-webpack-helpers` package contains utilities specifically designed for Kibana's complex build system. It provides tools for analyzing Webpack compilation statistics, handling different module types, and optimizing build processes across the large Kibana monorepo.

## Package Details

- **Package Type**: `private` (platform internal)
- **Visibility**: Private to platform packages
- **Dependencies**: Webpack-related types and utilities
- **Purpose**: Build system optimization and analysis

## Core Components

### Module Type Detection
Functions for identifying different types of Webpack modules:

- `isNormalModule()` - Identifies standard JavaScript/TypeScript modules
- `isConcatenatedModule()` - Identifies modules processed by ModuleConcatenationPlugin
- `isDelegatedModule()` - Identifies modules delegated to other bundles
- `isExternalModule()` - Identifies externalized dependencies
- `isIgnoredModule()` - Identifies ignored/excluded modules

### Build Statistics Analysis
Tools for processing Webpack compilation statistics:

- `isFailureStats()` - Checks if build statistics indicate compilation failures
- `failedStatsToErrorMessage()` - Converts failed stats to readable error messages
- `getModulePath()` - Extracts module path information from stats

### Configuration Constants
Pre-configured options for Webpack statistics:

- `STATS_WARNINGS_FILTER` - Filter configuration for warning messages
- `STATS_OPTIONS_DEFAULT_USEFUL_FILTER` - Default filtering for useful statistics

## Type Definitions

### Webpack Module Types
```typescript
interface WebpackNormalModule {
  type: 'module';
  moduleType: string;
  resource: string;
  // ... other properties
}

interface WebpackConcatenatedModule {
  type: 'concatenated module';
  modules: WebpackModule[];
  // ... other properties
}

interface WebpackDelegatedModule {
  type: 'delegated module';
  source: string;
  // ... other properties
}

interface WebpackExternalModule {
  type: 'external module';
  request: string;
  // ... other properties
}

interface WebpackIgnoredModule {
  type: 'ignored module';
  // ... other properties
}
```

### Resolve Data Types
```typescript
interface WebpackResolveData {
  context: string;
  request: string;
  dependencies: any[];
  // ... other resolve information
}
```

## Usage Examples

### Module Analysis
```typescript
import {
  isNormalModule,
  isConcatenatedModule,
  isExternalModule,
  getModulePath
} from '@kbn/optimizer-webpack-helpers';

function analyzeModules(stats) {
  stats.modules.forEach(module => {
    if (isNormalModule(module)) {
      console.log('Normal module:', getModulePath(module));
    } else if (isConcatenatedModule(module)) {
      console.log('Concatenated module with', module.modules.length, 'submodules');
    } else if (isExternalModule(module)) {
      console.log('External dependency:', module.request);
    }
  });
}
```

### Build Error Handling
```typescript
import {
  isFailureStats,
  failedStatsToErrorMessage
} from '@kbn/optimizer-webpack-helpers';

function checkBuildResult(stats) {
  if (isFailureStats(stats)) {
    const errorMessage = failedStatsToErrorMessage(stats);
    console.error('Build failed:', errorMessage);
    throw new Error(errorMessage);
  }
  
  console.log('Build completed successfully');
}
```

### Statistics Filtering
```typescript
import {
  STATS_WARNINGS_FILTER,
  STATS_OPTIONS_DEFAULT_USEFUL_FILTER
} from '@kbn/optimizer-webpack-helpers';

const webpackConfig = {
  stats: {
    ...STATS_OPTIONS_DEFAULT_USEFUL_FILTER,
    warningsFilter: STATS_WARNINGS_FILTER
  }
};
```

### Build Analysis Tool
```typescript
import {
  isNormalModule,
  isConcatenatedModule,
  getModulePath
} from '@kbn/optimizer-webpack-helpers';

class BuildAnalyzer {
  analyzeBundle(stats) {
    const analysis = {
      totalModules: stats.modules.length,
      normalModules: 0,
      concatenatedModules: 0,
      externalModules: 0,
      modulesByPath: new Map()
    };
    
    stats.modules.forEach(module => {
      if (isNormalModule(module)) {
        analysis.normalModules++;
        const path = getModulePath(module);
        analysis.modulesByPath.set(path, module);
      } else if (isConcatenatedModule(module)) {
        analysis.concatenatedModules++;
      }
    });
    
    return analysis;
  }
}
```

## Integration with Kibana Build System

### Optimizer Integration
This package is used by Kibana's optimizer to:
- Analyze module dependencies and relationships
- Optimize bundle splitting and code concatenation
- Generate useful build statistics and reports
- Handle build errors and warnings effectively

### Development Tools
Used in development tools for:
- Build performance analysis
- Module dependency tracking
- Bundle size optimization
- Error reporting and debugging

### CI/CD Integration
Integrated with continuous integration to:
- Validate build outputs
- Monitor bundle size changes
- Report build performance metrics
- Catch optimization regressions

## Performance Optimization

The utilities in this package help optimize Kibana's build performance by:
- **Module Analysis**: Understanding module relationships for better splitting
- **Error Handling**: Quick identification and resolution of build issues
- **Statistics Filtering**: Reducing noise in build output for faster analysis
- **Type Detection**: Enabling module-specific optimizations

This package serves as a foundation for Kibana's sophisticated build optimization system, enabling efficient compilation and bundling of the large Kibana codebase while maintaining development productivity.
