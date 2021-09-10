/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import dateMath from '@elastic/datemath';
import { buildFilter, Filter, FieldFilter } from '@kbn/es-query';
import { FILTER_OPERATORS, Operator } from './filter_operators';
import { isFilterable, IIndexPattern, IFieldType, IpAddress } from '../../../../../common';

export function getFieldFromFilter(filter: FieldFilter, indexPattern: IIndexPattern) {
  return indexPattern.fields.find((field) => field.name === filter.meta.key);
}

export function getOperatorFromFilter(filter: Filter) {
  return FILTER_OPERATORS.find((operator) => {
    return filter.meta.type === operator.type && filter.meta.negate === operator.negate;
  });
}

export function getOperatorTypes() {
  const types = FILTER_OPERATORS.map((operator) => {
    return operator.type;
  });
  return _.uniq(types);
}

export function getFilterableFields(indexPattern: IIndexPattern) {
  return indexPattern.fields.filter(isFilterable);
}

export function getOperatorOptions(field: IFieldType) {
  return FILTER_OPERATORS.filter((operator) => {
    return !operator.fieldTypes || operator.fieldTypes.includes(field.type);
  });
}

export function validateParams(params: any, type: string) {
  switch (type) {
    case 'date':
      const moment = typeof params === 'string' ? dateMath.parse(params) : null;
      return Boolean(typeof params === 'string' && moment && moment.isValid());
    case 'ip':
      try {
        return Boolean(new IpAddress(params));
      } catch (e) {
        return false;
      }
    default:
      return true;
  }
}

export function isPhraseFilterValid(
  indexPattern?: IIndexPattern,
  field?: IFieldType,
  params?: any,
) {
  if (!indexPattern || !field) {
    return false;
  }
  return validateParams(params, field.type);
}

export function isPhrasesFilterValid(
  indexPattern?: IIndexPattern,
  field?: IFieldType,
  params?: any,
) {
  if (!indexPattern || !field) {
    return false;
  }
  if (!Array.isArray(params) || !params.length) {
    return false;
  }
  return params.every((phrase) => validateParams(phrase, field.type));
}

export function isRangeFilterValid(
  indexPattern?: IIndexPattern,
  field?: IFieldType,
  params?: any,
) {
  if (!indexPattern || !field) {
    return false;
  }
  if (typeof params !== 'object') {
    return false;
  }
  return (
    (!params.from || validateParams(params.from, field.type)) &&
    (!params.to || validateParams(params.to, field.type))
  );
}

export function isExistsFilterValid(
  indexPattern?: IIndexPattern,
  field?: IFieldType,
) {
  return indexPattern && field;
}

export function buildEsQueryFilter(
  indexPattern: IndexPatternBase,
  field: IndexPatternFieldBase,
  type: FILTERS,
  negate: boolean,
  disabled: boolean,
  params: Serializable,
  alias: string | null,
  store?: FilterStateStore
) {
  return indexPattern && field
    ? buildFilter(
      indexPattern,
      field,
      type,
      negate,
      disabled,
      params,
      alias,
      store
    )
    : undefined;
}