/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { isRangeFilterParams } from '../build_filters/range_filter';
import type { Filter, FilterMeta } from '..';

export const updateFilter = (
  filter: Filter,
  field?: string,
  operator?: FilterMeta,
  params?: Filter['meta']['params'],
  fieldType?: string
): Filter => {
  if (!field || !operator) {
    return updateField(filter, field);
  }

  if (operator.type === 'exists') {
    return updateWithExistsOperator(filter, operator);
  }
  if (operator.type === 'range') {
    return updateWithRangeOperator(filter, operator, params, field);
  }
  if (Array.isArray(params)) {
    return updateWithIsOneOfOperator(filter, operator, params);
  }

  return updateWithIsOperator(filter, operator, params, fieldType);
};

function updateField(filter: Filter, field?: string): Filter {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      key: field,
      // @todo: check why we need to pass "key" and "field" with the same data
      field,
      params: { query: undefined },
      value: undefined,
      type: undefined,
    },
    query: undefined,
  } as Filter; // need the casting because `field` shouldn't be there
}

function updateWithExistsOperator(filter: Filter, operator?: FilterMeta) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: undefined,
      value: 'exists',
    },
    query: { exists: { field: filter.meta.key } },
  };
}

function updateWithIsOperator(
  filter: Filter,
  operator?: FilterMeta,
  params?: Filter['meta']['params'],
  fieldType?: string
) {
  const safeParams = fieldType === 'number' && !params ? 0 : params;
  if (typeof filter.meta.params === 'object') {
    return {
      ...filter,
      meta: {
        ...filter.meta,
        negate: operator?.negate,
        type: operator?.type,
        params: { ...filter.meta.params, query: params },
        value: undefined,
      },
      query: { match_phrase: { [filter.meta.key!]: safeParams ?? '' } },
    };
  } else {
    return {
      ...filter,
      meta: {
        ...filter.meta,
        negate: operator?.negate,
        type: operator?.type,
        params: { query: params },
        value: undefined,
      },
      query: { match_phrase: { [filter.meta.key!]: safeParams ?? '' } },
    };
  }
}

function updateWithRangeOperator(
  filter: Filter,
  operator: FilterMeta,
  rawParams: Filter['meta']['params'] | undefined,
  field: string
): Filter {
  if (isRangeFilterParams(rawParams)) {
    const { from, to } = rawParams;
    const params = {
      gte: from,
      lt: to,
    };
    const updatedFilter = {
      ...filter,
      meta: {
        ...filter.meta,
        negate: operator?.negate,
        type: operator?.type,
        params,
      },
      query: {
        range: {
          [field]: params,
        },
      },
    };

    return updatedFilter;
  } else {
    const from = get(rawParams, 'from', undefined);
    const to = get(rawParams, 'to', undefined);
    const params = {
      gte: from,
      lt: to,
    };
    const updatedFilter = {
      ...filter,
      meta: {
        ...filter.meta,
        negate: operator?.negate,
        type: operator?.type,
        params,
      },
      query: {
        range: {
          [field]: params,
        },
      },
    };
    return updatedFilter as Filter; // need the casting because it doesn't like the types of `params.gte|lt`
  }
}

function updateWithIsOneOfOperator(
  filter: Filter,
  operator?: FilterMeta,
  params?: Filter['meta']['params']
) {
  if (Array.isArray(params)) {
    return {
      ...filter,
      meta: {
        ...filter.meta,
        negate: operator?.negate,
        type: operator?.type,
        params,
      },
      query: {
        bool: {
          minimum_should_match: 1,
          ...filter!.query?.should,
          should: params?.map((param) => ({ match_phrase: { [filter.meta.key!]: param } })),
        },
      },
    };
  } else {
    return filter;
  }
}
