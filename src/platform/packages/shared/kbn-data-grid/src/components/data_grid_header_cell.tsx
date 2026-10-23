/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, MouseEvent, PointerEvent, TouchEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiListGroupItemProps } from '@elastic/eui';
import { EuiHorizontalRule, EuiIcon, EuiListGroup, EuiPopover, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CELL_ENTERED_ATTRIBUTE } from '../utils/cell_content_focus';
import type { ColumnLayout } from '../hooks/use_column_virtualization';
import type { DataGridStyles } from '../styles';
import type {
  DataGridColumnActions,
  DataGridHeaderActionItem,
  DataGridInternalColumn,
  DataGridProps,
  DataGridSortColumn,
  DataGridSortDirection,
} from '../types';
import { getSortLabels } from '../utils/sort_labels';
import { getLayoutStyle } from './data_grid_cell';

interface HeaderMenuParams<TRow> {
  column: DataGridInternalColumn<TRow>;
  /** 0-based position among the data columns, without the control columns. */
  dataColumnIndex: number;
  dataColumnCount: number;
  sorting?: DataGridProps<TRow>['sorting'];
  onMoveColumn?: DataGridProps<TRow>['onMoveColumn'];
  onHideColumn?: DataGridProps<TRow>['onHideColumn'];
}

interface DataGridHeaderCellProps<TRow> extends HeaderMenuParams<TRow> {
  /** 0-based position among all columns. */
  columnIndex: number;
  layout: ColumnLayout;
  /** Set when the column can be dragged to reorder it. */
  onStartDrag?: (columnId: string, event: PointerEvent) => void;
  /** Whether this column is dragged, or the dragged one would be dropped next to it. */
  dragState?: 'dragging' | 'dropBefore' | 'dropAfter';
  styles: DataGridStyles;
  isTabStop: boolean;
  isResizing: boolean;
  headerRowHeight?: DataGridProps<TRow>['headerRowHeight'];
  onStartResize: (columnIndex: number, event: MouseEvent | TouchEvent) => void;
  onResetColumnWidth: (columnIndex: number) => void;
}

/** Sorting a column that is already sorted that way takes it out of the sorting. */
const getNextSorting = (
  columns: DataGridSortColumn[],
  columnId: string,
  direction: DataGridSortDirection
): DataGridSortColumn[] => {
  const index = columns.findIndex(({ id }) => id === columnId);
  if (index === -1) {
    return [...columns, { id: columnId, direction }];
  }
  if (columns[index].direction === direction) {
    return columns.filter((_, columnIndex) => columnIndex !== index);
  }
  return columns.map((sortColumn, columnIndex) =>
    columnIndex === index ? { id: columnId, direction } : sortColumn
  );
};

/** Whether the header has a menu, without building it: most headers are never opened. */
const hasHeaderMenu = <TRow,>({
  column: { actions, isControl, isSortable = false },
  sorting,
  onMoveColumn,
  onHideColumn,
}: HeaderMenuParams<TRow>) => {
  if (actions === false || isControl) {
    return false;
  }
  const options: DataGridColumnActions = actions ?? {};
  return Boolean(
    (sorting && isSortable && (options.showSortAsc !== false || options.showSortDesc !== false)) ||
      (onMoveColumn && (options.showMoveLeft !== false || options.showMoveRight !== false)) ||
      (onHideColumn && options.showHide) ||
      options.additional?.length
  );
};

/**
 * The actions of the header menu in groups, which are told apart by a divider: the additional ones of
 * the column (e.g. copy), sorting, moving, and removing the column.
 */
