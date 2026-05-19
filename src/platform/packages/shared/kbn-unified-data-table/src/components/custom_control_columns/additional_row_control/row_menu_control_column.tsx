/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RowControlColumn, RowControlProps } from '@kbn/discover-utils';
import { useControlColumn } from '../../../hooks/use_control_column';

/**
 * Menu button under which all other additional row controls would be placed
 */
export const RowMenuControlCell = ({
  rowControlColumns,
  startIndex = 0,
  ...props
}: EuiDataGridCellValueElementProps & {
  rowControlColumns: RowControlColumn[];
  /** When set, filters by `isAvailable` per-row and slices from this index. */
  startIndex?: number;
}) => {
  const { record, rowIndex } = useControlColumn(props);
  const [isMoreActionsPopoverOpen, setIsMoreActionsPopoverOpen] = useState<boolean>(false);

  const buttonLabel = i18n.translate('unifiedDataTable.grid.additionalRowActions', {
    defaultMessage: 'Additional actions',
  });

  const getControlComponent: (id: string) => React.FC<RowControlProps> = useCallback(
    (id) =>
      ({ 'data-test-subj': dataTestSubj, color, disabled, label, iconType, onClick }) => {
        return (
          <EuiContextMenuItem
            data-test-subj={dataTestSubj ?? `unifiedDataTable_rowMenu_${id}`}
            disabled={disabled}
            icon={iconType}
            color={color}
            onClick={() => {
              if (record) {
                onClick?.({ record, rowIndex });
              }
              setIsMoreActionsPopoverOpen(false);
            }}
          >
            {label}
          </EuiContextMenuItem>
        );
      },
    [record, rowIndex]
  );

  const popoverMenuItems = useMemo(() => {
    const rowProps = record ? { record, rowIndex } : null;
    const visibleColumns = rowControlColumns
      .filter((col) => !rowProps || (col.isAvailable?.(rowProps) ?? true))
      .slice(startIndex);

    return visibleColumns.map((rowControlColumn) => {
      const Control = getControlComponent(rowControlColumn.id);
      return (
        <Fragment key={rowControlColumn.id}>
          {rowProps ? rowControlColumn.render(Control, rowProps) : null}
        </Fragment>
      );
    });
  }, [rowControlColumns, startIndex, getControlComponent, record, rowIndex]);

  if (!popoverMenuItems.length) return null;

  return (
    <EuiPopover
      id={`rowMenuActionsPopover_${props.rowIndex}`}
      className="unifiedDataTable__rowControl"
      aria-label={buttonLabel}
      button={
        <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={`unifiedDataTable_additionalRowControl_${props.columnId}Menu`}
            iconSize="s"
            iconType="boxesVertical"
            color="text"
            aria-label={buttonLabel}
            onClick={() => {
              setIsMoreActionsPopoverOpen(!isMoreActionsPopoverOpen);
            }}
          />
        </EuiToolTip>
      }
      isOpen={isMoreActionsPopoverOpen}
      closePopover={() => setIsMoreActionsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={popoverMenuItems} />
    </EuiPopover>
  );
};

export const getRowMenuControlColumn = (
  rowControlColumns: RowControlColumn[],
  startIndex?: number
) => {
  return (props: EuiDataGridCellValueElementProps) => {
    return (
      <RowMenuControlCell
        {...props}
        rowControlColumns={rowControlColumns}
        startIndex={startIndex}
      />
    );
  };
};
