import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
interface SourceViewerProps {
    id: string;
    index: string | undefined;
    dataView: DataView;
    esqlHit?: DataTableRecord;
    width?: number;
    decreaseAvailableHeightBy?: number;
    onRefresh: () => void;
}
interface SourceViewerRestorableState {
    jsonValue: string;
    viewerScrollTop: number;
}
export declare const MIN_HEIGHT = 400;
export declare const DocViewerSource: React.ForwardRefExoticComponent<SourceViewerProps & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<SourceViewerRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
export {};
