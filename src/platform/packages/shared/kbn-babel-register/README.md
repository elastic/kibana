# @kbn/babel-register

Babel registration utilities for Kibana development and build processes. This package provides setup and configuration for registering Babel transforms in Node.js environments.

## Overview

Contains utilities for registering Babel transforms in Node.js environments, enabling TypeScript and modern JavaScript features in development tools and build scripts.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Babel registration for Node.js environments
- **Integration**: Used by development and build tools

## Core Features

### Babel Registration
- TypeScript compilation setup
- Modern JavaScript feature support
- Import/export transform registration
- Development-time transpilation

### Configuration Management
- Babel preset configuration
- Plugin setup and optimization
- Environment-specific transforms

## Usage

```javascript
// Register Babel transforms for Node.js
require('@kbn/babel-register');

// Now TypeScript and modern JS features work in Node.js
import { myFunction } from './typescript-file.ts';
```

## Integration

Used by Kibana's development tools, build scripts, and testing infrastructure to enable modern JavaScript and TypeScript in Node.js environments.
