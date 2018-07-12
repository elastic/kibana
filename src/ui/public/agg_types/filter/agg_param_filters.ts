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
import { IndexPattern } from '../../index_patterns';
import { AggConfig } from '../../vis';
import { AggParams } from '../agg_params';

type AggParamFilter = (aggParam: any, indexPattern: IndexPattern, aggConfig: AggConfig) => boolean;

/**
 * A registry to store {@link AggParamFilter} which are used to filter down
 * available aggregations params.
 */
class AggParamFilters {
  private filters = new Set<AggParamFilter>();

  /**
   * Register a new {@link AggParamFilter} with this registry.
   *
   * @param filter The filter to register.
   */
  public addFilter(filter: AggParamFilter): void {
    this.filters.add(filter);
  }

  /**
   * Returns the {@link AggParams|aggParams} filtered by all registered filters.
   *
   * @param aggParams A list of aggParams that will be filtered down by this registry.
   * @param indexPattern The indexPattern for which this list should be filtered down.
   * @param aggConfig The aggConfig for which the returning list will be used.
   * @return A filtered list of the passed aggParams.
   */
  public filter(aggParams: any[], indexPattern: IndexPattern, aggConfig: AggConfig) {
    const allFilters = Array.from(this.filters);
    const allowedAggParams = aggParams.filter(aggParam => {
      const isAggParamAllowed = allFilters.every(filter =>
        filter(aggParam, indexPattern, aggConfig)
      );
      return isAggParamAllowed;
    });

    return new AggParams(allowedAggParams);
  }
}

const aggParamFilters = new AggParamFilters();

export { aggParamFilters, AggParamFilters };
