/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { SchemaConfig } from '../../../types';
import { DataType, FormatParams } from '../../types';
import { getLabel } from '../utils';
import { AggId, ExtraColumnFields, GeneralColumnWithMeta } from './types';

export const createAggregationId = (agg: SchemaConfig): AggId => `${agg.aggId}`;

export const getFormat = (): FormatParams => {
  return {};
};

export const createColumn = (
  agg: SchemaConfig,
  field?: DataViewField,
  { isBucketed = false, isSplit = false, reducedTimeRange }: ExtraColumnFields = {}
): GeneralColumnWithMeta => ({
  columnId: uuidv4(),
  dataType: (field?.type as DataType) ?? 'number',
  label: getLabel(agg),
  isBucketed,
  isSplit,
  reducedTimeRange,
  timeShift: agg.aggParams?.timeShift,
  meta: { aggId: createAggregationId(agg) },
});
