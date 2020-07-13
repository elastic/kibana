/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dateMath from '@elastic/datemath';
import { FILTER_OPERATORS, Operator } from './filter_operators';
import {
  isFilterable,
  IIndexPattern,
  IFieldType,
  Ipv4Address,
  Filter,
  FieldFilter,
} from '../../../../../common';

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
        return Boolean(new Ipv4Address(params));
      } catch (e) {
        return false;
      }
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
      return validateParams(params, field.type);
    case 'phrases':
      if (!Array.isArray(params) || !params.length) {
        return false;
      }
      return params.every((phrase) => validateParams(phrase, field.type));
    case 'range':
      if (typeof params !== 'object') {
        return false;
      }
      return validateParams(params.from, field.type) || validateParams(params.to, field.type);
    case 'exists':
      return true;
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}
