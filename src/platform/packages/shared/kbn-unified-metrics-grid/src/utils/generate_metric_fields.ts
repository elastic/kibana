/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { DataTableRecord } from '@kbn/discover-utils';
import type {
  Dimension,
  MetricField,
  MetricUnit,
} from '@kbn/metrics-experience-plugin/common/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

/**
 * This module translates Discover's current ES|QL result set plus the field caps
 * response into the `MetricField[]` structure that the unified metrics grid expects.
 *
 * High‑level data flow:
 * 1. `createMetricDefinitions` walks the field caps map to find every numeric metric
 *    field and records the set of dimension fields that share the same index.
 * 2. `createMetricRowLookup` scans the current Discover rows and captures the first
 *    row where each metric actually has a non-null value. This ensures we only keep
 *    metrics that appear in the current table.
 * 3. `generateMetricFields` joins those two data structures together—deriving the
 *    subset of dimensions that also have values in that row, normalizing metadata,
 *    and returning a sorted array for display.
 */

/**
 * Maps index names to their field capabilities. The structure is:
 * `{ [indexName]: { [fieldName]: { [esType]: FieldCapsFieldCapability } } }`
 */
export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

/**
 * Subset of Discover's result payload containing the rows we need to inspect.
 */
interface MetricFieldResults {
  rows?: DataTableRecord[];
}

/**
 * Normalizes field caps metadata (unit, display name) into a single string.
 * Handles both single strings and arrays of strings from Elasticsearch metadata.
 */
const formatMetaValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const filtered = value.filter((item): item is string => typeof item === 'string');
    return filtered.length ? filtered.join(', ') : undefined;
  }

  return undefined;
};

/**
 * Local copy of numeric field types that qualify as metrics.
 * Copied here to avoid importing from a non-public module.
 */
const NUMERIC_TYPES: ES_FIELD_TYPES[] = [
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.UNSIGNED_LONG,
  ES_FIELD_TYPES.HISTOGRAM,
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.TDIGEST,
];

/**
 * Determines if a field should be treated as a metric.
 * Prioritizes the `time_series_metric` flag, then falls back to checking
 * if the field type is numeric.
 */
const isMetricField = (fieldType: string, typeCaps: FieldCapsFieldCapability) => {
  if (typeCaps.time_series_metric) {
    return true;
  }

  return NUMERIC_TYPES.includes(fieldType as ES_FIELD_TYPES);
};

/**
 * Determines if a field should be treated as a dimension.
 * Only fields explicitly marked `time_series_dimension: true` qualify.
 */
const isDimensionField = (typeCaps: FieldCapsFieldCapability) => {
  return Boolean(typeCaps.time_series_dimension);
};

/**
 * Extracts all dimension definitions from a single index's field caps.
 * Returns a map of dimension name → Dimension object for fields that have
 * `time_series_dimension: true`.
 */
const extractDimensionDefinitions = (
  indexFieldCaps: Record<string, Record<string, FieldCapsFieldCapability>>
): Map<string, Dimension> => {
  return Object.entries(indexFieldCaps).reduce<Map<string, Dimension>>(
    (acc, [fieldName, fieldTypes]) => {
      // Check if any of the field's types qualify as a dimension
      const dimensionEntry = Object.entries(fieldTypes).find(([, typeCaps]) =>
        isDimensionField(typeCaps)
      );

      if (!dimensionEntry) {
        return acc;
      }

      // Store the dimension with its ES field type
      const [dimensionType] = dimensionEntry;
      acc.set(fieldName, {
        name: fieldName,
        type: dimensionType as ES_FIELD_TYPES,
      });
      return acc;
    },
    new Map()
  );
};

/**
 * Constructs a `MetricField` object from field caps metadata and a set of
 * dimensions. Normalizes metadata like unit and display name, and marks
 * whether the metric has data in the current result set.
 */
const createMetricField = ({
  index,
  fieldName,
  fieldType,
  typeInfo,
  dimensions,
  hasResult,
}: {
  index: string;
  fieldName: string;
  fieldType: string;
  typeInfo: FieldCapsFieldCapability;
  dimensions: Dimension[];
  hasResult?: boolean;
}): MetricField => {
  // Extract and normalize metadata from field caps
  const unitValue = formatMetaValue(typeInfo.meta?.unit);
  const displayValue = formatMetaValue(typeInfo.meta?.display);

  return {
    name: fieldName,
    index,
    dimensions,
    type: fieldType,
    instrument: typeInfo.time_series_metric,
    unit: unitValue as MetricUnit | undefined,
    display: displayValue,
    noData: typeof hasResult === 'boolean' ? !hasResult : undefined,
  };
};

