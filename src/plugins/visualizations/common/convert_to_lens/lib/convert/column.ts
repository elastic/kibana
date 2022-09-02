/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  BaseColumn,
  Operation,
  DataType,
  ColumnWithMeta as GenericColumnWithMeta,
} from '../../types';

interface Meta {
  metricId: string;
}

type GeneralColumn = Omit<BaseColumn<Operation, unknown>, 'operationType' | 'params'>;
type GeneralColumnWithMeta = GenericColumnWithMeta<GeneralColumn, Meta>;
interface ExtraColumnFields {
  isBucketed?: boolean;
  isSplit?: boolean;
  reducedTimeRange?: string;
}

export const createColumn = (
  metricId: string,
  field?: DataViewField,
  label?: string,
  timeShift?: string,
  { isBucketed = false, isSplit = false, reducedTimeRange }: ExtraColumnFields = {}
): GeneralColumnWithMeta => ({
  columnId: uuid(),
  dataType: (field?.type as DataType) ?? undefined,
  label,
  isBucketed,
  isSplit,
  reducedTimeRange,
  timeShift,
  meta: { metricId },
});
