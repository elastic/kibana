# @kbn/babel-transform

Babel transformation utilities for Kibana's build system. This package provides custom Babel transforms and configurations specifically designed for Kibana's complex monorepo structure and build requirements.

## Overview

Contains Babel transformation utilities that handle TypeScript compilation, import resolution, and other build-time transformations required for Kibana's development and production builds.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: Babel transformations for build system
- **Dependencies**: Babel ecosystem packages

## Core Features

### Custom Transforms
- TypeScript to JavaScript compilation
- Import path resolution and rewriting
- Module format transformations
- Build optimization transforms

## Usage

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@kbn/babel-transform/preset', options]
  ]
};
```

## Integration

Used throughout Kibana's build pipeline to ensure consistent code transformation across all packages and plugins.
