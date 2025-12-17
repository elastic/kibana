/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useMemo, type PropsWithChildren } from 'react';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { Dimension, MetricField } from '../../types';
import { extractFields, createSampleRowByMetric } from './helpers/fields_parser';

export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

export interface MetricsExperienceFieldsContextValue {
  metricFields: MetricField[];
  dimensions: Dimension[];
  sampleRowByMetric: Map<string, DatatableRow>;
}

const EMPTY_CONTEXT: MetricsExperienceFieldsContextValue = {
  metricFields: [],
  dimensions: [],
  sampleRowByMetric: new Map(),
};

export const MetricsExperienceFieldsContext =
  createContext<MetricsExperienceFieldsContextValue>(EMPTY_CONTEXT);

export interface MetricsExperienceFieldsProviderProps {
  fetchParams: ChartSectionProps['fetchParams'];
}

export const MetricsExperienceFieldsProvider = ({
  fetchParams,
  children,
}: PropsWithChildren<MetricsExperienceFieldsProviderProps>) => {
  const { table, dataView } = fetchParams;

  const { metricFields, dimensions } = useMemo(
    () =>
      dataView != null
        ? extractFields({
            index: dataView.getIndexPattern(),
            dataViewFieldMap: dataView.fields.toSpec(),
            columns: table?.columns,
          })
        : { metricFields: [], dimensions: [] },
    [dataView, table?.columns]
  );

  const { sampleRowByMetric } = useMemo(
    () =>
      createSampleRowByMetric({
        rows: table?.rows ?? [],
        fieldSpecs: metricFields,
      }),
    [table?.rows, metricFields]
  );

  const value = useMemo<MetricsExperienceFieldsContextValue>(
    () => ({
      metricFields,
      dimensions,
      sampleRowByMetric,
    }),
    [metricFields, dimensions, sampleRowByMetric]
  );

  return (
    <MetricsExperienceFieldsContext.Provider value={value}>
      {children}
    </MetricsExperienceFieldsContext.Provider>
  );
};
