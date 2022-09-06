/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { SchemaConfig } from '../../types';
import { Column } from '../types';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export const getLabel = (agg: SchemaConfig) => {
  return agg.aggParams && 'customLabel' in agg.aggParams
    ? agg.aggParams.customLabel ?? agg.label
    : agg.label;
};

export const getValidColumns = (columns: Array<Column | null> | Column | null | undefined) => {
  if (columns && Array.isArray(columns)) {
    const nonNullColumns = columns.filter(
      (c): c is Exclude<UnwrapArray<typeof columns>, null> => c !== null
    );

    if (nonNullColumns.length !== columns.length) {
      return null;
    }

    return nonNullColumns;
  }

  return columns ? [columns] : null;
};

export const getFieldNameFromField = (field: DataViewField | string | undefined) => {
  if (!field) {
    return null;
  }

  if (typeof field === 'string') {
    return field;
  }

  return field.displayName;
};
