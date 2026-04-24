/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/chart-expressions-common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';

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

const MAX_UNWRAP_DEPTH = 3;

/**
 * Reads the original `decimals` value that Lens writes onto the format params
 * (via `lens_format_column`), unwrapping decorator formats such as `suffix`
 * that nest the inner numeric format under `params.params`.
 */
export const getDecimalsFromFormatParams = (
  params: FieldFormatParams,
  depth = 0
): number | undefined => {
  if (!params || depth > MAX_UNWRAP_DEPTH) {
    return undefined;
  }

  if (typeof params.decimals === 'number') {
    return params.decimals;
  }

  const nestedParams = params.params;
  if (nestedParams && typeof nestedParams === 'object' && !Array.isArray(nestedParams)) {
    return getDecimalsFromFormatParams(nestedParams, depth + 1);
  }

  return undefined;
};
