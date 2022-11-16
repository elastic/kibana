/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FILTERS } from '@kbn/es-query';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { DataViewField } from '@kbn/data-views-plugin/common';

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;

  /**
   * KbnFieldTypes applicable for operator
   */
  fieldTypes?: string[];

  /**
   * A filter predicate for a field,
   * takes precedence over {@link fieldTypes}
   */
  field?: (field: DataViewField) => boolean;
}

export const isOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isOperatorOptionLabel', {
    defaultMessage: 'is',
  }),
  type: FILTERS.PHRASE,
  negate: false,
};

export const isNotOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isNotOperatorOptionLabel', {
    defaultMessage: 'is not',
  }),
  type: FILTERS.PHRASE,
  negate: true,
};

export const isOneOfOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isOneOfOperatorOptionLabel', {
    defaultMessage: 'is one of',
  }),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isNotOneOfOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
    defaultMessage: 'is not one of',
  }),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isBetweenOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isBetweenOperatorOptionLabel', {
    defaultMessage: 'is between',
  }),
  type: FILTERS.RANGE,
  negate: false,
  field: (field: DataViewField) => {
    if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type))
      return true;

    if (field.type === 'string' && field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) return true;

    return false;
  },
};

export const isNotBetweenOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
    defaultMessage: 'is not between',
  }),
  type: FILTERS.RANGE,
  negate: true,
  field: (field: DataViewField) => {
    if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type))
      return true;

    if (field.type === 'string' && field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) return true;

    return false;
  },
};

export const existsOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.existsOperatorOptionLabel', {
    defaultMessage: 'exists',
  }),
  type: FILTERS.EXISTS,
  negate: false,
};

export const doesNotExistOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.doesNotExistOperatorOptionLabel', {
    defaultMessage: 'does not exist',
  }),
  type: FILTERS.EXISTS,
  negate: true,
};

export const intersectsOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.intersectsOperatorOptionLabel', {
    defaultMessage: 'intersects',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
};
export const withinOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.withinOperatorOptionLabel', {
    defaultMessage: 'within',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
};
export const disjointOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.disjointOperatorOptionLabel', {
    defaultMessage: 'disjoint',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
};
export const containsOperator = {
  message: i18n.translate('unifiedSearch.filter.filterEditor.containsOperatorOptionLabel', {
    defaultMessage: 'contains',
  }),
  type: FILTERS.SPATIAL_FILTER,
  negate: false,
};
export const FILTER_OPERATORS: Operator[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isBetweenOperator,
  isNotBetweenOperator,
  existsOperator,
  doesNotExistOperator,
  intersectsOperator,
  withinOperator,
  disjointOperator,
  containsOperator
];

export const geoOperatorToOperation =  (operator:Operator)=>{
  if(operator === intersectsOperator){
    return 'intersects'
  }else if(operator === withinOperator){
    return 'within'
  }else if(operator === disjointOperator){
    return 'disjoint'
  }else if(operator === containsOperator){
    return 'contains'
  }
  throw Error("Unsupported Geo Operator")
}