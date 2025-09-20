# ESQL Multi-Term Transformer

This package provides a utility function to transform the results of specific ESQL queries into a more visualization-friendly format.

## The Problem

When an ESQL query uses a `TS` source command and a `STATS ... BY` clause with multiple keyword fields in addition to a date bucket (e.g., `TS my_index | STATS AVG(bytes) BY BUCKET(@timestamp, ...), host.name, region`), the resulting data table has separate columns for each keyword field. While accurate, this format is not ideal for charting, as most charts expect a single field to use for breaking down a metric. This often leads to confusing or incorrect visualizations.

## The Solution

This utility identifies this specific data shape (one date column, one numeric column, and two or more string/keyword columns) resulting from a query using both `TS` and `STATS` commands and transforms it:

- It combines the multiple string columns into a single new column.
- The new column's name is a concatenation of the original column names (e.g., `host.name > region`).
- The values in the new column are a concatenation of the corresponding values from the original rows.
- The original string columns are removed.

This creates a single, unified dimension perfect for use as a "breakdown" field in a chart, resulting in a more intuitive and accurate visualization.

## Usage

```typescript
import { transformEsqlMultiTermBreakdown } from '@kbn/esql-multiterm-transformer';
import type { Datatable } from '@kbn/expressions-plugin/common';

// Assuming 'originalDatatable' is the result of an ESQL query
const originalDatatable: Datatable = {
  columns: [
    { id: 'date', name: '@timestamp', meta: { type: 'date' } },
    { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
    { id: 'host', name: 'host.name', meta: { type: 'string' } },
    { id: 'region', name: 'region', meta: { type: 'string' } },
  ],
  rows: [
    { date: 1672531200000, metric: 100, host: 'host-a', region: 'us-east-1' },
    { date: 1672531200000, metric: 200, host: 'host-b', region: 'us-west-2' },
  ],
  query: 'TS my_index | STATS AVG(bytes) BY BUCKET(@timestamp, 1d), host.name, region',
};

const transformedDatatable = transformEsqlMultiTermBreakdown(originalDatatable);

/*
transformedDatatable will be:
{
  columns: [
    { id: 'date', name: '@timestamp', meta: { type: 'date' } },
    { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
    { id: 'host.name > region', name: 'host.name > region', meta: { type: 'string', esqlType: 'keyword' } },
  ],
  rows: [
    { date: 1672531200000, metric: 100, 'host.name > region': 'host-a > us-east-1' },
    { date: 1672531200000, metric: 200, 'host.name > region': 'host-b > us-west-2' },
  ],
}
*/
```

## Restoring the Original Datatable

In cases where you need to revert the transformed datatable back to its original structure, you can use the `restoreOriginalDatatable` function. This function inspects the datatable for a transformed multi-term column and, if found, restores the original individual string columns and their corresponding values.

```typescript
import { restoreOriginalDatatable } from '@kbn/esql-multiterm-transformer';

// Assuming 'transformedDatatable' is the result of calling 'transformEsqlMultiTermBreakdown'
const restoredDatatable = restoreOriginalDatatable(transformedDatatable);

/*
restoredDatatable will be identical to the 'originalDatatable'
*/
```
