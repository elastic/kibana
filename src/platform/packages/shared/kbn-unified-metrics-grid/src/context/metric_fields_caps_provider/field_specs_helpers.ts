/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { FieldSpec as MetricFieldSpecs, Dimension } from '../../types';
import {
  isMetricField,
  hasValue,
  buildFieldSpecId,
  type FieldSpecId,
} from '../../common/utils/fields';
import type { FieldCapsResponseMap } from './metric_fields_caps_provider';

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
const buildDimensions = (
  indexFieldCaps: Record<string, Record<string, FieldCapsFieldCapability>>
): Dimension[] => {
  const dimensions: Dimension[] = [];

  for (const fieldName in indexFieldCaps) {
    if (shouldSkipField(fieldName)) {
      continue;
    }

    const capabilities = indexFieldCaps[fieldName];
    for (const type in capabilities) {
      if (!Object.hasOwn(capabilities, type)) {
        continue;
      }

      if (capabilities[type].time_series_dimension) {
        dimensions.push({ name: fieldName, type: type as ES_FIELD_TYPES });
        break;
      }
    }
  }

  return dimensions.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Creates metric field specs from field caps.
 */
export const createFieldSpecs = (
  fieldCaps: FieldCapsResponseMap | undefined
): MetricFieldSpecs[] => {
  if (!fieldCaps) {
    return [];
  }

  const fieldSpecs: MetricFieldSpecs[] = [];

  for (const indexName in fieldCaps) {
    if (!Object.hasOwn(fieldCaps, indexName)) {
      continue;
    }

    const indexFieldCaps = fieldCaps[indexName];
    if (!indexFieldCaps) {
      continue;
    }

    const dimensions = buildDimensions(indexFieldCaps);

    for (const fieldName in indexFieldCaps) {
      if (shouldSkipField(fieldName)) {
        continue;
      }

      const capabilities = indexFieldCaps[fieldName];
      for (const type in capabilities) {
        if (!Object.hasOwn(capabilities, type)) {
          continue;
        }

        const typeInfo = capabilities[type];
        if (isMetricField(type, typeInfo)) {
          fieldSpecs.push({
            key: buildFieldSpecId(indexName, fieldName),
            index: indexName,
            fieldName,
            fieldType: type,
            typeInfo,
            dimensions,
          });
        }
      }
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
        break;
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
