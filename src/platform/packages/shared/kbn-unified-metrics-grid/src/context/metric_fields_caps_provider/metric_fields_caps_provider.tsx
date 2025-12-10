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
import type { FieldSpec as MetricFieldSpecs } from '../../types';
import type { FieldSpecId } from '../../common/utils/fields';
import {
  createFieldSpecs,
  createSampleRowByMetric,
  createValuesByDimensions,
} from './field_specs_helpers';

export type FieldCapsResponseMap = Record<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

export interface MetricFieldsCapsContextValue {
  fieldSpecs: MetricFieldSpecs[];
  /** Map of metric key (index>fieldName) → first row (sample for metadata) */
  sampleRowByMetric: Map<FieldSpecId, DatatableRow>;
  /** Returns map of dimension key (index>dimensionName) → rows. Computed on demand. */
  getValuesByDimension: (
    requiredFieldIds: FieldSpecId[]
  ) => Map<string, Map<string, Set<FieldSpecId>>>;
}

const EMPTY_CONTEXT: MetricFieldsCapsContextValue = {
  fieldSpecs: [],
  sampleRowByMetric: new Map(),
  getValuesByDimension: (_: FieldSpecId[]) => new Map(),
};

export const MetricFieldsCapsContext = createContext<MetricFieldsCapsContextValue>(EMPTY_CONTEXT);

export interface MetricFieldsCapsProviderProps {
  fetchParams: ChartSectionProps['fetchParams'];
}

export const MetricFieldsCapsProvider = ({
  fetchParams,
  children,
}: PropsWithChildren<MetricFieldsCapsProviderProps>) => {
  const { table, dataView } = fetchParams;

  const fieldSpecs = useMemo(
    () =>
      dataView != null
        ? createFieldSpecs(dataView.getIndexPattern(), dataView.fields.toSpec())
        : [],
    [dataView]
  );

  const { sampleRowByMetric, fieldSpecsByRow } = useMemo(
    () => createSampleRowByMetric(table?.rows, fieldSpecs),
    [table?.rows, fieldSpecs]
  );

  const getValuesByDimension = useCallback(
    (specsKeys: FieldSpecId[]) => createValuesByDimensions(table?.rows, fieldSpecsByRow, specsKeys),
    [table?.rows, fieldSpecsByRow]
  );

  const value = useMemo<MetricFieldsCapsContextValue>(
    () => ({
      fieldSpecs,
      sampleRowByMetric,
      getValuesByDimension,
    }),
    [fieldSpecs, sampleRowByMetric, getValuesByDimension]
  );

  return (
    <MetricFieldsCapsContext.Provider value={value}>{children}</MetricFieldsCapsContext.Provider>
  );
};
