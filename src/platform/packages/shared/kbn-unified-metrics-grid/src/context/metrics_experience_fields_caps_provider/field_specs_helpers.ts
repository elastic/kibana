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
import type { MetricField, Dimension } from '../../types';
import { getTimeSeriesMetric, hasValue } from '../../common/utils/fields';

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
 * Creates metric field specs from field caps.
 */
export const createFieldSpecs = ({
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

  if (Object.keys(dataViewFieldMap).length === 0) {
    return {
      metricFields,
      dimensions,
    };
  }

  for (const [fieldName, fieldSpec] of Object.entries(dataViewFieldMap)) {
    if (!Object.hasOwn(dataViewFieldMap, fieldName)) {
      continue;
    }

    if (shouldSkipField(fieldName)) {
      continue;
    }

    const timeSeriesMetric = getTimeSeriesMetric(fieldSpec, columnByName);
    if (Boolean(timeSeriesMetric)) {
      metricFields.push({
        index,
        name: fieldName,
        type: columnByName.get(fieldName)?.meta?.esType || 'unknown',
        instrument: timeSeriesMetric,
        dimensions: [],
      });
    } else if (Boolean(fieldSpec.timeSeriesDimension)) {
      dimensions.push({
        name: fieldName,
        type: columnByName.get(fieldName)?.meta?.esType as ES_FIELD_TYPES,
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
  for (const spec of fieldSpecs) {
    specByFieldName.set(spec.name, spec);
  }

  const metricFieldNames = [...specByFieldName.keys()];
  const pendingSamples = new Set(fieldSpecs.map((s) => s.name));

  for (const row of rows) {
    for (const fieldName of metricFieldNames) {
      if (hasValue(row[fieldName])) {
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
