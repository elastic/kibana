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
import { isFunction } from 'lodash';
import { IndexPatternEnhanced } from 'ui/index_patterns/_index_pattern';
// @ts-ignore
import { shortenDottedString } from '../../../../../common/utils/shorten_dotted_string';
import { TableHeaderColumn } from './table_header_column';
import { SortOrder, getDisplayedColumns } from './helpers';


interface Props {
  columns: string[];
  hideTimeColumn: boolean;
  indexPattern: IndexPatternEnhanced;
  isShortDots: boolean;
  onChangeSortOrder: (name: string, direction: 'asc' | 'desc') => void;
  onMoveColumn: (name: string, index: number) => void;
  onRemoveColumn: (name: string) => void;
  sortOrder: SortOrder;
}

export function TableHeader({
  columns,
  hideTimeColumn,
  indexPattern,
  isShortDots,
  onChangeSortOrder,
  onMoveColumn,
  onRemoveColumn,
  sortOrder,
}: Props) {
  const { timeFieldName } = indexPattern;

  function cycleSortOrder(colName: string) {
    const [currColumnName, currDirection = 'asc'] = sortOrder;
    const newDirection = colName === currColumnName && currDirection === 'asc' ? 'desc' : 'asc';

    onChangeSortOrder(colName, newDirection);
  }

  function columnMapper(name: string, idx: number) {
    const field = indexPattern.getFieldByName(name);
    return {
      name,
      displayName: isShortDots ? shortenDottedString(name) : name,
      isSortable: isFunction(onChangeSortOrder) && field && field.sortable,
      isRemoveable: isFunction(onRemoveColumn) && (name !== '_source' || columns.length > 1),
      colLeftIdx: idx - 1 < 0 ? -1 : idx - 1,
      colRightIdx: idx + 1 >= columns.length ? -1 : idx + 1,
    };
  }
  const usedTimeField = timeFieldName && !hideTimeColumn ? timeFieldName : '';
  const displayedColumns = getDisplayedColumns(columns, columnMapper, usedTimeField);

  return (
    <tr data-test-subj="docTableHeader">
      <th style={{ width: '24px' }}></th>
      {displayedColumns.map((col: any) => {
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
