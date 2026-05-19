import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { DocViewRenderProps } from '../types';
/**
 * Payload for the `unified_doc_viewer_viewed` event.
 */
export interface DocViewerViewedEvent {
    /**
     * Document type of the originating top-level doc view; inherited by all nested views.
     */
    originDocType?: string;
    /**
     * Identifies which doc viewer content is being viewed.
     */
    contentId: string;
    /**
     * Active tab identifier within the main content.
     */
    tabId?: string;
}
/**
 * Parameters for reporting a doc viewer viewed event.
 */
export interface UseDocViewerViewedEventParams extends Pick<AnalyticsServiceStart, 'reportEvent'>, DocViewerViewedEvent {
    /**
     * Additional values that participate in the deduplication key for the event.
     */
    keys?: string[];
    /**
     * Enables or disables event reporting.
     */
    enabled?: boolean;
    /**
     * Initial deduplication key to seed the last reported event state.
     */
    initialEventKey?: string;
    /**
     * When true, the next event key change is recorded for deduplication
     * but not reported. This is useful when a component tree is being restored
     * and the initial render should not emit a duplicate event.
     */
    skipNextReport?: boolean;
    /**
     * Called after the deduplication key changes.
     */
    onEventKeyChange?: (eventKey: string) => void;
}
/**
 * Reports a viewed event for a doc viewer content area when its calculated event key changes.
 */
export declare const useDocViewerViewedEvent: ({ originDocType, contentId, tabId, keys, enabled, initialEventKey, skipNextReport, reportEvent, onEventKeyChange, }: UseDocViewerViewedEventParams) => void;
/**
 * Parameters for reporting a viewed event tied to the currently rendered doc viewer tab.
 */
export type UseDocViewerTabViewedEventParams = Omit<UseDocViewerViewedEventParams, 'contentId' | 'keys' | 'enabled'> & Pick<DocViewRenderProps, 'hit'>;
/**
 * Reports a viewed event for the active doc viewer tab.
 */
export declare const useDocViewerTabViewedEvent: ({ hit, ...params }: UseDocViewerTabViewedEventParams) => void;
/**
 * Parameters for reporting a viewed event tied to a span/log flyout.
 */
export type UseDocViewerSpanLogViewedEventParams = Omit<UseDocViewerViewedEventParams, 'keys' | 'enabled'> & {
    hit: DocViewRenderProps['hit'] | null;
};
/**
 * Reports a viewed event for a span/log flyout.
 * Deduplicates by including the span/log document id in the event key.
 */
export declare const useDocViewerSpanLogViewedEvent: ({ hit, ...params }: UseDocViewerSpanLogViewedEventParams) => void;
