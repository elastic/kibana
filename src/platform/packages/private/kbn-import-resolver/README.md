# @kbn/import-resolver

Module import resolution utilities for Kibana's build system. This package provides tools for resolving import paths, analyzing module dependencies, and handling import requirements across the complex Kibana monorepo structure.

## Overview

The `@kbn/import-resolver` package contains utilities for resolving and analyzing module imports in Kibana's build system. It helps manage the complex dependency relationships between packages, plugins, and modules across the entire monorepo.

## Package Details

- **Package Type**: `private` (platform internal)
- **Visibility**: Private to platform packages
- **Purpose**: Build system import resolution
- **Dependencies**: Node.js path utilities, module resolution libraries

## Core Components

### Import Resolver
Main resolution functionality for handling module import paths and dependencies.

### Import Request Helpers
Utilities for processing and analyzing import request structures:
- Import requirement parsing
- Path normalization
- Dependency mapping

### Resolve Result Types
TypeScript definitions for import resolution results and metadata.

## Key Features

### Module Path Resolution
- Resolves relative and absolute import paths
- Handles package-relative imports
- Manages monorepo-specific import patterns

### Dependency Analysis
- Analyzes import dependencies between modules
- Tracks cross-package dependencies
- Identifies circular dependency patterns

### Build System Integration
- Integrates with Webpack module resolution
- Supports custom resolution strategies
- Handles TypeScript path mapping

## Usage Examples

### Basic Import Resolution
```typescript
import { ImportResolver } from '@kbn/import-resolver';

const resolver = new ImportResolver({
  rootPath: '/path/to/kibana',
  packageMap: packageMappings
});

// Resolve import path
const resolved = await resolver.resolve('./utils/helper', {
  from: '/path/to/kibana/src/platform/plugin/index.ts'
});

console.log(resolved.resolvedPath);
console.log(resolved.packageName);
```

### Import Request Processing
```typescript
import { parseImportReq } from '@kbn/import-resolver';

// Parse import requirement
const importReq = parseImportReq('@kbn/utils/deep');

console.log({
  packageName: importReq.packageName,  // '@kbn/utils'
  subPath: importReq.subPath,          // 'deep'
  isRelative: importReq.isRelative,    // false
  isPackageImport: importReq.isPackageImport // true
});
```

### Dependency Analysis
```typescript
import { ImportResolver } from '@kbn/import-resolver';

const resolver = new ImportResolver(config);

// Analyze dependencies for a file
const dependencies = await resolver.getDependencies(
  '/path/to/kibana/src/platform/plugin/service.ts'
);

dependencies.forEach(dep => {
  console.log(`${dep.from} -> ${dep.to}`);
  console.log(`Package: ${dep.packageName}`);
  console.log(`Type: ${dep.importType}`);
});
```

### Custom Resolution Strategies
```typescript
import { ImportResolver } from '@kbn/import-resolver';

const resolver = new ImportResolver({
  resolvers: [
    // Custom resolver for plugin imports
    (request, context) => {
      if (request.startsWith('plugin:')) {
        return resolvePluginImport(request, context);
      }
      return null;
    },
    
    // Custom resolver for shared utilities
    (request, context) => {
      if (request.startsWith('@shared/')) {
        return resolveSharedImport(request, context);
      }
      return null;
    }
  ]
});
```

## Resolution Types

### Resolve Result Interface
```typescript
interface ResolveResult {
  resolvedPath: string;
  packageName?: string;
  importType: 'relative' | 'package' | 'external';
  metadata?: {
    isTypeOnly: boolean;
    isAsync: boolean;
    hasDefaultExport: boolean;
  };
}
```

### Import Request Interface
```typescript
interface ImportRequest {
  path: string;
  from: string;
  context?: {
    packageRoot: string;
    tsConfig?: object;
  };
}
```

## Integration with Build Tools

### Webpack Integration
```typescript
import { ImportResolver } from '@kbn/import-resolver';

// Webpack resolver plugin
class KibanaImportResolverPlugin {
  constructor(options) {
    this.resolver = new ImportResolver(options);
  }
  
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('KibanaImportResolver', (nmf) => {
      nmf.hooks.resolve.tapAsync('KibanaImportResolver', async (data, callback) => {
        try {
          const result = await this.resolver.resolve(data.request, data.context);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
      });
    });
  }
}
```

### TypeScript Integration
```typescript
// Custom TypeScript resolver
const tsResolver = {
  resolveModuleNames: (moduleNames, containingFile) => {
    return moduleNames.map(moduleName => {
      const resolved = resolver.resolve(moduleName, {
        from: containingFile
      });
      
      return {
        resolvedFileName: resolved.resolvedPath,
        isExternalLibraryImport: resolved.importType === 'external'
      };
    });
  }
};
```

## Performance Optimization

### Caching Strategy
- Implements intelligent caching of resolution results
- Invalidates cache based on file system changes
- Optimizes repeated resolution requests

### Lazy Loading
- Loads resolution strategies on-demand
- Defers expensive operations until needed
- Minimizes initial setup overhead

This package serves as a critical component of Kibana's build system, enabling efficient and accurate module resolution across the complex monorepo structure while supporting various import patterns and resolution strategies.
