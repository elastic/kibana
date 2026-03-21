import type { RefAttributes } from 'react';
import React from 'react';
import type { DocView, DocViewRenderProps, DocViewerRestorableState } from '../../types';
export declare const INITIAL_TAB = "unifiedDocViewer:initialTab";
export interface DocViewerApi {
    setSelectedTabId: (tabId: string) => void;
}
export interface DocViewerProps extends DocViewRenderProps, RefAttributes<DocViewerApi> {
    docViews: DocView[];
    initialTabId?: DocView['id'];
    initialDocViewerState?: DocViewerRestorableState;
    onInitialDocViewerStateChange?: (state: DocViewerRestorableState) => void;
    onUpdateSelectedTabId?: (tabId: string | undefined) => void;
}
/**
 * Rendering tabs with different views of 1 Elasticsearch hit in Discover.
 * The tabs are provided by the `docs_views` registry.
 * A view can contain a React `component`, or any JS framework by using
 * a `render` function.
 */
export declare const DocViewer: React.ForwardRefExoticComponent<Omit<DocViewerProps, "ref"> & RefAttributes<DocViewerApi>>;
