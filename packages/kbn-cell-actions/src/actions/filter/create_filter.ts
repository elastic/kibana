/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Filter } from '@kbn/es-query';

export const isEmptyFilterValue = (value: string[] | string | null | undefined) =>
  value == null || value.length === 0;

export const createFilter = ({
  key,
  value,
  negate,
}: {
  key: string;
  value: string[] | string | null | undefined;
  negate: boolean;
}): Filter => {
  const queryValue = !isEmptyFilterValue(value) ? (Array.isArray(value) ? value[0] : value) : null;
  const meta = { alias: null, disabled: false, key, negate };

  if (queryValue == null) {
    return {
      query: {
        exists: {
          field: key,
        },
      },
      meta: {
        ...meta,
        type: 'exists',
        value: 'exists',
      },
    };
  }
  return {
    meta: {
      ...meta,
      type: 'phrase',
      value: queryValue,
      params: {
        query: queryValue,
      },
    },
    query: {
      match: {
        [key]: {
          query: queryValue,
          type: 'phrase',
        },
      },
    },
  };
};
