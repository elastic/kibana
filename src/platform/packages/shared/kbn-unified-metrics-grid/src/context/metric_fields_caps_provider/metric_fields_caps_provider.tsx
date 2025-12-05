/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useMemo, type PropsWithChildren } from 'react';
import { useQuery } from '@kbn/react-query';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useMetricsExperienceClient } from '../metrics_experience_client_provider';
import type { FieldSpec as MetricFieldSpecs, Dimension } from '../../types';
import {
  isMetricField,
  hasValue,
  buildFieldSpecsKey,
  type SpecsKey,
} from '../../common/utils/fields';

export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

export interface MetricFieldsCapsContextValue {
  fieldSpecs: MetricFieldSpecs[];
  /** Map of metric key (index>fieldName) → first row (sample for metadata) */
  sampleRowByMetric: Map<SpecsKey, DatatableRow>;
  /** Returns map of dimension key (index>dimensionName) → rows. Computed on demand. */
  getValuesByDimension: (requiredFields: SpecsKey[]) => Map<string, Map<string, Set<SpecsKey>>>;
  isFetching: boolean;
  isError: boolean;
}

const EMPTY_CONTEXT: MetricFieldsCapsContextValue = {
  fieldSpecs: [],
  sampleRowByMetric: new Map(),
  getValuesByDimension: (_requiredFields: SpecsKey[]) => new Map(),
  isFetching: false,
  isError: false,
};

export const MetricFieldsCapsContext = createContext<MetricFieldsCapsContextValue>(EMPTY_CONTEXT);

export interface MetricFieldsCapsProviderProps {
  fetchParams: ChartSectionProps['fetchParams'];
}

export const MetricFieldsCapsProvider = ({
  fetchParams,
  children,
}: PropsWithChildren<MetricFieldsCapsProviderProps>) => {
  const { table, timeRange, dataView } = fetchParams;
  const { client } = useMetricsExperienceClient();

  const index = useMemo(() => dataView?.getIndexPattern() ?? 'metrics-*', [dataView]);

  const canFetch = !!table?.rows?.length;

  const {
    data: fieldCaps,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['metricFieldsCaps', index, timeRange?.from, timeRange?.to],
    queryFn: async ({ signal }) => {
      return client.getFieldCaps(
        {
          index,
          from: timeRange?.from,
          to: timeRange?.to,
        },
        signal
      );
    },
    enabled: canFetch,
    staleTime: 10 * 60 * 1000,
  });

  const fieldSpecs = useMemo(() => createFieldSpecs(fieldCaps), [fieldCaps]);

  // Precompute row → spec mapping once (O(rows))
  const { sampleRowByMetric, specByRow } = useMemo(
    () => createRowMappings(table?.rows, fieldSpecs),
    [table?.rows, fieldSpecs]
  );

  const getValuesByDimension = useCallback(
    (specsKeys: SpecsKey[]) => createValuesByDimesions(table?.rows, specByRow, specsKeys),
    [table?.rows, specByRow]
  );

  const value = useMemo<MetricFieldsCapsContextValue>(
    () => ({
      fieldSpecs,
      sampleRowByMetric,
      getValuesByDimension,
      isFetching,
      isError,
    }),
    [fieldSpecs, sampleRowByMetric, getValuesByDimension, isFetching, isError]
  );

  return (
    <MetricFieldsCapsContext.Provider value={value}>{children}</MetricFieldsCapsContext.Provider>
  );
};

const INVALID_FIELD_NAME = '_metric_names_hash';
const FILTER_OUT_EXACT_FIELDS_FOR_CONTENT = [
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
];

