import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { BehaviorSubject } from 'rxjs';
import { VIEW_MODE } from '../../../../../common/constants';
import type { SidebarToggleState } from '../../../types';
export interface DiscoverMainContentProps {
    dataView: DataView;
    viewMode: VIEW_MODE;
    onAddFilter: DocViewFilterFn | undefined;
    onFieldEdited: (options: {
        editedDataView: DataView;
        removedFieldName?: string;
    }) => Promise<void>;
    onDropFieldToTable?: () => void;
    columns: string[];
    sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
    isChartAvailable?: boolean;
}
export declare const DiscoverMainContent: ({ dataView, viewMode, onAddFilter, onFieldEdited, columns, onDropFieldToTable, sidebarToggleState$, isChartAvailable, }: DiscoverMainContentProps) => React.JSX.Element;
