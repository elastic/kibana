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
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { Dimension, MetricField } from '../../../../../types';
import { categorizeFields, createSampleRowByField } from './helpers/fields_parser';
import { extractWhereCommand } from '../../../../../utils/extract_where_command';

export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

export interface MetricsExperienceFieldsContextValue {
  metricFields: MetricField[];
  dimensions: Dimension[];
  whereStatements: string[];
  getSampleRow: (metricName: string) => DatatableRow | undefined;
}

const EMPTY_CONTEXT: MetricsExperienceFieldsContextValue = {
  metricFields: [],
  dimensions: [],
  getSampleRow: () => undefined,
  whereStatements: [],
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
  const { table, dataView, query } = fetchParams;
  const esqlQuery = useMemo(
    () => (query && isOfAggregateQueryType(query) ? query.esql : undefined),
    [query]
  );
  const whereStatements = useMemo(() => extractWhereCommand(esqlQuery), [esqlQuery]);

  const { metricFields, dimensions } = useMemo(() => {
    if (!dataView) {
      return { metricFields: [], dimensions: [] };
    }

    return categorizeFields({
      index: dataView.getIndexPattern(),
      dataViewFieldMap: dataView.fields.toSpec(),
      columns: table?.columns,
    });
  }, [dataView, table?.columns]);

  const rows = useMemo(() => table?.rows ?? [], [table?.rows]);
  const metricFieldNames = useMemo(() => metricFields.map((f) => f.name), [metricFields]);
  const sampleRowIndex = useMemo(
    () =>
      createSampleRowByField({
        rows,
        fieldNames: metricFieldNames,
      }),
    [rows, metricFieldNames]
  );

  const getSampleRow = useCallback(
    (metricName: string): DatatableRow | undefined => {
      const index = sampleRowIndex.get(metricName);
      return index !== undefined ? rows[index] : undefined;
    },
    [sampleRowIndex, rows]
  );

  const value = useMemo<MetricsExperienceFieldsContextValue>(
    () => ({
      metricFields,
      dimensions,
      getSampleRow,
      whereStatements,
    }),
    [metricFields, dimensions, getSampleRow, whereStatements]
  );

  return (
    <MetricsExperienceFieldsContext.Provider value={value}>
      {children}
    </MetricsExperienceFieldsContext.Provider>
  );
};
