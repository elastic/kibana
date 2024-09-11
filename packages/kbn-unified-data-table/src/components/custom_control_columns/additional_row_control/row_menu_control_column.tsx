/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { DataTableRowControl, Size } from '../../data_table_row_control';
import type { RowControlColumn, RowControlProps } from '../../../types';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { useControlColumn } from '../../../hooks/use_control_column';

/**
 * Menu button under which all other additional row controls would be placed
 */
export const RowMenuControlCell = ({
  rowControlColumns,
  ...props
}: EuiDataGridCellValueElementProps & {
  rowControlColumns: RowControlColumn[];
}) => {
  const rowProps = useControlColumn(props);
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
              onClick?.(rowProps);
              setIsMoreActionsPopoverOpen(false);
            }}
          >
            {label}
          </EuiContextMenuItem>
        );
      },
    [rowProps, setIsMoreActionsPopoverOpen]
  );

  const popoverMenuItems = useMemo(
    () =>
      rowControlColumns.map((rowControlColumn) => {
        const Control = getControlComponent(rowControlColumn.id);
        return (
          <Fragment key={rowControlColumn.id}>
            {rowControlColumn.renderControl(Control, rowProps)}
          </Fragment>
        );
      }),
    [rowControlColumns, rowProps, getControlComponent]
  );

  return (
    <EuiPopover
      id={`rowMenuActionsPopover_${props.rowIndex}`}
      button={
        <DataTableRowControl size={Size.normal}>
          <EuiToolTip content={buttonLabel} delay="long">
            <EuiButtonIcon
              data-test-subj={`unifiedDataTable_${props.columnId}`}
              iconSize="s"
              iconType="boxesVertical"
              color="text"
              aria-label={buttonLabel}
              css={css`
                .euiDataGridRowCell__content--defaultHeight & {
                  margin-top: 2px; // to align with other controls
                }
              `}
              onClick={() => {
                setIsMoreActionsPopoverOpen(!isMoreActionsPopoverOpen);
              }}
            />
          </EuiToolTip>
        </DataTableRowControl>
      }
      isOpen={isMoreActionsPopoverOpen}
      closePopover={() => setIsMoreActionsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={popoverMenuItems} />
    </EuiPopover>
  );
};

export const getRowMenuControlColumn = (
  rowControlColumns: RowControlColumn[]
): EuiDataGridControlColumn => {
  return {
    id: 'additionalRowControl_menuControl',
    width: DEFAULT_CONTROL_COLUMN_WIDTH,
    headerCellRender: () => (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('unifiedDataTable.additionalActionsColumnHeader', {
            defaultMessage: 'Additional actions column',
          })}
        </span>
      </EuiScreenReaderOnly>
    ),
    rowCellRender: (props) => {
      return <RowMenuControlCell {...props} rowControlColumns={rowControlColumns} />;
    },
  };
};
