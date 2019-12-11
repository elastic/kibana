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
import { IndexPattern } from '../../../../../kibana_services';
// @ts-ignore
import { shortenDottedString } from '../../../../../../../common/utils/shorten_dotted_string';

export type SortOrder = [string, 'asc' | 'desc'];
export interface ColumnProps {
  name: string;
  displayName: string;
  isSortable: boolean;
  isRemoveable: boolean;
  colLeftIdx: number;
  colRightIdx: number;
}

/**
 * Returns properties necessary to display the time column
 * If it's an IndexPattern with timefield, the time column is
 * prepended, not moveable and removeable
 * @param timeFieldName
 */
export function getTimeColumn(timeFieldName: string): ColumnProps {
  return {
    name: timeFieldName,
    displayName: 'Time',
    isSortable: true,
    isRemoveable: false,
    colLeftIdx: -1,
    colRightIdx: -1,
  };
}
/**
 * A given array of column names returns an array of properties
 * necessary to display the columns. If the given indexPattern
 * has a timefield, a time column is prepended
 * @param columns
 * @param indexPattern
 * @param hideTimeField
 * @param isShortDots
 */
export function getDisplayedColumns(
  columns: string[],
  indexPattern: IndexPattern,
  hideTimeField: boolean,
  isShortDots: boolean
) {
  if (!Array.isArray(columns) || typeof indexPattern !== 'object' || !indexPattern.getFieldByName) {
    return [];
  }
  const columnProps = columns.map((column, idx) => {
    const field = indexPattern.getFieldByName(column);
    return {
      name: column,
      displayName: isShortDots ? shortenDottedString(column) : column,
      isSortable: field && field.sortable ? true : false,
      isRemoveable: column !== '_source' || columns.length > 1,
      colLeftIdx: idx - 1 < 0 ? -1 : idx - 1,
      colRightIdx: idx + 1 >= columns.length ? -1 : idx + 1,
    };
  });
  return !hideTimeField && indexPattern.timeFieldName
    ? [getTimeColumn(indexPattern.timeFieldName), ...columnProps]
    : columnProps;
}
