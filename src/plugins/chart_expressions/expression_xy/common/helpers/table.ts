/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';

export function normalizeTable(data: Datatable, xAccessor?: string | ExpressionValueVisDimension) {
  const xColumn = xAccessor && getColumnByAccessor(xAccessor, data.columns);
  if (xColumn && xColumn?.meta.type === 'date') {
    const xColumnId = xColumn.id;
    if (
      !data.rows.some((row) => typeof row[xColumnId] === 'string' && row[xColumnId] !== '__other__')
    )
      return data;
    const rows = data.rows.map((row) => {
      return typeof row[xColumnId] !== 'string'
        ? row
        : {
            ...row,
            [xColumnId]: moment(row[xColumnId]).valueOf(),
          };
    });
    return { ...data, rows };
  }

  return data;
}
