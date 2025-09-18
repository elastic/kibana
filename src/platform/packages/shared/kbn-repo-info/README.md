# @kbn/repo-info

Repository information utilities for Kibana development. This package provides functions and constants for accessing repository metadata, paths, and build information.

## Overview

Contains utilities for accessing Kibana repository information including root paths, version data, and build metadata used throughout development tools and build processes.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Repository metadata and path utilities
- **Integration**: Used by build tools and development utilities

## Core Features

### Repository Paths
- `REPO_ROOT` - Absolute path to repository root
- Path resolution utilities
- Package location helpers

### Build Information
- Version information access
- Build metadata utilities
- Repository state information

## Usage

```typescript
import { REPO_ROOT, getPackageInfo } from '@kbn/repo-info';

console.log('Repository root:', REPO_ROOT);
const packageInfo = getPackageInfo('my-package');
```

## Integration

Fundamental utility used throughout Kibana's build system, development tools, and package management scripts.
