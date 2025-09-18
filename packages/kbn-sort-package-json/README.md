# @kbn/sort-package-json

CLI tool for sorting package.json files in Kibana monorepo. This package provides utilities for consistently formatting and sorting package.json files across all Kibana packages.

## Overview

Command-line tool for maintaining consistent package.json formatting across the Kibana monorepo, ensuring standardized field ordering and structure.

## Package Details

- **Package Type**: Development tool
- **Purpose**: Package.json formatting and sorting
- **Integration**: Used in development workflows and CI

## Usage

```bash
# Sort package.json files
yarn kbn sort-package-json

# Sort specific package
yarn kbn sort-package-json packages/my-package/package.json
```
