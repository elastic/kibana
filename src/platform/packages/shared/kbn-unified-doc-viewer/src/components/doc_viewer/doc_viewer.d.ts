import type { ComponentProps, ComponentRef, RefAttributes } from 'react';
import React from 'react';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { DocView, DocViewRenderProps } from '../../types';
export declare const INITIAL_TAB = "unifiedDocViewer:initialTab";
export interface InternalDocViewerApi {
    setSelectedTabId: (tabId: string) => void;
}
export interface InternalDocViewerProps extends DocViewRenderProps, RefAttributes<InternalDocViewerApi>, Pick<AnalyticsServiceStart, 'reportEvent'> {
    docViews: DocView[];
    initialTabId?: DocView['id'];
    onUpdateSelectedTabId?: (tabId: string | undefined) => void;
    originDocType?: string;
}
export declare const DocViewer: React.ForwardRefExoticComponent<Omit<Omit<Omit<InternalDocViewerProps, "ref"> & RefAttributes<InternalDocViewerApi>, "ref"> & {
    ref?: ((instance: InternalDocViewerApi | null) => void | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React.RefObject<InternalDocViewerApi> | null | undefined;
} & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<import("../../types").DocViewerRestorableState>, "initialState" | "onInitialStateChange">, "ref"> & RefAttributes<InternalDocViewerApi & import("@kbn/restorable-state").RestorableStateProviderApi>>;
export type DocViewerProps = ComponentProps<typeof DocViewer>;
export type DocViewerApi = ComponentRef<typeof DocViewer>;
