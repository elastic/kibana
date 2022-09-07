/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { IAggConfig } from '@kbn/data-plugin/common';
import { DataType } from '../../types';
import { SchemaConfig, SupportedAggregation } from '../../../types';
import { AggId, ExtraColumnFields, GeneralColumnWithMeta } from './types';
import { getLabel } from '../utils';

export const createAggregationId = (agg: SchemaConfig): AggId => `${agg.aggType}.${agg.aggId}`;

export const createColumn = <T extends SupportedAggregation>(
  agg: SchemaConfig<T>,
  field?: DataViewField,
  { isBucketed = false, isSplit = false, reducedTimeRange }: ExtraColumnFields = {}
): GeneralColumnWithMeta => {
  const aggId = createAggregationId(agg);
  return {
    columnId: uuid(),
    dataType: (field?.type as DataType) ?? undefined,
    label: getLabel(agg),
    isBucketed,
    isSplit,
    reducedTimeRange,
    // timeShift, //TODO: do it later
    meta: { aggId },
  };
};

export const createAggregationIdFromCustomAgg = (agg: IAggConfig): AggId =>
  `${agg.type.dslName}.${0}`;

export const createColumnFromCustomAgg = (
  agg: IAggConfig,
  field?: DataViewField,
  { isBucketed = false, isSplit = false, reducedTimeRange }: ExtraColumnFields = {}
): GeneralColumnWithMeta => {
  const aggId = createAggregationIdFromCustomAgg(agg);
  return {
    columnId: uuid(),
    dataType: (field?.type as DataType) ?? undefined,
    label: agg.getFieldDisplayName(),
    isBucketed,
    isSplit,
    reducedTimeRange,
    // timeShift, //TODO: do it later
    meta: { aggId },
  };
};
