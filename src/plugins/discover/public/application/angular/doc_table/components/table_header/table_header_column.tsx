/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { SortOrder } from './helpers';

interface Props {
  colLeftIdx: number; // idx of the column to the left, -1 if moving is not possible
  colRightIdx: number; // idx of the column to the right, -1 if moving is not possible
  displayName?: string;
  isRemoveable: boolean;
  isSortable: boolean;
  name: string;
  onChangeSortOrder?: (sortOrder: SortOrder[]) => void;
  onMoveColumn?: (name: string, idx: number) => void;
  onRemoveColumn?: (name: string) => void;
  sortOrder: SortOrder[];
}

const sortDirectionToIcon: Record<string, string> = {
  desc: 'fa fa-sort-down',
  asc: 'fa fa-sort-up',
  '': 'fa fa-sort',
};

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
  sortOrder,
}: Props) {
  const [, sortDirection = ''] = sortOrder.find((sortPair) => name === sortPair[0]) || [];
  const currentSortWithoutColumn = sortOrder.filter((pair) => pair[0] !== name);
  const currentColumnSort = sortOrder.find((pair) => pair[0] === name);
  const currentColumnSortDirection = (currentColumnSort && currentColumnSort[1]) || '';

  const btnSortIcon = sortDirectionToIcon[sortDirection];
  const btnSortClassName =
    sortDirection !== '' ? btnSortIcon : `kbnDocTableHeader__sortChange ${btnSortIcon}`;

  const handleChangeSortOrder = () => {
    if (!onChangeSortOrder) return;

    // Cycle goes Unsorted -> Asc -> Desc -> Unsorted
    if (currentColumnSort === undefined) {
      onChangeSortOrder([...currentSortWithoutColumn, [name, 'asc']]);
    } else if (currentColumnSortDirection === 'asc') {
      onChangeSortOrder([...currentSortWithoutColumn, [name, 'desc']]);
    } else if (currentColumnSortDirection === 'desc' && currentSortWithoutColumn.length === 0) {
      // If we're at the end of the cycle and this is the only existing sort, we switch
      // back to ascending sort instead of removing it.
      onChangeSortOrder([[name, 'asc']]);
    } else {
      onChangeSortOrder(currentSortWithoutColumn);
    }
  };

  const getSortButtonAriaLabel = () => {
    const sortAscendingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnAscendingAriaLabel',
      {
        defaultMessage: 'Sort {columnName} ascending',
        values: { columnName: name },
      }
    );
    const sortDescendingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnDescendingAriaLabel',
      {
        defaultMessage: 'Sort {columnName} descending',
        values: { columnName: name },
      }
    );
    const stopSortingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnUnsortedAriaLabel',
      {
        defaultMessage: 'Stop sorting on {columnName}',
        values: { columnName: name },
      }
    );

    if (currentColumnSort === undefined) {
      return sortAscendingMessage;
    } else if (sortDirection === 'asc') {
      return sortDescendingMessage;
    } else if (sortDirection === 'desc' && currentSortWithoutColumn.length === 0) {
      return sortAscendingMessage;
    } else {
      return stopSortingMessage;
    }
  };

  // action buttons displayed on the right side of the column name
  const buttons = [
    // Sort Button
    {
      active: isSortable && typeof onChangeSortOrder === 'function',
      ariaLabel: getSortButtonAriaLabel(),
      className: btnSortClassName,
      onClick: handleChangeSortOrder,
      testSubject: `docTableHeaderFieldSort_${name}`,
      tooltip: getSortButtonAriaLabel(),
    },
    // Remove Button
    {
      active: isRemoveable && typeof onRemoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.removeColumnButtonAriaLabel', {
        defaultMessage: 'Remove {columnName} column',
        values: { columnName: name },
      }),
      className: 'fa fa-remove kbnDocTableHeader__move',
      onClick: () => onRemoveColumn && onRemoveColumn(name),
      testSubject: `docTableRemoveHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.removeColumnButtonTooltip', {
        defaultMessage: 'Remove Column',
      }),
    },
    // Move Left Button
    {
      active: colLeftIdx >= 0 && typeof onMoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.moveColumnLeftButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the left',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-left kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colLeftIdx),
      testSubject: `docTableMoveLeftHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.moveColumnLeftButtonTooltip', {
        defaultMessage: 'Move column to the left',
      }),
    },
    // Move Right Button
    {
      active: colRightIdx >= 0 && typeof onMoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.moveColumnRightButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the right',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-right kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colRightIdx),
      testSubject: `docTableMoveRightHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.moveColumnRightButtonTooltip', {
        defaultMessage: 'Move column to the right',
      }),
    },
  ];

  return (
    <th data-test-subj="docTableHeaderField">
      <span data-test-subj={`docTableHeader-${name}`}>
        {displayName}
        {buttons
          .filter((button) => button.active)
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
