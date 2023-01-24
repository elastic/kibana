/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { getFormatByAccessor, getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';

export const getFormat = (
  columns: DatatableColumn[],
  accessor: string | ExpressionValueVisDimension
) => {
  const type = getColumnByAccessor(accessor, columns)?.meta.type;
  return getFormatByAccessor(
    accessor,
    columns,
    type
      ? {
          id: type,
        }
      : undefined
  );
};
