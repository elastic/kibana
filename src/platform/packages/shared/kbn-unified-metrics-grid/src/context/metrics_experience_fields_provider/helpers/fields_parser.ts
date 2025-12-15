/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { MetricField, Dimension } from '../../../types';
import { hasValue } from '../../../common/utils/fields';
import { DIMENSION_TYPES } from '../../../common/constants';

const FILTER_OUT_FIELDS = new Set([
  '_id',
  '_index',
  '_source',
  '_size',
  '_doc_count',
  '_field_names',
  '_ignored',
  '_routing',
  '_meta',
  '_tier',
  '_metric_names_hash',
]);

const shouldSkipField = (fieldName: string) => FILTER_OUT_FIELDS.has(fieldName);

/**
 * Extracts metric fields and dimensions from a data view and esql result columns.
 * @param index - The index pattern to use for the metric fields.
 * @param dataViewFieldMap - The data view field map to use for the metric fields.
 * @param columns - The columns to use for the metric fields.
 * @returns The metric fields and dimensions.
 */
export const extractFields = ({
  index,
  dataViewFieldMap,
  columns = [],
}: {
  index: string;
  dataViewFieldMap: DataViewFieldMap;
  columns?: DatatableColumn[];
}): {
  metricFields: MetricField[];
  dimensions: Dimension[];
} => {
  const metricFields: MetricField[] = [];
  const dimensions: Dimension[] = [];

  const columnByName = new Map<string, DatatableColumn>(
    columns?.map((column) => [column.name, column]) ?? []
  );

  for (const [columnName, column] of columnByName) {
    if (shouldSkipField(columnName) || !Object.hasOwn(dataViewFieldMap, columnName)) {
      continue;
    }

    const dataViewField = dataViewFieldMap[columnName];
    const fieldType = (column?.meta?.esType || dataViewField.esTypes?.[0]) as ES_FIELD_TYPES;

    if (fieldType === undefined) {
      continue;
    }

    if (Boolean(dataViewField.timeSeriesMetric)) {
      metricFields.push({
        index: column.meta?.index ?? index,
        name: columnName,
        type: fieldType,
        instrument: dataViewField.timeSeriesMetric,
        dimensions: [],
      });
    } else if (Boolean(dataViewField.timeSeriesDimension) || DIMENSION_TYPES.includes(fieldType)) {
      dimensions.push({
        name: columnName,
        type: fieldType,
      });
    }
  }

  return {
    metricFields,
    dimensions,
  };
};

export interface RowMappings {
  sampleRowByMetric: Map<string, DatatableRow>;
  fieldSpecsByRow: WeakMap<DatatableRow, MetricField>;
}

/**
 * Creates a map of metric field name → (value → row).
 * @param rows - The rows to use for the sample rows.
 * @param fieldSpecs - The field specs to use for the sample rows.
 * @returns The sample rows by metric field name.
 */
export const createSampleRowByMetric = ({
  rows = [],
  fieldSpecs,
}: {
  rows: DatatableRow[];
  fieldSpecs: MetricField[];
}): RowMappings => {
  const sampleRowByMetric = new Map<string, DatatableRow>();
  const specByRow = new WeakMap<DatatableRow, MetricField>();

  if (!rows?.length || fieldSpecs.length === 0) {
    return { sampleRowByMetric, fieldSpecsByRow: specByRow };
  }

  const specByFieldName = new Map<string, MetricField>();
  const pendingSamples = new Set<string>();

  for (const spec of fieldSpecs) {
    specByFieldName.set(spec.name, spec);
    pendingSamples.add(spec.name);
  }

  for (const row of rows) {
    for (const fieldName in row) {
      if (specByFieldName.has(fieldName) && hasValue(row[fieldName])) {
        const spec = specByFieldName.get(fieldName)!;
        specByRow.set(row, spec);

        if (pendingSamples.has(spec.name)) {
          sampleRowByMetric.set(spec.name, row);
          pendingSamples.delete(spec.name);
        }
      }
    }
  }

  return { sampleRowByMetric, fieldSpecsByRow: specByRow };
};

/**
 * Creates a map of dimension name → (value → Set<metricFieldKey>).
 * @param rows - The rows to use for the values.
 * @param specByRow - The spec by row to use for the values.
 * @param requiredFields - The required fields to use for the values.
 * @param dimensions - The dimensions to use for the values.
 * @returns The values by dimension name.
 */
export const createValuesByDimensions = ({
  rows,
  specByRow,
  requiredFields,
  dimensions,
}: {
  rows: DatatableRow[];
  specByRow: WeakMap<DatatableRow, MetricField>;
  requiredFields: string[];
  dimensions: Dimension[];
}): Map<string, Map<string, Set<string>>> => {
  const result = new Map<string, Map<string, Set<string>>>();

  if (!rows?.length || requiredFields.length === 0) {
    return result;
  }

  const requiredFieldsSet = new Set(requiredFields);

  for (const row of rows) {
    const spec = specByRow.get(row);
    if (!spec) {
      continue;
    }

    for (const dim of dimensions) {
      const dimensionValue = row[dim.name];
      if (!requiredFieldsSet.has(dim.name) || !hasValue(dimensionValue)) {
        continue;
      }

      const value = String(dimensionValue);
      let dimensionMap = result.get(dim.name);

      if (!dimensionMap) {
        dimensionMap = new Map();
        result.set(dim.name, dimensionMap);
      }

      const existingSet = dimensionMap.get(value);
      if (existingSet) {
        existingSet.add(spec.name);
      } else {
        dimensionMap.set(value, new Set([spec.name]));
      }
    }
  }

  return result;
};
