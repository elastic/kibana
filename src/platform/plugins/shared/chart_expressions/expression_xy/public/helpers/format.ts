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
import type { FieldFormat, FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { isNumber, isUndefined } from 'lodash';

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

/**
 * Reads a single key from the field format's params, unwrapping decorator formats such as `suffix` by
 * walking nested `params.params` until the key is found or `maxDepth` is reached.
 */
export const getFormatParam = (format: FieldFormat, param: string, maxDepth = 3) => {
  const getNested = (params: FieldFormatParams, depth: number) => {
    if (depth > maxDepth) {
      return undefined;
    }

    if (!isUndefined(params[param])) {
      return params[param];
    }

    const nested = params?.params;

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return getNested(nested, depth + 1);
    }
  };

  return getNested(format.params(), 0);
};

export const getDecimalsFromFormat = (format: FieldFormat) => {
  const value = getFormatParam(format, 'decimals');
  return isNumber(value) ? value : undefined;
};
