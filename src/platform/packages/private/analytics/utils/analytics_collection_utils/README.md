# @kbn/analytics-collection-utils

Utilities for analytics data collection in Kibana. This package provides helper functions and utilities for collecting, processing, and managing analytics data across Kibana features.

## Overview

Contains utilities for standardizing analytics data collection patterns, ensuring consistent tracking of user interactions and system metrics across Kibana.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: Analytics data collection utilities
- **Integration**: Used by features that need analytics tracking

## Core Features

### Data Collection Utilities
- Event tracking helpers
- User interaction metrics
- Performance measurement utilities
- Analytics data formatting

## Usage

```typescript
import { AnalyticsCollectionUtils } from '@kbn/analytics-collection-utils';

// Used for consistent analytics tracking
const analytics = new AnalyticsCollectionUtils(config);
```

## Integration

Used throughout Kibana to provide consistent analytics data collection for user experience insights and feature usage tracking.
