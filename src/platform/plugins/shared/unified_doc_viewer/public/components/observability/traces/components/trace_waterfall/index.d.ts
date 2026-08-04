import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { TraceDocFlyoutType } from '../../common/types';
interface Props {
    traceId: string;
    docId?: string;
    serviceName?: string;
    dataView: DocViewRenderProps['dataView'];
    ebtDetail?: 'spanDoc' | 'logDoc';
}
export interface TraceWaterfallRestorableState {
    restoredTraceId: string | null;
    showFullScreenWaterfall: boolean;
    activeFlyoutType: TraceDocFlyoutType | null;
    activeSection: 'errors-table' | undefined;
    activeDocId: string | null;
    activeDocIndex: string | undefined;
}
export declare const fullScreenButtonLabel: string;
export declare const TraceWaterfall: React.ForwardRefExoticComponent<Props & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<TraceWaterfallRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
export {};
