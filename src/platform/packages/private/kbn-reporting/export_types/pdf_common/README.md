# @kbn/reporting-export-types-pdf-common

Common utilities for PDF export functionality in Kibana Reporting. This package provides shared code and utilities used across PDF export features in the reporting system.

## Overview

Contains common utilities, types, and helper functions specifically for PDF export operations in Kibana's reporting system.

## Package Details

- **Package Type**: `private` (platform internal)  
- **Purpose**: PDF export utilities for reporting
- **Integration**: Used by reporting plugins for PDF generation

## Core Features

### PDF Generation Utilities
- PDF document creation helpers
- Layout and formatting utilities
- Common PDF export configurations
- Error handling for PDF operations

## Usage

```typescript
import { PDFExportUtilities } from '@kbn/reporting-export-types-pdf-common';

// Used internally by reporting system
const pdfExport = new PDFExportUtilities(config);
```

## Integration

Used by Kibana's reporting system to provide consistent PDF export functionality across dashboards, visualizations, and other exportable content.
