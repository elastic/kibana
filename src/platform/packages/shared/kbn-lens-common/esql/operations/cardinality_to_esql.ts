/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { CardinalityIndexPatternColumn } from '../../datasources/operations';
import type { GetSerializedFormatFn, ToEsqlFn } from './types';

export const getCardinalitySerializedFormat: GetSerializedFormatFn<
  CardinalityIndexPatternColumn
> = () => {
  return {
    id: 'number',
  };
};

export const cardinalityToESQL: ToEsqlFn<CardinalityIndexPatternColumn> = (column) => {
  if (column.params?.emptyAsNull || column.timeShift) return;
  return {
    template: `COUNT_DISTINCT(${esql.col(column.sourceField)})`,
  };
};