/**
 * Checks if a field value is considered "present" (non-null, non-empty).
 * Handles arrays recursively and treats empty objects as absent.
 */
const hasValue = (value: unknown): boolean => {
  // Null or undefined = no value
  if (value == null) {
    return false;
  }

  // For arrays, at least one element must have a value
  if (Array.isArray(value)) {
    return value.some((item) => hasValue(item));
  }

  // For objects, must have at least one key
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  // Primitives (strings, numbers, booleans) are considered present
  return true;
};

/**
 * Retrieves a field value from a Discover row. Checks multiple locations
 * in priority order: `flattened`, `raw.fields`, then `_source`.
 * This handles differences in how ES|QL and standard queries structure data.
 */
const getRowFieldValue = (row: DataTableRecord, fieldName: string) => {
  // First check the flattened representation (most common for ES|QL)
  if (row.flattened && Object.prototype.hasOwnProperty.call(row.flattened, fieldName)) {
    return row.flattened[fieldName];
  }

  // Then check raw.fields (used by some query types)
  const rawFields = row.raw?.fields as Record<string, unknown> | undefined;
  if (rawFields && Object.prototype.hasOwnProperty.call(rawFields, fieldName)) {
    return rawFields[fieldName];
  }

  // Finally fall back to _source
  const source = row.raw?._source as Record<string, unknown> | undefined;
  return source ? source[fieldName] : undefined;
};

/**
 * Filters the full set of dimension definitions down to only those that have
 * non-null values in the given row. Returns the dimensions sorted alphabetically
 * by name.
 */
