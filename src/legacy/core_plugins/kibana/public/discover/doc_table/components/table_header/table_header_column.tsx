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
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
// @ts-ignore
import { shortenDottedString } from '../../../../../common/utils/shorten_dotted_string';

interface Props {
  colLeftIdx: number; // idx of the column to the left, -1 if moving is not possible
  colRightIdx: number; // idx of the column to the right, -1 if moving is not possible
  displayName: string;
  isRemoveable: boolean;
  isSortable: boolean;
  name: string;
  onChangeSortOrder?: (name: string, direction: 'asc' | 'desc') => void;
  onMoveColumn?: (name: string, idx: number) => void;
  onRemoveColumn?: (name: string) => void;
  sortDirection: 'asc' | 'desc' | ''; // asc|desc -> field is sorted in this direction, else ''
}

export function TableHeaderColumn({
  colLeftIdx,
  colRightIdx,
  displayName,
  isRemoveable,
  isSortable,
  name,
  onChangeSortOrder,
  onMoveColumn,
  onRemoveColumn,
  sortDirection,
}: Props) {
  const btnSortIcon = sortDirection === 'desc' ? 'fa fa-sort-down' : 'fa fa-sort-up';
  const btnSortClassName =
    sortDirection !== '' ? btnSortIcon : `kbnDocTableHeader__sortChange ${btnSortIcon}`;

  // action buttons displayed on the right side of the column name
  const buttons = [
    // Sort Button
    {
      active: isSortable,
      ariaLabel:
        sortDirection === 'asc'
          ? i18n.translate('kbn.docTable.tableHeader.sortByColumnDescendingAriaLabel', {
              defaultMessage: 'Sort {columnName} descending',
              values: { columnName: name },
            })
          : i18n.translate('kbn.docTable.tableHeader.sortByColumnAscendingAriaLabel', {
              defaultMessage: 'Sort {columnName} ascending',
              values: { columnName: name },
            }),
      className: btnSortClassName,
      onClick: () => {
        /**
         * cycle sorting direction
         * asc -> desc, desc -> asc, default: asc
         */
        if (typeof onChangeSortOrder === 'function') {
          const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          onChangeSortOrder(name, newDirection);
        }
      },
      testSubject: `docTableHeaderFieldSort_${name}`,
      tooltip: i18n.translate('kbn.docTable.tableHeader.sortByColumnTooltip', {
        defaultMessage: 'Sort by {columnName}',
        values: { columnName: name },
      }),
    },
    // Remove Button
    {
      active: isRemoveable,
      ariaLabel: i18n.translate('kbn.docTable.tableHeader.removeColumnButtonAriaLabel', {
        defaultMessage: 'Remove {columnName} column',
        values: { columnName: name },
      }),
      className: 'fa fa-remove kbnDocTableHeader__move',
      onClick: () => onRemoveColumn && onRemoveColumn(name),
      testSubject: `docTableRemoveHeader-${name}`,
      tooltip: i18n.translate('kbn.docTable.tableHeader.removeColumnButtonTooltip', {
        defaultMessage: 'Remove Column',
      }),
    },
    // Move Left Button
    {
      active: colLeftIdx >= 0,
      ariaLabel: i18n.translate('kbn.docTable.tableHeader.moveColumnLeftButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the left',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-left kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colLeftIdx),
      testSubject: `docTableMoveLeftHeader-${name}`,
      tooltip: i18n.translate('kbn.docTable.tableHeader.moveColumnLeftButtonTooltip', {
        defaultMessage: 'Move column to the left',
      }),
    },
    // Move Right Button
    {
      active: colRightIdx >= 0,
      ariaLabel: i18n.translate('kbn.docTable.tableHeader.moveColumnRightButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the right',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-right kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colRightIdx),
      testSubject: `docTableMoveRightHeader-${name}`,
      tooltip: i18n.translate('kbn.docTable.tableHeader.moveColumnRightButtonTooltip', {
        defaultMessage: 'Move column to the right',
      }),
    },
  ];

  return (
    <th data-test-subj="docTableHeaderField">
      <span data-test-subj={`docTableHeader-${name}`}>
        {displayName}
        {buttons
          .filter(button => button.active)
          .map((button, idx) => (
            <EuiToolTip
              id={`docTableHeader-${name}-tt`}
              content={button.tooltip}
              key={`button-${idx}`}
            >
              <button
                aria-label={button.ariaLabel}
                className={button.className}
                data-test-subj={button.testSubject}
                onClick={button.onClick}
              />
            </EuiToolTip>
          ))}
      </span>
    </th>
  );
}
