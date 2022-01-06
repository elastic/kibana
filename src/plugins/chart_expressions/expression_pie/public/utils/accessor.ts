/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';

export const getColumnByAccessor = (
  accessor: ExpressionValueVisDimension['accessor'],
  columns: Datatable['columns'] = []
) => {
  if (typeof accessor === 'number') {
    return columns[accessor];
  }
  return columns.filter(({ id }) => accessor.id === id)[0];
};