const getHeaderMenuGroups = <TRow,>({
  column,
  dataColumnIndex,
  dataColumnCount,
  sorting,
  onMoveColumn,
  onHideColumn,
}: HeaderMenuParams<TRow>): DataGridHeaderActionItem[][] => {
  const { id, schema, isSortable = false } = column;
  const actionOptions: DataGridColumnActions = column.actions || {};
  const sortColumn = sorting?.columns.find((sortedColumn) => sortedColumn.id === id);
  const schemaSortLabels = getSortLabels(schema);
  const sortLabels = {
    asc: actionOptions.sortLabels?.asc ?? schemaSortLabels.asc,
    desc: actionOptions.sortLabels?.desc ?? schemaSortLabels.desc,
  };
  const groups: DataGridHeaderActionItem[][] = [];
  const pushGroup = (group: DataGridHeaderActionItem[]) => {
    if (group.length > 0) {
      groups.push(group);
    }
  };

  pushGroup(actionOptions.additional ?? []);

  const sortGroup: DataGridHeaderActionItem[] = [];
  if (sorting && isSortable) {
    const sortBy = (direction: DataGridSortDirection) =>
      sorting.onSort(getNextSorting(sorting.columns, id, direction));
    if (actionOptions.showSortAsc !== false) {
      sortGroup.push({
        id: 'sortAsc',
        label:
          sortColumn?.direction === 'asc'
            ? i18n.translate('kbnDataGrid.header.unsortAscending', {
                defaultMessage: 'Unsort ascending',
              })
            : sortLabels.asc,
        iconType: 'sortAscending',
        onClick: () => sortBy('asc'),
        'data-test-subj': 'gridSortAscendingButton',
      });
    }
    if (actionOptions.showSortDesc !== false) {
      sortGroup.push({
        id: 'sortDesc',
        label:
          sortColumn?.direction === 'desc'
            ? i18n.translate('kbnDataGrid.header.unsortDescending', {
                defaultMessage: 'Unsort descending',
              })
            : sortLabels.desc,
        iconType: 'sortDescending',
        onClick: () => sortBy('desc'),
        'data-test-subj': 'gridSortDescendingButton',
      });
    }
  }
  pushGroup(sortGroup);

  const moveGroup: DataGridHeaderActionItem[] = [];
  if (onMoveColumn && actionOptions.showMoveLeft !== false) {
    moveGroup.push({
      id: 'moveLeft',
      label: i18n.translate('kbnDataGrid.header.moveLeft', { defaultMessage: 'Move left' }),
      iconType: 'chevronSingleLeft',
      onClick: () => onMoveColumn({ columnId: id, direction: 'left' }),
      isDisabled: dataColumnIndex === 0,
      'data-test-subj': 'gridMoveColumnLeft',
    });
  }
  if (onMoveColumn && actionOptions.showMoveRight !== false) {
    moveGroup.push({
      id: 'moveRight',
      label: i18n.translate('kbnDataGrid.header.moveRight', { defaultMessage: 'Move right' }),
      iconType: 'chevronSingleRight',
      onClick: () => onMoveColumn({ columnId: id, direction: 'right' }),
      isDisabled: dataColumnIndex === dataColumnCount - 1,
      'data-test-subj': 'gridMoveColumnRight',
    });
  }
  pushGroup(moveGroup);

  if (onHideColumn && actionOptions.showHide) {
    pushGroup([
      {
        id: 'hide',
        label:
          actionOptions.showHide.label ??
          i18n.translate('kbnDataGrid.header.hideColumn', { defaultMessage: 'Hide column' }),
        iconType: actionOptions.showHide.iconType ?? 'trash',
        onClick: () => onHideColumn(id),
        'data-test-subj': actionOptions.showHide['data-test-subj'] ?? 'gridHideColumn',
      },
    ]);
  }
  return groups;
};

interface HeaderCellMenuProps<TRow> extends HeaderMenuParams<TRow> {
  styles: DataGridStyles;
  setIsOpen: (isOpen: boolean) => void;
}

/** The popover with the actions of a column. Only mounted while it is open, most are never opened. */
const HeaderCellMenu = <TRow,>({
  styles,
  setIsOpen,
  column,
  dataColumnIndex,
  dataColumnCount,
  sorting,
  onMoveColumn,
  onHideColumn,
}: HeaderCellMenuProps<TRow>) => {
  const { id, displayAsText } = column;
  const title = displayAsText ?? id;

  const groups = useMemo<EuiListGroupItemProps[][]>(
    () =>
      getHeaderMenuGroups({
        column,
        dataColumnIndex,
        dataColumnCount,
        sorting,
        onMoveColumn,
        onHideColumn,
      }).map((group) =>
        group.map(({ id: itemId, label, iconType, onClick, isDisabled, ...rest }) => ({
          key: itemId,
          label,
          iconType,
          iconProps: { size: 'm' },
          isDisabled,
          onClick: (event: MouseEvent<HTMLButtonElement>) => {
            setIsOpen(false);
            onClick(event);
          },
          ...rest,
        }))
      ),
    [column, dataColumnIndex, dataColumnCount, sorting, onMoveColumn, onHideColumn, setIsOpen]
  );

  return (
    <EuiPopover
      isOpen
      closePopover={() => setIsOpen(false)}
      // The header itself is what opens the menu, the popover hangs below it.
      button={<span aria-hidden="true" />}
      css={styles.headerCellPopoverAnchor}
      display="block"
      panelPaddingSize="s"
      offset={7}
      anchorPosition="downLeft"
      aria-label={title}
      panelProps={{ 'data-test-subj': `dataGridHeaderCellActionGroup-${id}` }}
    >
      {groups.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && <EuiHorizontalRule margin="xs" size="full" />}
          <EuiListGroup maxWidth={false} listItems={group} />
        </React.Fragment>
      ))}
    </EuiPopover>
  );
};

