/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import { getFormatByAccessor, getColumnByAccessor } from '@kbn/chart-expressions-common';

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
