/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { CountIndexPatternColumn } from '../../datasources/operations';
import type { GetSerializedFormatFn, ToEsqlFn } from './types';

export const getCountSerializedFormat: GetSerializedFormatFn<CountIndexPatternColumn> = (
  column,
  _targetColumn,
  indexPattern
) => {
  const field = indexPattern?.getFieldByName(column.sourceField);
  return field?.format ?? { id: 'number' };
};

export const countToESQL: ToEsqlFn<CountIndexPatternColumn> = (column, _columnId, indexPattern) => {
  if (column.params?.emptyAsNull === false || column.timeShift) return;

  const field = indexPattern.getFieldByName(column.sourceField);
  if (!field || field?.type === 'document') {
    return { template: 'COUNT(*)' };
  }
  return {
    template: `COUNT(${esql.col(field.name)})`,
  };
};
