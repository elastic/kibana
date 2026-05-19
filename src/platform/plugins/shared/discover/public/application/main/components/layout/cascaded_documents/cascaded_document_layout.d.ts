import React from 'react';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { useEsqlDataCascadeRowActionHelpers } from './blocks/use_row_header_components';
export interface ESQLDataCascadeProps extends Pick<UnifiedDataTableProps, 'rows' | 'columns' | 'dataGridDensityState' | 'showTimeCol' | 'dataView' | 'showKeyboardShortcuts' | 'externalCustomRenderers' | 'onUpdateDataGridDensity'> {
    togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'];
    queryMeta: ESQLStatsQueryMeta;
}
export type CascadedDocumentsLayoutProps = Omit<ESQLDataCascadeProps, 'togglePopover' | 'queryMeta'>;
export declare const CascadedDocumentsLayout: React.MemoExoticComponent<({ dataView, ...props }: CascadedDocumentsLayoutProps) => React.JSX.Element>;
