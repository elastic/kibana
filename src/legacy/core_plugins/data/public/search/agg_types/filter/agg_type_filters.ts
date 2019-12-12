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

import { AggConfig } from 'ui/vis';
import { IIndexPattern } from '../../../../../../../plugins/data/public';
import { AggType } from '..';

type AggTypeFilter = (
  aggType: AggType,
  indexPattern: IIndexPattern,
  aggConfig: AggConfig
) => boolean;

/**
 * A registry to store {@link AggTypeFilter} which are used to filter down
 * available aggregations for a specific visualization and {@link AggConfig}.
 */
class AggTypeFilters {
  private filters = new Set<AggTypeFilter>();

  /**
   * Register a new {@link AggTypeFilter} with this registry.
   *
   * @param filter The filter to register.
   */
  public addFilter(filter: AggTypeFilter): void {
    this.filters.add(filter);
  }

  /**
   * Returns the {@link AggType|aggTypes} filtered by all registered filters.
   *
   * @param aggTypes A list of aggTypes that will be filtered down by this registry.
   * @param indexPattern The indexPattern for which this list should be filtered down.
   * @param aggConfig The aggConfig for which the returning list will be used.
   * @return A filtered list of the passed aggTypes.
   */
  public filter(aggTypes: AggType[], indexPattern: IIndexPattern, aggConfig: AggConfig) {
    const allFilters = Array.from(this.filters);
    const allowedAggTypes = aggTypes.filter(aggType => {
      const isAggTypeAllowed = allFilters.every(filter => filter(aggType, indexPattern, aggConfig));
      return isAggTypeAllowed;
    });
    return allowedAggTypes;
  }
}

const aggTypeFilters = new AggTypeFilters();

export { aggTypeFilters, AggTypeFilters };
