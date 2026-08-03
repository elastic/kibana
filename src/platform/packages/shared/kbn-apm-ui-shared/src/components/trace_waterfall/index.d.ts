import type { EuiAccordionProps } from '@elastic/eui';
import type { Error, IWaterfallGetRelatedErrorsHref, TraceItem, WaterfallGetErrorMarkerHref, WaterfallGetServiceBadgeHref } from '@kbn/apm-types';
import React from 'react';
import type { OnErrorClick, OnNodeClick } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
/** Base props shared by all TraceWaterfall variants */
interface BaseTraceWaterfallProps {
    traceItems: TraceItem[];
    errors?: Error[];
    showAccordion?: boolean;
    onClick?: OnNodeClick;
    /** Called when an error badge on a waterfall row is clicked. Receives the trace/span context needed to navigate to or open the error. */
    onErrorClick?: OnErrorClick;
    scrollElement?: Element;
    /** Builds the href for the "related errors" link on a waterfall row error badge. Receives the span/transaction doc ID and returns a URL string. */
    getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
    /** Builds the href for the error message link in the timeline error marker popover.
     * Receives the service name and error grouping key and returns a URL to the error group detail page.
     * When provided, the error message in the popover renders as a real anchor link; otherwise falls back to the onErrorClick callback or plain text. */
    getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
    isEmbeddable?: boolean;
    showLegend?: boolean;
    serviceName?: string;
    isFiltered?: boolean;
    agentMarks?: Record<string, number>;
    showCriticalPathControl?: boolean;
    showCriticalPath?: boolean;
    defaultShowCriticalPath?: boolean;
    onShowCriticalPathChange?: (value: boolean) => void;
    children?: React.ReactNode;
    entryTransactionId?: string;
    traceDocsTotal?: number;
    maxTraceItems?: number;
    discoverHref?: string;
    ebt?: {
        row: {
            element: string;
        };
        errorBadge: {
            element: string;
        };
        serviceBadge: {
            element: string;
        };
    };
}
/** Default: 'window' (page scroll). Use 'parent' for flyout. */
export type TraceWaterfallProps = BaseTraceWaterfallProps & ({
    scrollStrategy?: 'window';
    contextSpanIds?: string[];
} | {
    scrollStrategy: 'parent';
    contextSpanIds?: string[];
    scrollToContextOnMount?: boolean;
});
export declare function TraceWaterfall(props: TraceWaterfallProps): React.JSX.Element;
export declare function convertTreeToList(treeMap: Record<string, TraceWaterfallItem[]>, accordionsState: Record<string, EuiAccordionProps['forceState']>, root?: TraceWaterfallItem): TraceWaterfallItem[];
export {};
