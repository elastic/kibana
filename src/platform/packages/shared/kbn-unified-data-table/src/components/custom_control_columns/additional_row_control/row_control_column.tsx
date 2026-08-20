/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type {
  DataTableRecord,
  RowControlColumn,
  RowControlProps,
  RowControlRowProps,
} from '@kbn/discover-utils';
import { useControlColumn } from '../../../hooks/use_control_column';

export const RowControlCell = ({
  rowControlColumn,
  ...props
}: EuiDataGridCellValueElementProps & {
  rowControlColumn: RowControlColumn;
}) => {
  const { record, rowIndex } = useControlColumn(props);

  const Control: React.FC<RowControlProps> = useMemo(
    () =>
      ({
        'data-test-subj': dataTestSubj,
        color,
        disabled,
        iconType,
        label,
        onClick,
        tooltipContent,
        ...extraProps
      }) => {
        const classNameProp = Boolean(tooltipContent)
          ? {}
          : { className: 'unifiedDataTable__rowControl' };

        const control = (
          <EuiButtonIcon
            aria-label={label}
            color={color ?? 'text'}
            data-test-subj={dataTestSubj ?? `unifiedDataTable_rowControl_${rowControlColumn.id}`}
            disabled={disabled}
            iconSize="s"
            iconType={iconType}
            onClick={() => {
              if (record && onClick) {
                onClick({ record, rowIndex });
              }
            }}
            {...classNameProp}
            {...extraProps}
          />
        );

        if (tooltipContent) {
          return (
            <EuiToolTip anchorClassName="unifiedDataTable__rowControl" content={tooltipContent}>
              {control}
            </EuiToolTip>
          );
        }

        return control;
      },
    [rowControlColumn.id, record, rowIndex]
  );

  return record ? rowControlColumn.render(Control, { record, rowIndex }) : null;
};

export const getRowControlColumn = (rowControlColumn: RowControlColumn) => {
  return (props: EuiDataGridCellValueElementProps) => {
    return <RowControlCell {...props} rowControlColumn={rowControlColumn} />;
  };
};

/**
 * Returns a per-row getter backed by a WeakMap so `isAvailable` is evaluated at most once
 * per record across all consumers (inline slots and the overflow menu).
 */
export const createAvailableControlsGetter = (
  rowControlColumns: RowControlColumn[]
): ((rowProps: RowControlRowProps) => RowControlColumn[]) => {
  const cache = new WeakMap<DataTableRecord, RowControlColumn[]>();
  return ({ record, rowIndex }) => {
    let available = cache.get(record);
    if (!available) {
      available = rowControlColumns.filter(
        (col) => col.isAvailable?.({ record, rowIndex }) ?? true
      );
      cache.set(record, available);
    }
    return available;
  };
};

/**
 * Creates all inline slot `RenderCellValue`s at once. Each slot picks the Kth action
 * from the per-row available list returned by `getAvailableControls`.
 */
export const getCompatibleSlotRenderers = (
  numSlots: number,
  getAvailableControls: (rowProps: RowControlRowProps) => RowControlColumn[]
): Array<(props: EuiDataGridCellValueElementProps) => React.ReactElement | null> => {
  return Array.from({ length: numSlots }, (_, slotIndex) => {
    const CompatibleSlotCell = (props: EuiDataGridCellValueElementProps) => {
      const { record, rowIndex } = useControlColumn(props);
      if (!record) return null;
      const column = getAvailableControls({ record, rowIndex })[slotIndex];
      return column ? <RowControlCell {...props} rowControlColumn={column} /> : null;
    };
    return CompatibleSlotCell;
  });
};
