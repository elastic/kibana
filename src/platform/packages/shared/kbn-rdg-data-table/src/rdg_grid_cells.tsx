/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Cell content is the same as in `@kbn/tanstack-data-table`, so the grids differ only in the grid engine.

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useHeaderRowSelection, useRowSelection } from 'react-data-grid';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, RowControlProps } from '@kbn/discover-utils';
import type { DataSource } from '@kbn/data-source';
import { i18n } from '@kbn/i18n';
import {
  SourceDocument,
  SOURCE_COLUMN,
  type CustomCellRenderer,
  type DataGridCellValueElementProps,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';

export const ROW_INDICATOR_COL_WIDTH = 4;
export const SELECT_COL_WIDTH = 32;
export const CONTROL_COL_WIDTH = 24;
export const DEFAULT_COL_WIDTH = 180;
export const MIN_COL_WIDTH = 60;
const VISIBLE_ROW_LEADING_CONTROLS = 2;

/** Id of the expanded document; a context so toggling it re-renders only the controls cells. */
export const ExpandedDocIdContext = createContext<string | undefined>(undefined);

/** Wraps cell content with the test attributes the other grids put on their cells. */
export const CellContent = ({
  columnId,
  columnIndex,
  className,
  children,
}: {
  columnId: string;
  columnIndex: number;
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={className}
    data-test-subj="dataGridRowCell"
    data-gridcell-column-id={columnId}
    data-gridcell-column-index={columnIndex}
  >
    {children}
  </div>
);

export const filterNullFields = (row: DataTableRecord): DataTableRecord => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row.flattened)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return { ...row, flattened: filtered };
};

export const RowIndicatorCell = React.memo(function RowIndicatorCell({
  record,
  getRowIndicator,
}: {
  record: DataTableRecord;
  getRowIndicator: NonNullable<UnifiedDataTableProps['getRowIndicator']>;
}) {
  const { euiTheme } = useEuiTheme();
  const indicator = getRowIndicator(record, euiTheme);
  return (
    <div
      data-test-subj="unifiedDataTableRowColorIndicatorCell"
      title={indicator?.label}
      style={{
        width: ROW_INDICATOR_COL_WIDTH,
        height: '100%',
        background: indicator?.color ?? 'transparent',
      }}
    />
  );
});

export const SelectRowCell = ({
  record,
  rowIndex,
}: {
  record: DataTableRecord;
  rowIndex: number;
}) => {
  const { isRowSelected, onRowSelectionChange } = useRowSelection();
  return (
    <EuiCheckbox
      id={`rdg-select-${record.id}`}
      data-test-subj={`dscGridSelectDoc-${record.id}`}
      checked={isRowSelected}
      onChange={(event) =>
        onRowSelectionChange({
          row: record,
          checked: event.target.checked,
          isShiftClick: (event.nativeEvent as MouseEvent).shiftKey,
        })
      }
      aria-label={i18n.translate('discover.grid.rdg.selectRowLabel', {
        defaultMessage: 'Select row {rowNumber}',
        values: { rowNumber: rowIndex + 1 },
      })}
    />
  );
};

export const SelectAllHeaderCell = () => {
  const { isIndeterminate, isRowSelected, onRowSelectionChange } = useHeaderRowSelection();
  return (
    <EuiCheckbox
      id="rdg-select-all-rows"
      data-test-subj="selectAllDocsOnPageToggle"
      checked={isRowSelected}
      indeterminate={isIndeterminate}
      // Like the other grids, a partially selected page is cleared.
      onChange={() => onRowSelectionChange({ checked: !isRowSelected && !isIndeterminate })}
      aria-label={
        isRowSelected || isIndeterminate
          ? i18n.translate('discover.grid.rdg.deselectAllRowsOnPageLabel', {
              defaultMessage: 'Deselect all visible rows',
            })
          : i18n.translate('discover.grid.rdg.selectAllRowsOnPageLabel', {
              defaultMessage: 'Select all visible rows',
            })
      }
    />
  );
};

/** Number of row controls shown inline, like UnifiedDataTable's additional row control columns. */
export const getInlineRowControlSlots = (
  controls: UnifiedDataTableProps['rowAdditionalLeadingControls']
): number => {
  const count = controls?.length ?? 0;
  return count <= VISIBLE_ROW_LEADING_CONTROLS ? count : VISIBLE_ROW_LEADING_CONTROLS - 1;
};