const getDimensionsFromRow = (
  row: DataTableRecord | undefined,
  dimensionDefinitions: Map<string, Dimension>
) => {
  if (!row || dimensionDefinitions.size === 0) {
    return [];
  }

  const dimensionEntries: Dimension[] = [];

  // Check each dimension to see if it has a value in this row
  for (const [dimensionName, dimensionDefinition] of dimensionDefinitions.entries()) {
    const dimensionValue = getRowFieldValue(row, dimensionName);
    if (hasValue(dimensionValue)) {
      dimensionEntries.push(dimensionDefinition);
    }
  }

  // Sort alphabetically for consistent display
  return dimensionEntries.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Internal representation of a metric field's metadata, including the set of
 * dimension definitions that exist in the same index. Used to build the final
 * `MetricField[]` array.
 */
interface MetricDefinition {
  /** Unique key combining index and field name */
  key: string;
  /** Index pattern where this metric is defined */
  index: string;
  /** Field name of the metric */
  fieldName: string;
  /** Elasticsearch field type */
  fieldType: string;
  /** Full field caps metadata */
  typeInfo: FieldCapsFieldCapability;
  /** All dimensions available in the same index */
  dimensionDefinitions: Map<string, Dimension>;
}

/**
 * Generates a unique key for a metric by combining its index and field name.
 */
const generateMetricKey = (index: string, field: string) => `${index}:${field}`;

/**
 * Precomputes metric metadata from field caps. Each entry includes the field caps
 * for the metric itself plus the compatible dimension definitions that exist in
 * the same index. This allows us to map rows back to their originating field caps
 * without recomputing this structure for every request.
 *
 * @returns An object containing:
 *   - `metricDefinitions`: Array of all metric definitions found
 *   - `metricsByFieldName`: Map for fast lookup of metrics by field name
 */
const createMetricDefinitions = (fieldCaps: FieldCapsResponseMap) => {
  const metricDefinitions: MetricDefinition[] = [];
  const metricsByFieldName = new Map<string, MetricDefinition[]>();

  // Walk through each index in the field caps response
  for (const [indexName, indexFieldCaps] of Object.entries(fieldCaps)) {
    if (!indexFieldCaps) {
      continue;
    }

    // Extract all dimensions for this index once
    const dimensionDefinitions = extractDimensionDefinitions(indexFieldCaps);

    // Check each field to see if it's a metric
    for (const [fieldName, fieldTypes] of Object.entries(indexFieldCaps)) {
      const metricEntry = Object.entries(fieldTypes).find(([fieldType, typeCaps]) =>
        isMetricField(fieldType, typeCaps)
      );

      if (!metricEntry) {
        continue;
      }

      // Build the metric definition with its associated dimensions
      const [fieldType, typeInfo] = metricEntry;
      const key = generateMetricKey(indexName, fieldName);
      const definition: MetricDefinition = {
        key,
        index: indexName,
        fieldName,
        fieldType,
        typeInfo,
        dimensionDefinitions,
      };

      // Store in both the flat array and the lookup map
      metricDefinitions.push(definition);
      const definitions = metricsByFieldName.get(fieldName) ?? [];
      definitions.push(definition);
      metricsByFieldName.set(fieldName, definitions);
    }
  }

  return { metricDefinitions, metricsByFieldName };
};

/**
 * Extracts all field names present in a row by combining keys from both
 * `flattened` and `_source`. Returns a deduplicated array.
 */
const getRowFieldNames = (row: DataTableRecord) => {
  const flattenedKeys = Object.keys(row.flattened ?? {});
  const sourceKeys = Object.keys((row.raw?._source as Record<string, unknown>) ?? {});
  return [...new Set([...flattenedKeys, ...sourceKeys])];
};

/**
 * Builds a lookup that maps each metric (index+field) to the first row in the
 * Discover table where that metric has a concrete value. The rows are only
 * scanned until each metric has been satisfied which keeps the work proportional
 * to the number of metrics rather than the row count.
 *
 * @param rows - The current Discover result rows
 * @param metricsByFieldName - Map of field names to their metric definitions
 * @param metricDefinitions - All metric definitions to look up
 * @returns Map of metric key → first row where that metric has a value
 */
const createMetricRowLookup = (
  rows: DataTableRecord[] | undefined,
  metricsByFieldName: Map<string, MetricDefinition[]>,
  metricDefinitions: MetricDefinition[]
) => {
  const lookup = new Map<string, DataTableRecord>();
  if (!rows?.length || !metricsByFieldName.size || !metricDefinitions.length) {
    return lookup;
  }

  // Track which metrics we still need to find
  const remainingMetrics = new Set(metricDefinitions.map((definition) => definition.key));

  // Scan rows until all metrics are satisfied
  for (const row of rows) {
    const fieldNames = getRowFieldNames(row);

    for (const fieldName of fieldNames) {
      // Look up all metric definitions for this field name
      const definitions = metricsByFieldName.get(fieldName);
      if (!definitions?.length) {
        continue;
      }

      // Check if the field has a value in this row
      const fieldValue = getRowFieldValue(row, fieldName);
      if (!hasValue(fieldValue)) {
        continue;
      }

      // Associate this row with each matching metric definition
      for (const definition of definitions) {
        if (!remainingMetrics.has(definition.key)) {
          continue;
        }

        lookup.set(definition.key, row);
        remainingMetrics.delete(definition.key);
      }
    }

    // Early exit if we've found all metrics
    if (remainingMetrics.size === 0) {
      break;
    }
  }

  return lookup;
};

/**
 * Converts field caps plus the current ES|QL results into the `MetricField[]`
 * consumed by the grid. Only metrics that appear in the current results (i.e.
 * have at least one non-null row) are returned, and each carries the subset of
 * dimensions that also have values in that same row.
 *
 * @param fieldCaps - The field capabilities response from Elasticsearch
 * @param results - The current Discover result set (rows and columns)
 * @returns Array of metric fields with their associated dimensions, sorted alphabetically
 */
export const generateMetricFields = (
  fieldCaps: FieldCapsResponseMap = {},
  results?: MetricFieldResults
): MetricField[] => {
  if (!fieldCaps) {
    return [];
  }

  const metricFields: MetricField[] = [];

  // Step 1: Extract all metric definitions from field caps
  const { metricDefinitions, metricsByFieldName } = createMetricDefinitions(fieldCaps);

  // Step 2: Build a lookup of which row contains each metric
  const metricRowLookup = createMetricRowLookup(
    results?.rows,
    metricsByFieldName,
    metricDefinitions
  );

  // Step 3: Sort metrics alphabetically by field name, then by index
  const sortedMetricDefinitions = [...metricDefinitions].sort((a, b) => {
    const nameComparison = a.fieldName.localeCompare(b.fieldName);
    if (nameComparison !== 0) {
      return nameComparison;
    }
    return a.index.localeCompare(b.index);
  });

  // Step 4: Build the final metric fields array
  for (const definition of sortedMetricDefinitions) {
    const row = metricRowLookup.get(definition.key);

    // Skip metrics that don't have any data in the current results
    if (!row) {
      continue;
    }

    // Filter dimensions to only those with values in this row
    const dimensions = getDimensionsFromRow(row, definition.dimensionDefinitions);

    metricFields.push(
      createMetricField({
        index: definition.index,
        fieldName: definition.fieldName,
        fieldType: definition.fieldType,
        typeInfo: definition.typeInfo,
        dimensions,
        hasResult: true,
      })
    );
  }

  return metricFields;
};
