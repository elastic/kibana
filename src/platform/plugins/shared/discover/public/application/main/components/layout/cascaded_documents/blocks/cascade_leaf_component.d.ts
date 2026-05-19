import React from 'react';
import { type EuiDataGridCustomBodyProps } from '@elastic/eui';
import { type UnifiedDataTableProps } from '@kbn/unified-data-table';
import { type DataCascadeRowCellProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ESQLDataGroupNode } from './types';
interface ESQLDataCascadeLeafCellProps extends Pick<UnifiedDataTableProps, 'dataGridDensityState' | 'showTimeCol' | 'dataView' | 'showKeyboardShortcuts' | 'externalCustomRenderers' | 'onUpdateDataGridDensity'>, Pick<Parameters<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']>[0], 'virtualizerController'> {
    cellData: DataTableRecord[];
    cellId: string;
    rowIndex: number;
}
interface CustomCascadeGridBodyProps extends EuiDataGridCustomBodyProps, Pick<ESQLDataCascadeLeafCellProps, 'virtualizerController'> {
    data: DataTableRecord[];
    isFullScreenMode?: boolean;
    cellId: string;
    rowIndex: number;
}
/**
 * A custom grid body implementation for the unified data table to be used in the cascade leaf cells
 * that allows for nested cascade virtualization that's compatible with the EUI Data Grid.
 */
export declare const CustomCascadeGridBodyMemoized: React.NamedExoticComponent<CustomCascadeGridBodyProps>;
export declare const ESQLDataCascadeLeafCell: React.MemoExoticComponent<({ cellData, cellId, dataGridDensityState, showTimeCol, dataView, externalCustomRenderers, virtualizerController, rowIndex, onUpdateDataGridDensity, }: ESQLDataCascadeLeafCellProps) => React.JSX.Element>;
export {};
