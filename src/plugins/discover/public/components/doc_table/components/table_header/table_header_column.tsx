/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip, EuiIconTip } from '@elastic/eui';
import { SortOrder } from './helpers';
import { DocViewTableScoreSortWarning } from './score_sort_warning';

interface Props {
  colLeftIdx: number; // idx of the column to the left, -1 if moving is not possible
  colRightIdx: number; // idx of the column to the right, -1 if moving is not possible
  displayName?: string;
  isRemoveable: boolean;
  isSortable: boolean;
  isTimeColumn: boolean;
  customLabel?: string;
  name: string;
  onChangeSortOrder?: (sortOrder: SortOrder[]) => void;
  onMoveColumn?: (name: string, idx: number) => void;
  onRemoveColumn?: (name: string) => void;
  sortOrder: SortOrder[];
}

interface IconProps {
  iconType: string;
  color: 'primary' | 'text';
}

interface IconButtonProps {
  active: boolean;
  ariaLabel: string;
  className: string;
  iconProps: IconProps;
  onClick: () => void | undefined;
  testSubject: string;
  tooltip: string;
}

const sortDirectionToIcon: Record<string, IconProps> = {
  desc: { iconType: 'sortDown', color: 'primary' },
  asc: { iconType: 'sortUp', color: 'primary' },
  '': { iconType: 'sortable', color: 'text' },
};

const ICON_BUTTON_STYLE = { width: 12, height: 12 };

export function TableHeaderColumn({
  colLeftIdx,
  colRightIdx,
  displayName,
  isRemoveable,
  isSortable,
  isTimeColumn,
  customLabel,
  name,
  onChangeSortOrder,
  onMoveColumn,
  onRemoveColumn,
  sortOrder,
}: Props) {
  const [, sortDirection = ''] = sortOrder.find((sortPair) => name === sortPair[0]) || [];
  const curSortWithoutCol = sortOrder.filter((pair) => pair[0] !== name);
  const curColSort = sortOrder.find((pair) => pair[0] === name);
  const curColSortDir = (curColSort && curColSort[1]) || '';

  const timeAriaLabel = i18n.translate(
    'discover.docTable.tableHeader.timeFieldIconTooltipAriaLabel',
    { defaultMessage: 'Primary time field.' }
  );
  const timeTooltip = i18n.translate('discover.docTable.tableHeader.timeFieldIconTooltip', {
    defaultMessage: 'This field represents the time that events occurred.',
  });

  // If this is the _score column, and _score is not one of the columns inside the sort, show a
  // warning that the _score will not be retrieved from Elasticsearch
  const showScoreSortWarning = name === '_score' && !curColSort;

  const handleChangeSortOrder = () => {
    if (!onChangeSortOrder) return;

    // Cycle goes Unsorted -> Asc -> Desc -> Unsorted
    if (curColSort === undefined) {
      onChangeSortOrder([...curSortWithoutCol, [name, 'asc']]);
    } else if (curColSortDir === 'asc') {
      onChangeSortOrder([...curSortWithoutCol, [name, 'desc']]);
    } else if (curColSortDir === 'desc' && curSortWithoutCol.length === 0) {
      // If we're at the end of the cycle and this is the only existing sort, we switch
      // back to ascending sort instead of removing it.
      onChangeSortOrder([[name, 'asc']]);
    } else {
      onChangeSortOrder(curSortWithoutCol);
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

    if (curColSort === undefined) {
      return sortAscendingMessage;
    } else if (sortDirection === 'asc') {
      return sortDescendingMessage;
    } else if (sortDirection === 'desc' && curSortWithoutCol.length === 0) {
      return sortAscendingMessage;
    } else {
      return stopSortingMessage;
    }
  };

  // action buttons displayed on the right side of the column name
  const buttons: IconButtonProps[] = [
    // Sort Button
    {
      active: isSortable && typeof onChangeSortOrder === 'function',
      ariaLabel: getSortButtonAriaLabel(),
      className: !sortDirection ? 'kbnDocTableHeader__sortChange' : '',
      iconProps: sortDirectionToIcon[sortDirection],
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
      className: 'kbnDocTableHeader__move',
      iconProps: { iconType: 'cross', color: 'text' },
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
      className: 'kbnDocTableHeader__move',
      iconProps: { iconType: 'sortLeft', color: 'text' },
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
      className: 'kbnDocTableHeader__move',
      iconProps: { iconType: 'sortRight', color: 'text' },
      onClick: () => onMoveColumn && onMoveColumn(name, colRightIdx),
      testSubject: `docTableMoveRightHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.moveColumnRightButtonTooltip', {
        defaultMessage: 'Move column to the right',
      }),
    },
  ];

  return (
    <th data-test-subj="docTableHeaderField">
      <span data-test-subj={`docTableHeader-${name}`} className="kbnDocTableHeader__actions">
        {showScoreSortWarning && <DocViewTableScoreSortWarning />}
        {customLabel ?? displayName}
        {isTimeColumn && (
          <EuiIconTip
            key="time-icon"
            type="clock"
            aria-label={timeAriaLabel}
            content={timeTooltip}
          />
        )}
        {buttons
          .filter((button) => button.active)
          .map((button, idx) => (
            <EuiToolTip
              id={`docTableHeader-${name}-tt`}
              content={button.tooltip}
              key={`button-${idx}`}
            >
              <EuiButtonIcon
                aria-label={button.ariaLabel}
                className={button.className}
                data-test-subj={button.testSubject}
                onClick={button.onClick}
                iconSize="s"
                style={ICON_BUTTON_STYLE}
                {...button.iconProps}
              />
            </EuiToolTip>
          ))}
      </span>
    </th>
  );
}
