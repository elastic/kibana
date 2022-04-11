/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { Filter, FieldFilter } from '@kbn/es-query';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import isSemverValid from 'semver/functions/valid';
import { FILTER_OPERATORS, Operator } from './filter_operators';
import { isFilterable, IIndexPattern, IFieldType, IpAddress } from '../../../../../data/common';

export function getFieldFromFilter(filter: FieldFilter, indexPattern: IIndexPattern) {
  return indexPattern.fields.find((field) => field.name === filter.meta.key);
}

export function getOperatorFromFilter(filter: Filter) {
  return FILTER_OPERATORS.find((operator) => {
    return filter.meta.type === operator.type && filter.meta.negate === operator.negate;
  });
}

export function getFilterableFields(indexPattern: IIndexPattern) {
  return indexPattern.fields.filter(isFilterable);
}

export function getOperatorOptions(field: IFieldType) {
  return FILTER_OPERATORS.filter((operator) => {
    if (operator.field) return operator.field(field);
    if (operator.fieldTypes) return operator.fieldTypes.includes(field.type);
    return true;
  });
}

export function validateParams(params: any, field: IFieldType) {
  switch (field.type) {
    case 'date':
      const moment = typeof params === 'string' ? dateMath.parse(params) : null;
      return Boolean(typeof params === 'string' && moment && moment.isValid());
    case 'ip':
      try {
        return Boolean(new IpAddress(params));
      } catch (e) {
        return false;
      }
    case 'string':
      if (field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) {
        return isSemverValid(params);
      }
      return true;
    default:
      return true;
  }
}

export function isFilterValid(
  indexPattern?: IIndexPattern,
  field?: IFieldType,
  operator?: Operator,
  params?: any
) {
  if (!indexPattern || !field || !operator) {
    return false;
  }
  switch (operator.type) {
    case 'phrase':
      return validateParams(params, field);
    case 'phrases':
      if (!Array.isArray(params) || !params.length) {
        return false;
      }
      return params.every((phrase) => validateParams(phrase, field));
    case 'range':
      if (typeof params !== 'object') {
        return false;
      }
      return (
        (!params.from || validateParams(params.from, field)) &&
        (!params.to || validateParams(params.to, field))
      );
    case 'exists':
      return true;
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}
