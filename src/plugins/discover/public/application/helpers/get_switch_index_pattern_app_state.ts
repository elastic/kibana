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
import { getSortArray } from '../angular/doc_table';
import { SortPairArr } from '../angular/doc_table/lib/get_sort';
import { IndexPattern } from '../../kibana_services';

/**
 * Helper function to remove or adapt the currently selected columns/sort to be valid with the next
 * index pattern, returns a new state object
 */
export function getSwitchIndexPatternAppState(
  currentIndexPattern: IndexPattern,
  nextIndexPattern: IndexPattern,
  currentColumns: string[],
  currentSort: SortPairArr[],
  modifyColumns: boolean = true
) {
  const nextColumns = modifyColumns
    ? currentColumns.filter(
        (column) =>
          nextIndexPattern.fields.getByName(column) || !currentIndexPattern.fields.getByName(column)
      )
    : currentColumns;
  const nextSort = getSortArray(currentSort, nextIndexPattern);
  return {
    index: nextIndexPattern.id,
    columns: nextColumns.length ? nextColumns : ['_source'],
    sort: nextSort,
  };
}
