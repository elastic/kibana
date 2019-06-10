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

import Boom from 'boom';

import { IndexMapping } from '../../../../mappings';
import { SavedObjectsSchema } from '../../../schema';
import { getQueryParams } from './query_params';
import { getSortingParams } from './sorting_params';

interface GetSearchDslOptions {
  type: string | string[];
  search?: string;
  defaultSearchOperator?: string;
  searchFields?: string[];
  sortField?: string;
  sortOrder?: string;
  namespace?: string;
  hasReference?: {
    type: string;
    id: string;
  };
}

export function getSearchDsl(
  mappings: IndexMapping,
  schema: SavedObjectsSchema,
  options: GetSearchDslOptions
) {
  const {
    type,
    search,
    defaultSearchOperator,
    searchFields,
    sortField,
    sortOrder,
    namespace,
    hasReference,
  } = options;

  if (!type) {
    throw Boom.notAcceptable('type must be specified');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  return {
    ...getQueryParams(
      mappings,
      schema,
      namespace,
      type,
      search,
      searchFields,
      defaultSearchOperator,
      hasReference
    ),
    ...getSortingParams(mappings, type, sortField, sortOrder),
  };
}