const DataGridHeaderCellComponent = <TRow,>({
  column,
  columnIndex,
  dataColumnIndex,
  dataColumnCount,
  layout,
  styles,
  isTabStop,
  isResizing,
  sorting,
  headerRowHeight = 1,
  onMoveColumn,
  onHideColumn,
  onStartResize,
  onResetColumnWidth,
  onStartDrag,
  dragState,
}: DataGridHeaderCellProps<TRow>) => {
  const { id, header, headerAriaLabel, displayAsText, isResizable, isControl } = column;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sortColumn = sorting?.columns.find((sortedColumn) => sortedColumn.id === id);
  const hasMenu = hasHeaderMenu({
    column,
    dataColumnIndex,
    dataColumnCount,
    sorting,
    onMoveColumn,
    onHideColumn,
  });

  const toggleMenu = useCallback(() => setIsMenuOpen((isOpen) => !isOpen), []);

  const isDraggable = Boolean(onStartDrag) && !isControl;
  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // The resize handle and the open menu keep their own pointer behavior.
      if (
        event.target instanceof Element &&
        event.target.closest('[data-kbn-data-grid-resize-handle]')
      ) {
        return;
      }
      onStartDrag?.(id, event);
    },
    [onStartDrag, id]
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Like EuiDataGrid, Enter on the focused header opens its actions.
      if (hasMenu && event.target === event.currentTarget && event.key === keys.ENTER) {
        event.preventDefault();
        setIsMenuOpen(true);
      }
    },
    [hasMenu]
  );

  const lineClamp = typeof headerRowHeight === 'number' ? headerRowHeight : undefined;
  const content = (
    <>
      <div
        css={[
          styles.headerContent,
          isControl && styles.headerContentControl,
          lineClamp !== undefined && styles.headerContentClamped,
        ]}
        style={lineClamp !== undefined ? { WebkitLineClamp: lineClamp } : undefined}
      >
        {header}
      </div>
      {sortColumn && (
        <EuiIcon
          type={sortColumn.direction === 'asc' ? 'sortUp' : 'sortDown'}
          size="m"
          color="subdued"
          aria-hidden="true"
          data-test-subj={`dataGridHeaderCellSortIndicator-${id}`}
        />
      )}
    </>
  );

  return (
    <div
      role="columnheader"
      aria-colindex={columnIndex + 1}
      aria-label={headerAriaLabel}
      aria-sort={
        sortColumn ? (sortColumn.direction === 'asc' ? 'ascending' : 'descending') : undefined
      }
      tabIndex={isTabStop ? 0 : -1}
      data-test-subj={`dataGridHeaderCell-${id}`}
      data-gridcell-column-id={id}
      data-sticky-side={layout.sticky?.side}
      // The class of EuiDataGrid, for code that counts the control columns in the DOM.
      className={isControl ? 'euiDataGridHeaderCell--controlColumn' : undefined}
      css={[
        styles.headerCell,
        headerRowHeight !== 1 && styles.headerCellMultiline,
        hasMenu && styles.headerCellWithMenu,
        layout.sticky && styles.cellSticky,
        layout.sticky?.isEdge && styles.cellStickyEdge,
        isControl && styles.cellNoSelect,
        isControl && styles.cellControl,
        dragState === 'dragging' && styles.headerCellDragging,
        dragState === 'dropBefore' && styles.headerCellDropBefore,
        dragState === 'dropAfter' && styles.headerCellDropAfter,
      ]}
      style={getLayoutStyle(layout)}
      onKeyDown={onKeyDown}
      onPointerDown={isDraggable ? onPointerDown : undefined}
      data-drag-state={dragState}
      {...(isMenuOpen && { [CELL_ENTERED_ATTRIBUTE]: '' })}
    >
      {hasMenu ? (
        // The whole header opens the menu, there is no button to aim at.
        <button
          type="button"
          css={[
            styles.headerCellInteractive,
            headerRowHeight !== 1 && styles.headerCellInteractiveMultiline,
            isResizable && styles.headerCellInteractiveResizable,
          ]}
          aria-label={i18n.translate('kbnDataGrid.header.actionsButtonAriaLabel', {
            defaultMessage: '{title}. Click to view column header actions.',
            values: { title: displayAsText ?? id },
          })}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          data-test-subj={`dataGridHeaderCellActionButton-${id}`}
          onClick={toggleMenu}
        >
          {content}
        </button>
      ) : (
        content
      )}
      {hasMenu && isMenuOpen && (
        <HeaderCellMenu
          column={column}
          dataColumnIndex={dataColumnIndex}
          dataColumnCount={dataColumnCount}
          sorting={sorting}
          onMoveColumn={onMoveColumn}
          onHideColumn={onHideColumn}
          styles={styles}
          setIsOpen={setIsMenuOpen}
        />
      )}
      {isResizable && (
        <div
          role="presentation"
          data-kbn-data-grid-resize-handle=""
          onMouseDown={(event) => onStartResize(columnIndex, event)}
          onTouchStart={(event) => onStartResize(columnIndex, event)}
          onDoubleClick={() => onResetColumnWidth(columnIndex)}
          css={[styles.resizeHandle, isResizing && styles.resizeHandleActive]}
        />
      )}
    </div>
  );
};

export const DataGridHeaderCell = React.memo(
  DataGridHeaderCellComponent
) as typeof DataGridHeaderCellComponent;
