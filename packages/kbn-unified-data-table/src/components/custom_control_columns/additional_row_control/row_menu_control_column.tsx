/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { DataTableRowControl } from '../../data_table_row_control';
import type { RowControlColumn, RowControlProps } from '../../../types';
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
  const { euiTheme } = useEuiTheme();
  const [isMoreActionsPopoverOpen, setIsMoreActionsPopoverOpen] = useState<boolean>(false);

  const buttonLabel = i18n.translate('unifiedDataTable.grid.additionalRowActions', {
    defaultMessage: 'Additional actions',
  });

  const getControlComponent: (id: string) => React.FC<RowControlProps> = useCallback(
    (id) =>
      ({ 'data-test-subj': dataTestSubj, color, disabled, label, iconType, onClick }) => {
        return (
          <EuiContextMenuItem
            key={id}
            data-test-subj={dataTestSubj ?? `unifiedDataTable_remainingRowControl_${id}`}
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

  return (
    <EuiPopover
      id="remainingRowActionsPopover"
      button={
        <DataTableRowControl>
          <EuiToolTip content={buttonLabel} delay="long">
            <EuiButtonIcon
              size="xs"
              iconSize="s"
              aria-label={buttonLabel}
              data-test-subj={`unifiedDataTable_rowControl_${props.columnId}`}
              onClick={() => {
                setIsMoreActionsPopoverOpen(!isMoreActionsPopoverOpen);
              }}
              iconType="boxesVertical"
              color="text"
              css={css`
                margin-top: -${euiTheme.size.xs}; // to align with other controls
              `}
            />
          </EuiToolTip>
        </DataTableRowControl>
      }
      isOpen={isMoreActionsPopoverOpen}
      closePopover={() => setIsMoreActionsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        size="s"
        items={rowControlColumns.map((rowControlColumn) => {
          const Control = getControlComponent(rowControlColumn.id);
          return rowControlColumn.renderControl(Control, rowProps);
        })}
      />
    </EuiPopover>
  );
};

export const getRowMenuControlColumn = (
  rowControlColumns: RowControlColumn[]
): EuiDataGridControlColumn => {
  return {
    id: 'additionalRowControl_menuControl',
    width: 24,
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