function* batchGenerator<T>(gen: Generator<T>, batchSize: number): Generator<T[]> {
  let batch: T[] = [];

  for (const item of gen) {
    batch.push(item);
    if (batch.length === batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

function* timeseriesFieldCapsGenerator(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  for (const fieldName in fields) {
    if (FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(fieldName)) continue;

    const capabilities = fields[fieldName];
    for (const type in capabilities) {
      if (!(type in capabilities)) continue;

      const typeInfo = capabilities[type];

      if (isMetricField(type, typeInfo)) {
        yield { fieldName, type, typeInfo };
      }
    }
  }
}

export const getTimeSeriesFieldCapsGenerator = (
  fields: Record<string, Record<string, FieldCapsFieldCapability>>,
  { batchSize }: { batchSize: number } = { batchSize: 100 }
) => batchGenerator(timeseriesFieldCapsGenerator(fields), batchSize);

function* dimensionFieldCapsGenerator(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  for (const fieldName in fields) {
    if (fieldName === INVALID_FIELD_NAME) continue;
    if (FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(fieldName)) continue;

    const capabilities = fields[fieldName];
    for (const type in capabilities) {
      if (!(type in capabilities)) continue;

      const typeInfo = capabilities[type];

      if (typeInfo.time_series_dimension) {
        yield { fieldName, type: type as ES_FIELD_TYPES, typeInfo };
      }
    }
  }
}

export const getDimensionFieldCapsGenerator = (
  fields: Record<string, Record<string, FieldCapsFieldCapability>>,
  { batchSize }: { batchSize: number } = { batchSize: 100 }
) => batchGenerator(dimensionFieldCapsGenerator(fields), batchSize);

/**
 * Builds sorted dimensions for an index using the dimension generator.
 */
const buildDimensions = (
  indexFieldCaps: Record<string, Record<string, FieldCapsFieldCapability>>
): Dimension[] => {
  const dimensions: Dimension[] = [];

  for (const batch of getDimensionFieldCapsGenerator(indexFieldCaps, { batchSize: 100 })) {
    dimensions.push(...batch.map(({ fieldName, type }) => ({ name: fieldName, type })));
  }

  return dimensions.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Creates metric field specs from field caps.
 */
const createFieldSpecs = (fieldCaps: FieldCapsResponseMap | undefined): MetricFieldSpecs[] => {
  if (!fieldCaps) {
    return [];
  }

  const fieldSpecs: MetricFieldSpecs[] = [];

  for (const [indexName, indexFieldCaps] of Object.entries(fieldCaps)) {
    if (!indexFieldCaps) continue;

    const dimensions = buildDimensions(indexFieldCaps);

    for (const batch of getTimeSeriesFieldCapsGenerator(indexFieldCaps, { batchSize: 500 })) {
      fieldSpecs.push(
        ...batch.map(({ fieldName, type, typeInfo }) => ({
          key: buildFieldSpecsKey(indexName, fieldName),
          index: indexName,
          fieldName,
          fieldType: type,
          typeInfo,
          dimensions,
        }))
      );
    }
  }

  return fieldSpecs;
};

interface RowMappings {
  sampleRowByMetric: Map<SpecsKey, DatatableRow>;
  specByRow: WeakMap<DatatableRow, MetricFieldSpecs>;
}

/**
 * Creates row mappings in a single pass:
 * - sampleRowByMetric: metric key → first row (sample for metadata)
 * - specByRow: row → spec (for O(1) lookup in dimension extraction)
 */
const createRowMappings = (
  rows: DatatableRow[] | undefined,
  fieldSpecs: MetricFieldSpecs[]
): RowMappings => {
  const sampleRowByMetric = new Map<SpecsKey, DatatableRow>();
  const specByRow = new WeakMap<DatatableRow, MetricFieldSpecs>();

  if (!rows?.length || fieldSpecs.length === 0) {
    return { sampleRowByMetric, specByRow };
  }

  const specByFieldName = new Map<string, MetricFieldSpecs>();
  for (const spec of fieldSpecs) {
    specByFieldName.set(spec.fieldName, spec);
  }

  const metricFieldNames = [...specByFieldName.keys()];
  const pendingSamples = new Set(fieldSpecs.map((s) => s.key));

  for (const row of rows) {
    // Find which spec this row belongs to
    for (const fieldName of metricFieldNames) {
      if (hasValue(row[fieldName])) {
        const spec = specByFieldName.get(fieldName)!;
        specByRow.set(row, spec);

        // Collect sample if not yet collected for this spec
        if (pendingSamples.has(spec.key)) {
          sampleRowByMetric.set(spec.key, row);
          pendingSamples.delete(spec.key);
        }
        break;
      }
    }
  }

  return { sampleRowByMetric, specByRow };
};

/**
 * Creates a map of dimension name → (value → Set<metricFieldKey>).
 * Uses precomputed specByRow for O(1) spec lookup per row.
 */
const createValuesByDimesions = (
  rows: DatatableRow[] | undefined,
  specByRow: WeakMap<DatatableRow, MetricFieldSpecs>,
  requiredFields: SpecsKey[]
): Map<string, Map<string, Set<SpecsKey>>> => {
  const result = new Map<string, Map<string, Set<SpecsKey>>>();

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
      const dimensionKey = buildFieldSpecsKey(spec.index, dim.name);
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
