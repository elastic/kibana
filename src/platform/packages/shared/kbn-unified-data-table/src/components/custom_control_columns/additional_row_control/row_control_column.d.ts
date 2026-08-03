import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { RowControlColumn, RowControlRowProps } from '@kbn/discover-utils';
export declare const RowControlCell: ({ rowControlColumn, ...props }: EuiDataGridCellValueElementProps & {
    rowControlColumn: RowControlColumn;
}) => React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export declare const getRowControlColumn: (rowControlColumn: RowControlColumn) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
/**
 * Returns a per-row getter backed by a WeakMap so `isAvailable` is evaluated at most once
 * per record across all consumers (inline slots and the overflow menu).
 */
export declare const createAvailableControlsGetter: (rowControlColumns: RowControlColumn[]) => ((rowProps: RowControlRowProps) => RowControlColumn[]);
/**
 * Creates all inline slot `RenderCellValue`s at once. Each slot picks the Kth action
 * from the per-row available list returned by `getAvailableControls`.
 */
export declare const getCompatibleSlotRenderers: (numSlots: number, getAvailableControls: (rowProps: RowControlRowProps) => RowControlColumn[]) => Array<(props: EuiDataGridCellValueElementProps) => React.ReactElement | null>;
