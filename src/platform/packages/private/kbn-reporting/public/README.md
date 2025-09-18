# @kbn/reporting-public

Public (browser-side) utilities for Kibana Reporting functionality. This package provides client-side components and utilities for integrating with the reporting system from browser-based Kibana interfaces.

## Overview

Contains browser-side utilities for interacting with Kibana's reporting system, including UI components for report generation, status monitoring, and export functionality.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: Browser-side reporting utilities
- **Integration**: Used by plugins to integrate reporting features

## Core Features

### Report Generation UI
- Components for triggering report generation
- Export button implementations  
- Report configuration interfaces

### Status and Monitoring
- Report status tracking utilities
- Progress indicators for report generation
- Error handling for failed reports

## Usage

```typescript
import { ReportingPublicUtilities } from '@kbn/reporting-public';

// Used internally by reporting-enabled features
const reportGenerator = new ReportingPublicUtilities(dependencies);
```

## Integration

Used by Kibana features that need to provide reporting functionality to users, including dashboards, discover, and visualization interfaces.
