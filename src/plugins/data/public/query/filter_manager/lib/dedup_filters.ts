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

import { filter, find } from 'lodash';
import { compareFilters } from './compare_filters';
import { esFilters } from '../../../../common';

/**
 * Combine 2 filter collections, removing duplicates
 *
 * @param {object} existingFilters - The filters to compare to
 * @param {object} filters - The filters being added
 * @param {object} comparatorOptions - Parameters to use for comparison
 *
 * @returns {object} An array of filters that were not in existing
 */
export const dedupFilters = (
  existingFilters: esFilters.Filter[],
  filters: esFilters.Filter[],
  comparatorOptions: any = {}
) => {
  if (!Array.isArray(filters)) {
    filters = [filters];
  }

  return filter(
    filters,
    (f: esFilters.Filter) =>
      !find(existingFilters, (existingFilter: esFilters.Filter) =>
        compareFilters(existingFilter, f, comparatorOptions)
      )
  );
};