const RowControlsMenu = ({
  controls,
  rowProps,
}: {
  controls: NonNullable<UnifiedDataTableProps['rowAdditionalLeadingControls']>;
  rowProps: { record: DataTableRecord; rowIndex: number };
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonLabel = i18n.translate('discover.grid.rdg.additionalRowActions', {
    defaultMessage: 'Additional actions',
  });
  const MenuItem = useMemo<React.FC<RowControlProps>>(
    () =>
      function RowControlMenuItem({
        'data-test-subj': dataTestSubj,
        color,
        disabled,
        label,
        iconType,
        onClick,
      }) {
        return (
          <EuiContextMenuItem
            data-test-subj={dataTestSubj}
            disabled={disabled}
            icon={iconType}
            color={color}
            onClick={() => {
              onClick?.(rowProps);
              setIsOpen(false);
            }}
          >
            {label}
          </EuiContextMenuItem>
        );
      },
    [rowProps]
  );

  return (
    <EuiPopover
      aria-label={buttonLabel}
      button={
        <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="unifiedDataTable_additionalRowControl_actionsMenu"
            size="xs"
            iconSize="s"
            iconType="ellipsis"
            color="text"
            aria-label={buttonLabel}
            onClick={() => setIsOpen((open) => !open)}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={controls.map((control) => (
          <React.Fragment key={control.id}>{control.render(MenuItem, rowProps)}</React.Fragment>
        ))}
      />
    </EuiPopover>
  );
};

/** Expand toggle plus profile-provided row controls. */
export const RowControlsCell = React.memo(function RowControlsCell({
  record,
  rowIndex,
  rowAdditionalLeadingControls,
  onToggleExpand,
}: {
  record: DataTableRecord;
  rowIndex: number;
  rowAdditionalLeadingControls: UnifiedDataTableProps['rowAdditionalLeadingControls'];
  onToggleExpand: (record: DataTableRecord) => void;
}) {
  const isExpanded = useContext(ExpandedDocIdContext) === record.id;
  const rowProps = useMemo(() => ({ record, rowIndex }), [record, rowIndex]);
  const toggleLabel = i18n.translate('discover.grid.rdg.toggleDocumentDetailsLabel', {
    defaultMessage: 'Toggle document details',
  });

  const Control = useMemo<React.FC<RowControlProps>>(
    () =>
      function RowControl({
        color,
        'data-test-subj': dataTestSubj,
        disabled,
        iconType,
        label,
        onClick,
        tooltipContent,
        ...controlProps
      }) {
        const button = (
          <EuiButtonIcon
            {...controlProps}
            aria-label={label}
            color={color ?? 'text'}
            data-test-subj={dataTestSubj}
            disabled={disabled}
            iconSize="s"
            iconType={iconType}
            size="xs"
            onClick={() => onClick?.(rowProps)}
          />
        );

        return tooltipContent ? <EuiToolTip content={tooltipContent}>{button}</EuiToolTip> : button;
      },
    [rowProps]
  );

  const availableControls =
    rowAdditionalLeadingControls?.filter((control) => control.isAvailable?.(rowProps) ?? true) ??
    [];
  const inlineSlots = getInlineRowControlSlots(rowAdditionalLeadingControls);
  const inlineControls = availableControls.slice(0, inlineSlots);
  const menuControls = availableControls.slice(inlineSlots);

  return (
    <>
      <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          size="xs"
          iconSize="s"
          aria-label={toggleLabel}
          data-test-subj={
            record.isAnchor ? 'docTableExpandToggleColumnAnchor' : 'docTableExpandToggleColumn'
          }
          onClick={() => onToggleExpand(record)}
          color={isExpanded ? 'primary' : 'text'}
          iconType={isExpanded ? 'minimize' : 'maximize'}
          isSelected={isExpanded}
        />
      </EuiToolTip>
      {inlineControls.map((control) => (
        <React.Fragment key={control.id}>{control.render(Control, rowProps)}</React.Fragment>
      ))}
      {menuControls.length > 0 && <RowControlsMenu controls={menuControls} rowProps={rowProps} />}
    </>
  );
});

export const SummaryCellContent = React.memo(function SummaryCellContent({
  row,
  dataView,
  shouldShowFieldHandler,
  fieldFormats,
  dataSource,
  isCompressed,
  maxEntries,
}: {
  row: DataTableRecord;
  dataView: DataView;
  maxEntries: number;
  shouldShowFieldHandler: (fieldName: string) => boolean;
  fieldFormats: UnifiedDataTableProps['services']['fieldFormats'];
  dataSource: DataSource | undefined;
  isCompressed: boolean;
}) {
  const filteredRow = useMemo(() => filterNullFields(row), [row]);
  return (
    <SourceDocument
      useTopLevelObjectColumns={false}
      row={filteredRow}
      columnId={SOURCE_COLUMN}
      dataView={dataView}
      shouldShowFieldHandler={shouldShowFieldHandler}
      maxEntries={maxEntries}
      fieldFormats={fieldFormats}
      dataSource={dataSource}
      isCompressed={isCompressed}
    />
  );
});

export const CustomDataCell = React.memo(function CustomDataCell({
  Renderer,
  row,
  rowIndex,
  columnId,
  colIndex,
  dataView,
  fieldFormats,
  dataSource,
  isCompressed,
}: {
  Renderer: CustomCellRenderer[string];
  row: DataTableRecord;
  rowIndex: number;
  columnId: string;
  colIndex: number;
  dataView: DataView;
  fieldFormats: DataGridCellValueElementProps['fieldFormats'];
  dataSource: DataSource | undefined;
  isCompressed: boolean;
}) {
  const [cellProps, setCellProps] = useState<
    Parameters<DataGridCellValueElementProps['setCellProps']>[0]
  >({});

  return (
    <span {...cellProps}>
      <Renderer
        row={row}
        rowIndex={rowIndex}
        columnId={columnId}
        colIndex={colIndex}
        dataView={dataView}
        fieldFormats={fieldFormats}
        dataSource={dataSource}
        isCompressed={isCompressed}
        isDetails={false}
        isExpandable={false}
        isExpanded={false}
        closePopover={() => {}}
        setCellProps={setCellProps}
      />
    </span>
  );
});
