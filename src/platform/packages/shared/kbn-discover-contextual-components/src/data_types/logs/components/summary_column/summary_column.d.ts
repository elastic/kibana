import { DataGridDensity, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { type ShouldShowFieldInTableHandler } from '@kbn/discover-utils';
export interface SummaryColumnFactoryDeps {
    density: DataGridDensity | undefined;
    rowHeight: number | undefined;
    shouldShowFieldHandler: ShouldShowFieldInTableHandler;
    onFilter?: DocViewFilterFn;
    core: CoreStart;
    share?: SharePluginStart;
}
export type SummaryColumnProps = DataGridCellValueElementProps & {
    isTracesSummary?: boolean;
};
export type AllSummaryColumnProps = SummaryColumnProps & SummaryColumnFactoryDeps;
export declare const SummaryColumn: (props: AllSummaryColumnProps) => React.JSX.Element;
export default SummaryColumn;
export declare const SummaryCellPopover: (props: AllSummaryColumnProps) => React.JSX.Element;
