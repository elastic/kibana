# @kbn/reporting-export-types-csv-common

Common utilities for CSV export functionality in Kibana Reporting. This package provides shared code and utilities used across CSV export features in the reporting system.

## Overview

Contains common utilities, types, and helper functions specifically for CSV export operations in Kibana's reporting system.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: CSV export utilities for reporting  
- **Integration**: Used by reporting plugins for data export

## Core Features

### CSV Generation Utilities
- CSV file creation and formatting
- Data serialization for CSV format
- Common CSV export configurations
- Character encoding and escaping utilities

## Usage

```typescript
import { CSVExportUtilities } from '@kbn/reporting-export-types-csv-common';

// Used internally by reporting system
const csvExport = new CSVExportUtilities(config);
```

## Integration

Used by Kibana's reporting system to provide consistent CSV export functionality for search results, saved searches, and data tables.
