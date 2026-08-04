import React from 'react';
import type { APIReturnType } from '@kbn/apm-api-shared';
import type { TraceItem, WaterfallGetErrorMarkerHref, WaterfallGetServiceBadgeHref } from '@kbn/apm-types';
type FocusedTrace = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>;
interface Props {
    items: FocusedTrace;
    isEmbeddable?: boolean;
    onErrorClick?: (params: {
        traceId: string;
        docId: string;
    }) => void;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
    getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
}
export declare function flattenChildren(children: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree']): TraceItem[];
export declare function reparentDocumentToRoot(items: FocusedTrace['traceItems']): import("@kbn/apm-types").FocusedTraceItems | undefined;
export declare function FocusedTraceWaterfall({ items, onErrorClick, isEmbeddable, getServiceBadgeHref, getErrorMarkerHref, }: Props): React.JSX.Element;
export {};
