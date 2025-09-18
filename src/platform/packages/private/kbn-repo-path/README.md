# @kbn/repo-path

Repository path utilities for Kibana development tools. This package provides a `RepoPath` class for managing file paths within the Kibana monorepo, offering efficient path operations with lazy-loaded properties.

## Overview

The `@kbn/repo-path` package provides utilities for working with file paths in the context of the Kibana repository structure. It offers an efficient way to handle both repository-relative and absolute paths with cached property access for optimal performance in build tools and scripts.

## Package Details

- **Package Type**: `private` (platform internal)
- **Visibility**: Private to platform packages
- **Dependencies**: Node.js `path` module

## Core Components

### RepoPath Class
A utility class that represents a file path within the repository, providing both repository-relative and absolute path representations with lazy-loaded properties.

#### Constructor
```typescript
new RepoPath(repoRoot: string, repoRel: string)
```

#### Properties
- `repoRoot` - Root path of the repository
- `repoRel` - Repository-relative path to the file
- `abs` - Absolute path to the file (lazy-loaded)
- `ext` - File extension (lazy-loaded)
- `basename` - Filename with extension (lazy-loaded)
- `repoRelDir` - Repository-relative directory path (lazy-loaded)

## Usage Examples

### Basic Path Operations
```typescript
import { RepoPath } from '@kbn/repo-path';

const repoPath = new RepoPath(
  '/Users/dev/kibana',
  'src/platform/packages/shared/kbn-utils/index.ts'
);

// Access path properties
console.log(repoPath.repoRoot);    // '/Users/dev/kibana'
console.log(repoPath.repoRel);     // 'src/platform/packages/shared/kbn-utils/index.ts'
console.log(repoPath.abs);         // '/Users/dev/kibana/src/platform/packages/shared/kbn-utils/index.ts'
console.log(repoPath.ext);         // '.ts'
console.log(repoPath.basename);    // 'index.ts'
```

### Working with File Collections
```typescript
import { RepoPath } from '@kbn/repo-path';

function processFiles(files: string[], repoRoot: string) {
  const repoPaths = files.map(file => new RepoPath(repoRoot, file));
  
  return repoPaths.filter(path => path.ext === '.ts').map(path => ({
    relative: path.repoRel,
    absolute: path.abs,
    directory: path.repoRelDir
  }));
}
```

### Build Tool Integration
```typescript
import { RepoPath } from '@kbn/repo-path';

class FileMapper {
  constructor(private repoRoot: string) {}
  
  mapFile(relativePath: string) {
    const repoPath = new RepoPath(this.repoRoot, relativePath);
    
    return {
      source: repoPath.abs,
      output: this.getOutputPath(repoPath),
      isTypeScript: repoPath.ext === '.ts'
    };
  }
  
  private getOutputPath(repoPath: RepoPath) {
    return repoPath.repoRel.replace(repoPath.ext, '.js');
  }
}
```

## Performance Features

### Lazy Loading
All computed properties (`abs`, `ext`, `basename`, `repoRelDir`) are lazy-loaded and cached, ensuring optimal performance when working with large numbers of file paths.

### Memory Efficiency
Properties are only computed when first accessed and then cached, reducing memory usage and computation overhead in build tools that process thousands of files.

## Integration with Kibana Tools

This package is used by several Kibana development utilities:

- **kbn-get-repo-files**: Efficient file discovery and path management
- **kbn-repo-file-maps**: Creating mappings between packages and their files
- **TypeScript Project Management**: Managing file paths across TS projects

The package provides a foundation for path operations in Kibana's build system, ensuring consistent and efficient handling of repository file structures across all development tools.
