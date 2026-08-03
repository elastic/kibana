import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
export interface ContextAppProps {
    dataView: DataView;
    anchorId: string;
    referrer?: string;
    addFilter: DocViewFilterFn;
    expandedDoc: DataTableRecord | undefined;
    initialDocViewerTabId: string | undefined;
    docViewerRef: React.RefObject<DocViewerApi>;
    setExpandedDoc: (doc: DataTableRecord | undefined, options?: {
        initialTabId?: string;
    }) => void;
}
export declare const ContextApp: ({ dataView, anchorId, referrer, addFilter, expandedDoc, initialDocViewerTabId, docViewerRef, setExpandedDoc, }: ContextAppProps) => React.JSX.Element;
