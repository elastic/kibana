/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useMemo, type PropsWithChildren } from 'react';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { Dimension, MetricField } from '../../types';
import {
  createFieldSpecs,
  createSampleRowByMetric,
  createValuesByDimensions,
} from './field_specs_helpers';

export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

export interface MetricsExperienceFieldsCapsContextValue {
  metricFields: MetricField[];
  dimensions: Dimension[];
  /** Map of metric key (index>fieldName) → first row (sample for metadata) */
  sampleRowByMetric: Map<string, DatatableRow>;
  /** Returns map of dimension key (index>dimensionName) → rows. Computed on demand. */
  getValuesByDimension: (requiredFields: string[]) => Map<string, Map<string, Set<string>>>;
}

const EMPTY_CONTEXT: MetricsExperienceFieldsCapsContextValue = {
  metricFields: [],
  dimensions: [],
  sampleRowByMetric: new Map(),
  getValuesByDimension: (_: string[]) => new Map(),
};

export const MetricsExperienceFieldsCapsContext =
  createContext<MetricsExperienceFieldsCapsContextValue>(EMPTY_CONTEXT);

export interface MetricsExperienceFieldsCapsProviderProps {
  fetchParams: ChartSectionProps['fetchParams'];
}

export const MetricsExperienceFieldsCapsProvider = ({
  fetchParams,
  children,
}: PropsWithChildren<MetricsExperienceFieldsCapsProviderProps>) => {
  const { table, dataView } = fetchParams;

  const { metricFields, dimensions } = useMemo(
    () =>
      dataView != null
        ? createFieldSpecs({
            index: dataView.getIndexPattern(),
            dataViewFieldMap: dataView.fields.toSpec(),
            columns: table?.columns,
          })
        : { metricFields: [], dimensions: [] },
    [dataView, table?.columns]
  );

  const { sampleRowByMetric, fieldSpecsByRow } = useMemo(
    () =>
      createSampleRowByMetric({
        rows: table?.rows ?? [],
        fieldSpecs: metricFields,
      }),
    [table?.rows, metricFields]
  );

  const getValuesByDimension = useCallback(
    (fieldNames: string[]) =>
      createValuesByDimensions({
        rows: table?.rows ?? [],
        specByRow: fieldSpecsByRow,
        requiredFields: fieldNames,
        dimensions,
      }),
    [table?.rows, fieldSpecsByRow, dimensions]
  );

  const value = useMemo<MetricsExperienceFieldsCapsContextValue>(
    () => ({
      metricFields,
      dimensions,
      sampleRowByMetric,
      getValuesByDimension,
    }),
    [metricFields, dimensions, sampleRowByMetric, getValuesByDimension]
  );

  return (
    <MetricsExperienceFieldsCapsContext.Provider value={value}>
      {children}
    </MetricsExperienceFieldsCapsContext.Provider>
  );
};
