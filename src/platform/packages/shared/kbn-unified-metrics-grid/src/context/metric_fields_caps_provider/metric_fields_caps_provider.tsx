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
  getRowsByDimension: (specsKeys: SpecsKey[]) => Map<string, Map<string, Set<SpecsKey>>>;
  isFetching: boolean;
  isError: boolean;
}

const EMPTY_CONTEXT: MetricFieldsCapsContextValue = {
  fieldSpecs: [],
  sampleRowByMetric: new Map(),
  getRowsByDimension: (specsKeys: SpecsKey[]) => new Map(),
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

  const sampleRowByMetric = useMemo(
    () => createSampleRowByMetric(table?.rows, fieldSpecs),
    [table?.rows, fieldSpecs]
  );

  const getRowsByDimension = useCallback(
    (specsKeys: SpecsKey[]) => createRowsByDimension(table?.rows, fieldSpecs, specsKeys),
    [table?.rows, fieldSpecs]
  );

  const value = useMemo<MetricFieldsCapsContextValue>(
    () => ({ fieldSpecs, sampleRowByMetric, getRowsByDimension, isFetching, isError }),
    [fieldSpecs, sampleRowByMetric, getRowsByDimension, isFetching, isError]
  );

  return (
    <MetricFieldsCapsContext.Provider value={value}>{children}</MetricFieldsCapsContext.Provider>
  );
};

/**
 * Builds sorted dimensions for an index.
 */
const buildDimensions = (
  indexFieldCaps: Record<string, Record<string, FieldCapsFieldCapability>>
): Dimension[] => {
  const dimensions: Dimension[] = [];

  for (const [fieldName, fieldTypes] of Object.entries(indexFieldCaps)) {
    const dimensionEntry = Object.entries(fieldTypes).find(
      ([, typeInfo]) => typeInfo.time_series_dimension
    );

    if (dimensionEntry) {
      dimensions.push({
        name: fieldName,
        type: dimensionEntry[0] as ES_FIELD_TYPES,
      });
    }
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

    for (const [fieldName, fieldTypes] of Object.entries(indexFieldCaps)) {
      const metricEntry = Object.entries(fieldTypes).find(([typeName, typeInfo]) =>
        isMetricField(typeName, typeInfo)
      );

      if (!metricEntry) continue;

      const [fieldType, typeInfo] = metricEntry;
      fieldSpecs.push({
        key: buildFieldSpecsKey(indexName, fieldName),
        index: indexName,
        fieldName,
        fieldType,
        typeInfo,
        dimensions,
      });
    }
  }

  return fieldSpecs;
};

/**
 * Creates a map of metric key → first row (sample for metadata).
 */
const createSampleRowByMetric = (
  rows: DatatableRow[] | undefined,
  fieldSpecs: MetricFieldSpecs[]
): Map<SpecsKey, DatatableRow> => {
  const result = new Map<SpecsKey, DatatableRow>();

  if (!rows?.length || fieldSpecs.length === 0) {
    return result;
  }

  const pending = new Set(fieldSpecs.map((s) => s.key));

  for (const row of rows) {
    if (pending.size === 0) break;

    for (const spec of fieldSpecs) {
      if (!pending.has(spec.key) || !hasValue(row[spec.fieldName])) {
        continue;
      }

      result.set(spec.key, row);
      pending.delete(spec.key);
    }
  }

  return result;
};

/**
 * Creates a map of dimension key → rows that have data for that dimension.
 */
const createRowsByDimension = (
  rows: DatatableRow[] | undefined,
  fieldSpecs: MetricFieldSpecs[],
  specsKeys: SpecsKey[]
): Map<string, Map<string, Set<SpecsKey>>> => {
  const result = new Map<string, Map<string, Set<SpecsKey>>>();

  if (!rows?.length || fieldSpecs.length === 0) {
    return result;
  }

  for (const row of rows) {
    for (const spec of fieldSpecs) {
      if (!hasValue(row[spec.fieldName])) {
        continue;
      }

      const dimensions = spec.dimensions.filter(
        (dim) =>
          hasValue(row[dim.name]) && specsKeys.includes(buildFieldSpecsKey(spec.index, dim.name))
      );

      for (const dim of dimensions) {
        const existing = result.get(dim.name);

        const value = String(row[dim.name]);

        if (!existing) {
          result.set(dim.name, new Map([[value, new Set([spec.key])]]));
        } else {
          const existingValue = existing.get(value);
          if (!existingValue) {
            existing.set(value, new Set([spec.key]));
          } else {
            existingValue.add(spec.key);
          }
        }
      }
    }
  }

  return result;
};
