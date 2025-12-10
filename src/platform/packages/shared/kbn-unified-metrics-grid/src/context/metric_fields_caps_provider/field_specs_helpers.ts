/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { FieldSpec as MetricFieldSpecs, Dimension } from '../../types';
import {
  isMetricField,
  hasValue,
  buildFieldSpecId,
  type FieldSpecId,
} from '../../common/utils/fields';

const INVALID_FIELD_NAME = '_metric_names_hash';

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
]);

const shouldSkipField = (fieldName: string) =>
  FILTER_OUT_FIELDS.has(fieldName) || fieldName === INVALID_FIELD_NAME;

/**
 * Builds sorted dimensions for an index.
 */
const buildDimensions = (dataViewFieldMap: DataViewFieldMap): Dimension[] => {
  const dimensions: Dimension[] = [];

  for (const fieldName in dataViewFieldMap) {
    if (shouldSkipField(fieldName)) {
      continue;
    }

    const spec = dataViewFieldMap[fieldName];
    if (spec.timeSeriesDimension) {
      dimensions.push({ name: fieldName, type: spec.esTypes?.[0] as ES_FIELD_TYPES });
    }
  }

  return dimensions.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Creates metric field specs from field caps.
 */
export const createFieldSpecs = (
  index: string,
  dataViewFieldMap: DataViewFieldMap
): MetricFieldSpecs[] => {
  if (Object.keys(dataViewFieldMap).length === 0) {
    return [];
  }

  const fieldSpecs: MetricFieldSpecs[] = [];

  for (const fieldName in dataViewFieldMap) {
    if (!Object.hasOwn(dataViewFieldMap, fieldName)) {
      continue;
    }

    if (shouldSkipField(fieldName)) {
      continue;
    }

    const fieldSpec = dataViewFieldMap[fieldName];
    const dimensions = buildDimensions(dataViewFieldMap);

    if (isMetricField(fieldSpec)) {
      fieldSpecs.push({
        key: fieldName,
        index,
        fieldName,
        fieldType: fieldSpec.esTypes?.[0] || 'unknown',
        typeInfo: fieldSpec,
        dimensions,
      });
    }
  }

  return fieldSpecs;
};

export interface RowMappings {
  sampleRowByMetric: Map<FieldSpecId, DatatableRow>;
  fieldSpecsByRow: WeakMap<DatatableRow, MetricFieldSpecs>;
}

export const createSampleRowByMetric = (
  rows: DatatableRow[] | undefined,
  fieldSpecs: MetricFieldSpecs[]
): RowMappings => {
  const sampleRowByMetric = new Map<FieldSpecId, DatatableRow>();
  const specByRow = new WeakMap<DatatableRow, MetricFieldSpecs>();

  if (!rows?.length || fieldSpecs.length === 0) {
    return { sampleRowByMetric, fieldSpecsByRow: specByRow };
  }

  const specByFieldName = new Map<string, MetricFieldSpecs>();
  for (const spec of fieldSpecs) {
    specByFieldName.set(spec.fieldName, spec);
  }

  const metricFieldNames = [...specByFieldName.keys()];
  const pendingSamples = new Set(fieldSpecs.map((s) => s.key));

  for (const row of rows) {
    for (const fieldName of metricFieldNames) {
      if (hasValue(row[fieldName])) {
        const spec = specByFieldName.get(fieldName)!;
        specByRow.set(row, spec);

        if (pendingSamples.has(spec.key)) {
          sampleRowByMetric.set(spec.key, row);
          pendingSamples.delete(spec.key);
        }
      }
    }
  }

  return { sampleRowByMetric, fieldSpecsByRow: specByRow };
};

/**
 * Creates a map of dimension name → (value → Set<metricFieldKey>).
 */
export const createValuesByDimensions = (
  rows: DatatableRow[] | undefined,
  specByRow: WeakMap<DatatableRow, MetricFieldSpecs>,
  requiredFields: FieldSpecId[]
): Map<string, Map<string, Set<FieldSpecId>>> => {
  const result = new Map<string, Map<string, Set<FieldSpecId>>>();

  if (!rows?.length || requiredFields.length === 0) {
    return result;
  }

  const requiredFieldsSet = new Set(requiredFields);

  for (const row of rows) {
    const spec = specByRow.get(row);
    if (!spec) {
      continue;
    }

    for (const dim of spec.dimensions) {
      const dimensionKey = buildFieldSpecId(spec.index, dim.name);
      const dimensionValue = row[dim.name];
      if (!requiredFieldsSet.has(dimensionKey) || !hasValue(dimensionValue)) {
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
        existingSet.add(spec.key);
      } else {
        dimensionMap.set(value, new Set([spec.key]));
      }
    }
  }

  return result;
};
