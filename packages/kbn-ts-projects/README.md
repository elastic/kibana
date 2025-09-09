# @kbn/ts-projects

TypeScript project management utilities for the Kibana monorepo. This package provides tools for discovering, loading, and managing TypeScript projects across the entire Kibana codebase.

## Overview

The `@kbn/ts-projects` package is a development-only utility that handles TypeScript project configuration management in Kibana's complex monorepo structure. It automatically discovers tsconfig.json files, manages project references, and provides a unified interface for TypeScript project operations.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/kibana-operations`
- **Development Only**: Yes (devOnly: true)
- **Dependencies**: `@kbn/repo-info`, `@kbn/picomatcher`, `@kbn/repo-packages`, `@kbn/dev-cli-errors`

## Core Components

### TsProject Class
Represents a single TypeScript project with its configuration, dependencies, and metadata.

### TS_PROJECTS Constant
Pre-configured collection of all TypeScript projects in the Kibana repository, with specific ignore patterns and type-check configurations.

### TsConfig Interface
TypeScript configuration file parser and type definitions.

## Key Features

### Project Discovery
- Automatically scans the repository for `tsconfig.json` files
- Handles nested project structures and dependencies
- Manages project references and build order

### Configuration Management
- Parses and validates TypeScript configuration files
- Resolves project references and dependencies
- Handles incremental compilation settings

### Selective Type Checking
- Allows disabling type checking for specific projects
- Manages projects with external dependencies
- Handles special cases like Buildkite configurations

## Usage Examples

### Loading All Projects
```typescript
import { TS_PROJECTS } from '@kbn/ts-projects';

// Get all TypeScript projects in the repository
console.log(`Found ${TS_PROJECTS.length} TypeScript projects`);

// Iterate through projects
for (const project of TS_PROJECTS) {
  console.log(project.name, project.directory);
}
```

### Working with Individual Projects
```typescript
import { TsProject } from '@kbn/ts-projects';

// Load a specific project
const project = new TsProject('path/to/tsconfig.json');

// Access project properties
console.log(project.name);
console.log(project.directory);
console.log(project.config);
console.log(project.isTypeCheckEnabled());
```

### Project Configuration
```typescript
import type { TsConfig } from '@kbn/ts-projects';

// Work with TypeScript configuration
const config: TsConfig = {
  compilerOptions: {
    strict: true,
    target: "ES2020"
  },
  include: ["src/**/*"],
  references: [
    { path: "../shared-package" }
  ]
};
```

## Configuration Options

### Ignore Patterns
Projects matching these patterns are excluded:
- `**/__fixtures__/**/*` - Test fixture directories

### Disabled Type Checking
These projects have type checking disabled:
- `.buildkite/tsconfig.json` - CI/CD configurations with external dependencies

## Integration with Build Tools

This package is used by several Kibana development tools:

- **ESLint with Types**: Provides TypeScript project context for linting
- **Type Check CLI**: Manages which projects to type check
- **Repository File Maps**: Maps files to their TypeScript projects
- **Project Linting**: Validates TypeScript project configurations

The package ensures consistent TypeScript project management across all Kibana development workflows, enabling efficient incremental builds and type checking in the large monorepo.
