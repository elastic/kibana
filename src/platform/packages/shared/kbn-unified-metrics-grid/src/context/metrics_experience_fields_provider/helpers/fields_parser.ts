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
}

/**
 * Creates a map of metric field name → sample rows.
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

  if (!rows?.length || fieldSpecs.length === 0) {
    return { sampleRowByMetric };
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

        if (pendingSamples.has(spec.name)) {
          sampleRowByMetric.set(spec.name, row);
          pendingSamples.delete(spec.name);
        }
      }
    }
  }

  return { sampleRowByMetric };
};
