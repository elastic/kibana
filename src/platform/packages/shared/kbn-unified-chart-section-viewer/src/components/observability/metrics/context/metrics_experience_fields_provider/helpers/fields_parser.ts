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
import type { MetricField, Dimension } from '../../../../../../types';
import { hasValue } from '../../../../../../common/utils/fields';
import { DIMENSION_TYPES } from '../../../../../../common/constants';

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
 * Categorizes fields from ES|QL result columns into metric fields and dimensions
 * based on data view metadata. Only considers fields that are not null in the ES|QL result.
 * Results are sorted alphabetically by name.
 * @param index - The index pattern to use for the metric fields.
 * @param dataViewFieldMap - The data view field map to use for the metric fields.
 * @param columns - The columns to use for the metric fields.
 * @returns The metric fields and dimensions, sorted alphabetically by name.
 */
export const categorizeFields = ({
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
    const fieldType = (column.meta?.esType || dataViewField.esTypes?.[0]) as ES_FIELD_TYPES;

    if (fieldType === undefined || column.isNull) {
      continue;
    }

    if (dataViewField.timeSeriesMetric) {
      metricFields.push({
        index: column.meta?.index ?? index,
        name: columnName,
        type: fieldType,
        instrument: dataViewField.timeSeriesMetric,
        dimensions: [],
      });
    } else if (dataViewField.timeSeriesDimension || DIMENSION_TYPES.includes(fieldType)) {
      dimensions.push({
        name: columnName,
        type: fieldType,
      });
    }
  }

  return {
    metricFields: metricFields.sort((a, b) => a.name.localeCompare(b.name)),
    dimensions: dimensions.sort((a, b) => a.name.localeCompare(b.name)),
  };
};

export const createSampleRowByField = ({
  rows,
  fieldNames,
}: {
  rows: DatatableRow[];
  fieldNames: string[];
}): Map<string, number> => {
  const sampleRowIndex = new Map<string, number>();

  if (!rows.length || !fieldNames.length) {
    return sampleRowIndex;
  }

  const fieldNamesSet = new Set(fieldNames);

  for (let i = 0; i < rows.length; i++) {
    if (sampleRowIndex.size === fieldNamesSet.size) {
      break;
    }

    const row = rows[i];
    for (const fieldName of fieldNamesSet) {
      if (!sampleRowIndex.has(fieldName) && hasValue(row[fieldName])) {
        sampleRowIndex.set(fieldName, i);
      }
    }
  }

  return sampleRowIndex;
};
