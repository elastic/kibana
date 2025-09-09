# @kbn/ts-type-check-cli

CLI tool for TypeScript type checking in Kibana monorepo. This package provides command-line utilities for running TypeScript type checks across the complex Kibana project structure.

## Overview

Command-line tool for managing TypeScript type checking across the Kibana monorepo, providing efficient type validation for large-scale TypeScript projects.

## Package Details

- **Package Type**: Development tool
- **Purpose**: TypeScript type checking utilities
- **Integration**: Used in development workflows and CI

## Usage

```bash
# Run type check on all projects
yarn kbn type-check

# Type check specific projects
yarn kbn type-check --project packages/my-package
```
