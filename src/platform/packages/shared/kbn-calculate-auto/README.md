# @kbn/calculate-auto

Time interval calculation utilities for automatic bucketing in data visualization and aggregations. This package provides intelligent algorithms to determine optimal time intervals based on data ranges and target bucket counts.

## Overview

The `@kbn/calculate-auto` package contains the core logic for automatically calculating appropriate time intervals when displaying time-series data. It ensures optimal data visualization by selecting reasonable bucket sizes that balance detail with readability.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/obs-ux-management-team`
- **Visibility**: Shared across platform
- **Dependencies**: `moment`

## Core Functionality

### calculateAuto Object

The package exports a `calculateAuto` object with three main functions:

#### `calculateAuto.near(buckets, duration)`
Finds the interval closest to the target based on predefined rounding rules.

#### `calculateAuto.lessThan(buckets, duration)` 
Returns an interval that is less than the calculated target.

#### `calculateAuto.atLeast(buckets, duration)`
Returns an interval that is at least the calculated target.

## Rounding Rules

The package uses a sophisticated set of rounding rules that progress from milliseconds to years:

- **Sub-second**: 100ms, 500ms
- **Seconds**: 1s, 5s, 10s, 30s
- **Minutes**: 1m, 5m, 10m, 30m  
- **Hours**: 1h, 3h, 12h
- **Days**: 1d, 1 week
- **Months**: 1 month
- **Years**: 1 year

These rules ensure that automatically calculated intervals align with human-readable time boundaries.

## Usage Examples

### Basic Interval Calculation
```typescript
import { calculateAuto } from '@kbn/calculate-auto';
import moment from 'moment';

// Calculate interval for 50 buckets over 1 hour
const duration = moment.duration(1, 'hour');
const interval = calculateAuto.near(50, duration);
console.log(interval.humanize()); // "a minute"
```

### Different Calculation Strategies
```typescript
// Get interval closest to target
const nearInterval = calculateAuto.near(100, moment.duration(1, 'day'));

// Get interval less than target  
const lessThanInterval = calculateAuto.lessThan(100, moment.duration(1, 'day'));

// Get interval at least the target
const atLeastInterval = calculateAuto.atLeast(100, moment.duration(1, 'day'));
```

### Real-world Application
```typescript
// Automatically determine histogram intervals
function createHistogram(startTime: Date, endTime: Date, targetBuckets: number) {
  const duration = moment.duration(moment(endTime).diff(startTime));
  const interval = calculateAuto.near(targetBuckets, duration);
  
  return {
    interval: interval.asMilliseconds(),
    buckets: Math.ceil(duration.asMilliseconds() / interval.asMilliseconds())
  };
}
```

## Integration with Kibana

This package is used throughout Kibana's observability and data visualization features:

- **Logs Data Access**: Automatic interval calculation for log aggregations
- **Dataset Quality**: Time-based bucketing for data quality metrics
- **Streams App**: Timeline visualization with appropriate time intervals
- **Significant Events**: Automatic bucketing for event timelines

The package ensures consistent and intuitive time interval selection across all Kibana time-series visualizations, providing users with meaningful data granularity without overwhelming detail.
