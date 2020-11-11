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
import { SavedObjectsAggs, validateSavedObjectTypeAggs } from './saved_objects_aggs_types';

export const validateGetSavedObjectsAggs = (
  allowedTypes: string[],
  aggs: SavedObjectsAggs,
  indexMapping: IndexMapping
): SavedObjectsAggs => {
  validateSavedObjectTypeAggs(aggs);
  return validateGetAggFieldValue(allowedTypes, aggs, indexMapping);
};

const validateGetAggFieldValue = (
  allowedTypes: string[],
  aggs: any,
  indexMapping: IndexMapping
): SavedObjectsAggs => {
  return Object.keys(aggs).reduce((acc, key) => {
    if (key === 'field') {
      const error = hasFilterKeyError(aggs[key], allowedTypes, indexMapping);
      if (error != null) {
        throw SavedObjectsErrorHelpers.createBadRequestError(error);
      }
      return {
        ...acc,
        [key]: aggs[key].replace('.attributes', ''),
      };
    } else if (typeof aggs[key] === 'object') {
      return { ...acc, [key]: validateGetAggFieldValue(allowedTypes, aggs[key], indexMapping) };
    }
    return {
      ...acc,
      [key]: aggs[key],
    };
  }, {});
};
