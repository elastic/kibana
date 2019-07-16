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
// @ts-ignore
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { shortenDottedString } from '../../../../../common/utils/shorten_dotted_string';

import { TableHeaderColumn } from './table_header_column';
import { TableHeaderTimeColumn } from './table_header_time_column';
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

  return (
    <tr>
      <td style={{ width: '1%' }}></td>
      {timeFieldName && !hideTimeColumn && (
        <TableHeaderTimeColumn
          sortOrder={sortOrder}
          onCycleSortOrder={cycleSortOrder}
          timeFieldName={timeFieldName}
        />
      )}
      {columns.map((name: string, idx: number) => {
        const canRemoveColumn =
          isFunction(onRemoveColumn) && (name !== '_source' || columns.length > 1);
        const isSortable =
          isFunction(onChangeSortOrder) &&
          get(indexPattern, ['fields', 'byName', name, 'sortable'], false);

        const colLeftIdx = idx - 1 < 0 ? -1 : idx - 1;
        const colRightIdx = idx + 1 >= columns.length ? -1 : idx + 1;
        const displayName = isShortDots ? shortenDottedString(name) : name;

        return (
          <TableHeaderColumn
            key={name}
            name={name}
            displayName={displayName}
            sortOrder={sortOrder}
            onCycleSortOrder={isSortable ? () => cycleSortOrder(name) : undefined}
            onMoveColumnLeft={colLeftIdx >= 0 ? () => onMoveColumn(name, colLeftIdx) : undefined}
            onMoveColumnRight={colRightIdx >= 0 ? () => onMoveColumn(name, colRightIdx) : undefined}
            onRemoveColumn={canRemoveColumn ? () => onRemoveColumn(name) : undefined}
          />
        );
      })}
    </tr>
  );
}
