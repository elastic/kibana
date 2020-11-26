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
import { IndexPattern } from '../../kibana_services';

/**
 * This function is recording stats of the available fields, for usage in sidebar and sharing
 * Note that this values aren't displayed, but used for internal calculations
 */
export function calcFieldCounts(
  counts = {} as Record<string, number>,
  rows: Array<Record<string, any>>,
  indexPattern: IndexPattern
) {
  for (const hit of rows) {
    const fields = Object.keys(indexPattern.flattenHit(hit));
    for (const fieldName of fields) {
      counts[fieldName] = (counts[fieldName] || 0) + 1;
    }
  }

  return counts;
}
