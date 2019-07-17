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
import React from 'react';
import { isFunction, get } from 'lodash';
import { IndexPattern } from 'ui/index_patterns';
// @ts-ignore
import { shortenDottedString } from '../../../../../common/utils/shorten_dotted_string';
import { TableHeaderColumn } from './table_header_column';
import { SortOrder } from './helpers';

interface Props {
  indexPattern: IndexPattern;
  hideTimeColumn: number;
  columns: string[];
  sortOrder: SortOrder;
  isShortDots: boolean;
  onRemoveColumn: (name: string) => void;
  onChangeSortOrder: (name: string, direction: 'asc' | 'desc') => void;
  onMoveColumn: (name: string, index: number) => void;
}

export function TableHeader({
  indexPattern,
  hideTimeColumn,
  columns,
  onRemoveColumn,
  onChangeSortOrder,
  sortOrder,
  isShortDots,
  onMoveColumn,
}: Props) {
  const { timeFieldName } = indexPattern;

  function cycleSortOrder(colName: string) {
    const [currColumnName, currDirection = 'asc'] = sortOrder;
    const newDirection = colName === currColumnName && currDirection === 'asc' ? 'desc' : 'asc';

    onChangeSortOrder(colName, newDirection);
  }

  const columnData = columns.map((name, idx) => {
    return {
      name,
      displayName: isShortDots ? shortenDottedString(name) : name,
      isSortable:
        isFunction(onChangeSortOrder) &&
        get(indexPattern, ['fields', 'byName', name, 'sortable'], false),
      isRemoveable: isFunction(onRemoveColumn) && (name !== '_source' || columns.length > 1),
      colLeftIdx: idx - 1 < 0 ? -1 : idx - 1,
      colRightIdx: idx + 1 >= columns.length ? -1 : idx + 1,
    };
  });

  const displayedColumns =
    timeFieldName && !hideTimeColumn
      ? [
          {
            name: timeFieldName,
            displayName: 'Time',
            isSortable: true,
            isRemoveable: false,
            colLeftIdx: -1,
            colRightIdx: -1,
          },
          ...columnData,
        ]
      : columnData;

  return (
    <tr>
      <td style={{ width: '1%' }}></td>
      {displayedColumns.map(col => {
        return (
          <TableHeaderColumn
            key={col.name}
            sortOrder={sortOrder}
            {...col}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onChangeSortOrder={cycleSortOrder}
          />
        );
      })}
    </tr>
  );
}
