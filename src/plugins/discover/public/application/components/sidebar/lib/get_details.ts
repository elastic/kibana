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

// @ts-ignore
import { fieldCalculator } from './field_calculator';
import { IndexPattern, IndexPatternField } from '../../../../../../data/public';

export function getDetails(
  field: IndexPatternField,
  hits: Array<Record<string, unknown>>,
  columns: string[],
  indexPattern?: IndexPattern
) {
  if (!indexPattern) {
    return {};
  }
  const details = {
    ...fieldCalculator.getFieldValueCounts({
      hits,
      field,
      indexPattern,
      count: 5,
      grouped: false,
    }),
    columns,
  };
  if (details.buckets) {
    for (const bucket of details.buckets) {
      bucket.display = indexPattern.getFormatterForField(field).convert(bucket.value);
    }
  }
  return details;
}
