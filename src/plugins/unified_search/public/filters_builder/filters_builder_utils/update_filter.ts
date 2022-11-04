/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { identity, pickBy } from 'lodash';
import type { Operator } from '../../filter_bar/filter_editor';

/** @todo: refactor and move into es-query
 *  @internal **/
export const updateFilter = (
  filter: Filter,
  field?: DataViewField,
  operator?: Operator,
  params?: Filter['meta']['params']
) => {
  if (field && operator && params !== undefined) {
    if (operator.type === 'range') {
      return updateWithRangeOperator(filter, operator, params, field);
    } else if (Array.isArray(params)) {
      return updateWithIsOneOfOperator(filter, operator, params);
    } else {
      filter = updateWithIsOperator(filter, operator, params);
    }
  } else if (field && operator) {
    if (operator.type === 'exists') {
      return updateWithExistsOperator(filter, operator);
    } else {
      return updateOperator(filter, operator);
    }
  } else {
    return updateField(filter, field);
  }
  return filter;
};
function updateField(filter: Filter, field?: DataViewField) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      key: field?.name,
      params: { query: undefined },
      value: undefined,
      type: undefined,
    },
    query: undefined,
  };
}

function updateOperator(filter: Filter, operator?: Operator) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: { ...filter.meta.params, query: undefined },
      value: undefined,
    },
    query: { match_phrase: { field: filter.meta.key } },
  };
}

function updateWithExistsOperator(filter: Filter, operator?: Operator) {
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
  operator?: Operator,
  params?: Filter['meta']['params']
) {
  return {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params: { ...filter.meta.params, query: params },
    },
    query: { match_phrase: { ...filter!.query?.match_phrase, [filter.meta.key!]: params } },
  };
}

function updateWithRangeOperator(
  filter: Filter,
  operator: Operator,
  rawParams: Array<Filter['meta']['params']>,
  field: DataViewField
) {
  const params = {
    ...filter.meta.params,
    ...pickBy(rawParams, identity),
  };

  params.gte = params.from;
  params.lt = params.to;

  const updatedFilter = {
    ...filter,
    meta: {
      ...filter.meta,
      negate: operator?.negate,
      type: operator?.type,
      params,
    },
    query: {
      [field.name]: params,
    },
  };

  return updatedFilter;
}

function updateWithIsOneOfOperator(
  filter: Filter,
  operator?: Operator,
  params?: Array<Filter['meta']['params']>
) {
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
        should: params?.map((param) => {
          return { match_phrase: { [filter.meta.key!]: param } };
        }),
      },
    },
  };
}
