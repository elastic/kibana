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

import { IAggConfig, IndexPatternField } from '../../../data/public';

type AggTypeFieldFilter = (field: IndexPatternField, aggConfig: IAggConfig) => boolean;

const filters: AggTypeFieldFilter[] = [
  /**
   * Check index pattern aggregation restrictions
   * and limit available fields for a given aggType based on that.
   */
  (field, aggConfig) => {
    const indexPattern = aggConfig.getIndexPattern();
    const aggRestrictions = indexPattern.getAggregationRestrictions();

    if (!aggRestrictions) {
      return true;
    }

    const aggName = aggConfig.type && aggConfig.type.name;
    const aggFields = aggRestrictions[aggName];
    return !!aggFields && !!aggFields[field.name];
  },
];

export function filterAggTypeFields(fields: IndexPatternField[], aggConfig: IAggConfig) {
  const allowedAggTypeFields = fields.filter((field) => {
    const isAggTypeFieldAllowed = filters.every((filter) => filter(field, aggConfig));
    return isAggTypeFieldAllowed;
  });
  return allowedAggTypeFields;
}
