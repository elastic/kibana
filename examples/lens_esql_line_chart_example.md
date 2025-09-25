# ES|QL Line Chart Preference Feature

This example demonstrates the new feature that automatically suggests line charts instead of bar charts for ES|QL queries containing STATS operations with non-COUNT aggregations combined with BY BUCKET(@timestamp, ...).

## How it Works

The Lens suggestion system now analyzes ES|QL queries and detects when:

1. The query contains a STATS command
2. The STATS uses aggregation functions like AVG(), SUM(), MAX(), MIN(), MEDIAN(), or PERCENTILE() (but NOT COUNT(*))
3. The BY clause includes BUCKET(@timestamp, ...) or BUCKET(other_timestamp_field, ...)

When these conditions are met, the system prefers line charts over bar charts as the default suggestion.

## Examples

### ✅ **Will suggest Line Chart** (AVG with timestamp buckets)

```esql
FROM logs-*
| STATS avg_response_time = AVG(response_time) 
  BY BUCKET(@timestamp, 1h)
```

### ✅ **Will suggest Line Chart** (SUM with timestamp buckets)

```esql  
FROM metrics-*
| STATS total_bytes = SUM(bytes_sent) 
  BY BUCKET(@timestamp, 30m), service.name
```

### ✅ **Will suggest Line Chart** (PERCENTILE with timestamp buckets)

```esql
FROM logs-*
| WHERE response_time > 0
| STATS 
    p95_response = PERCENTILE(response_time, 95),
    p99_response = PERCENTILE(response_time, 99)
  BY BUCKET(@timestamp, 5m)
```

### ✅ **Will suggest Line Chart** (MAX with custom timestamp field)

```esql
FROM events-*
| STATS max_cpu_usage = MAX(cpu.percent)
  BY BUCKET(event.timestamp, 15m), host.name
```

### ❌ **Will NOT suggest Line Chart** (COUNT(*) - histogram use case)

```esql
FROM logs-*
| STATS event_count = COUNT(*)
  BY BUCKET(@timestamp, 1h)
```

### ❌ **Will NOT suggest Line Chart** (No BUCKET function)

```esql
FROM logs-*  
| STATS avg_response_time = AVG(response_time)
  BY service.name
```

### ❌ **Will NOT suggest Line Chart** (BUCKET but no aggregation)

```esql
FROM logs-*
| STATS BUCKET(@timestamp, 1h)
```

## Why This Matters

This feature improves the user experience by:

1. **Better Default Visualizations**: Time-series data with continuous metrics (like averages, sums) are better visualized as line charts rather than bar charts
2. **Semantic Understanding**: The system understands the difference between histogram data (COUNT(*)) and time-series metrics (AVG, SUM, etc.)
3. **Automatic Intelligence**: Users don't need to manually switch from bar to line charts for time-series analysis

## Technical Implementation

The feature works by:

1. **Query Analysis**: Using the ES|QL AST parser to analyze the query structure
2. **Pattern Detection**: Looking for specific combinations of STATS aggregations and BUCKET functions
3. **Suggestion Modification**: Intercepting the normal suggestion flow and switching to line charts when the pattern is detected

The analysis is performed in the `shouldPreferLineChartForESQLQuery()` function, which is called during the Lens suggestion generation process.
