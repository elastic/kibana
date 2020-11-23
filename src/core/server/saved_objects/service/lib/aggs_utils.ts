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

import { IndexMapping } from '../../mappings';

import { SavedObjectsErrorHelpers } from './errors';
import { hasFilterKeyError } from './filter_utils';
import { savedObjectsAggs, validateSavedObjectsTypeAggs } from './saved_objects_aggs_types';

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
