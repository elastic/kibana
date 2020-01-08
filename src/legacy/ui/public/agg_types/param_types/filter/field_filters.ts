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
import { AggConfig } from '../../../vis';
import { Field } from '../../../../../../plugins/data/public';

type AggTypeFieldFilter = (field: Field, aggConfig: AggConfig) => boolean;

/**
 * A registry to store {@link AggTypeFieldFilter} which are used to filter down
 * available fields for a specific visualization and {@link AggType}.
 */
class AggTypeFieldFilters {
  private filters = new Set<AggTypeFieldFilter>();

  /**
   * Register a new {@link AggTypeFieldFilter} with this registry.
   * This will be used by the {@link #filter|filter method}.
   *
   * @param filter The filter to register.
   */
  public addFilter(filter: AggTypeFieldFilter): void {
    this.filters.add(filter);
  }

  /**
   * Returns the {@link any|fields} filtered by all registered filters.
   *
   * @param fields An IndexedArray of fields that will be filtered down by this registry.
   * @param aggConfig The aggConfig for which the returning list will be used.
   * @return A filtered list of the passed fields.
   */
  public filter(fields: Field[], aggConfig: AggConfig) {
    const allFilters = Array.from(this.filters);
    const allowedAggTypeFields = fields.filter(field => {
      const isAggTypeFieldAllowed = allFilters.every(filter => filter(field, aggConfig));
      return isAggTypeFieldAllowed;
    });
    return allowedAggTypeFields;
  }
}

const aggTypeFieldFilters = new AggTypeFieldFilters();

export { aggTypeFieldFilters, AggTypeFieldFilters };
