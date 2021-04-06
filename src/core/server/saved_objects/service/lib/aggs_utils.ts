/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexMapping } from '../../mappings';
import { SavedObjectsErrorHelpers } from './errors';
import { hasFilterKeyError } from './filter_utils';
import { savedObjectsAggs, validateSavedObjectsTypeAggs } from './aggregations';

export const validateGetSavedObjectsAggs = (
  allowedTypes: string[],
  aggs: Record<string, unknown>,
  indexMapping: IndexMapping
) => {
  return validateGetAggFieldValue(allowedTypes, aggs, indexMapping);
};

const validateGetAggFieldValue = (
  allowedTypes: string[],
  aggs: any,
  indexMapping: IndexMapping,
  lastKey?: string,
  aggType?: string
): unknown => {
  return Object.keys(aggs).reduce((acc, key) => {
    if (key === 'script') {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'script attribute is not supported in saved objects aggregation'
      );
    }
    if (typeof aggs[key] === 'object' && aggType === undefined && savedObjectsAggs[key]) {
      return {
        ...acc,
        [key]: validateGetAggFieldValue(allowedTypes, aggs[key], indexMapping, key, key),
      };
    } else if (
      typeof aggs[key] === 'object' &&
      (['aggs', 'aggregations'].includes(key) || aggType === undefined)
    ) {
      return {
        ...acc,
        [key]: validateGetAggFieldValue(allowedTypes, aggs[key], indexMapping, key, undefined),
      };
    } else if (
      key !== 'field' &&
      aggType &&
      savedObjectsAggs[aggType] !== undefined &&
      savedObjectsAggs[aggType][key] !== undefined
    ) {
      validateSavedObjectsTypeAggs(savedObjectsAggs[aggType][key], aggs[key]);
      return {
        ...acc,
        [key]: aggs[key],
      };
    } else {
      if (aggType === undefined || savedObjectsAggs[aggType] === undefined) {
        throw SavedObjectsErrorHelpers.createBadRequestError(
          `This aggregation ${lastKey} is not valid or we did not defined it yet`
        );
      }
      const error = hasFilterKeyError(
        key === 'field' ? aggs[key] : key,
        allowedTypes,
        indexMapping
      );
      if (error != null) {
        if (
          aggType !== undefined &&
          savedObjectsAggs[aggType] !== undefined &&
          savedObjectsAggs[aggType][key] === undefined
        ) {
          throw SavedObjectsErrorHelpers.createBadRequestError(
            `${key} attribute is not supported in ${aggType} saved objects aggregation`
          );
        }
        throw SavedObjectsErrorHelpers.createBadRequestError(error);
      }
      return {
        ...acc,
        ...(key === 'field'
          ? { [key]: aggs[key].replace('.attributes', '') }
          : { [key.replace('.attributes', '')]: aggs[key] }),
      };
    }
  }, {});
};
