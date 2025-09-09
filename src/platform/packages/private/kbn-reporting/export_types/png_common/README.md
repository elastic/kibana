# @kbn/reporting-export-types-png-common

Common utilities for PNG export functionality in Kibana Reporting. This package provides shared code and utilities used across PNG/image export features in the reporting system.

## Overview

Contains common utilities, types, and helper functions specifically for PNG and image export operations in Kibana's reporting system.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: PNG/image export utilities for reporting
- **Integration**: Used by reporting plugins for image generation

## Core Features

### Image Generation Utilities
- PNG image creation and optimization
- Screenshot capture utilities
- Image formatting and compression
- Common image export configurations

## Usage

```typescript
import { PNGExportUtilities } from '@kbn/reporting-export-types-png-common';

// Used internally by reporting system
const imageExport = new PNGExportUtilities(config);
```

## Integration

Used by Kibana's reporting system to provide consistent PNG export functionality for visualizations, dashboards, and other visual content.
