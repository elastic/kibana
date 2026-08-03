import React from 'react';
import { type Observable } from 'rxjs';
import { SearchSessionState } from '@kbn/data-plugin/public';
interface BackgroundSearchRestoredCalloutProps {
    /**
     * Indicates whether the current query is an ES|QL query. Used for styling purposes.
     */
    isESQLQuery?: boolean;
    /**
     * Observable that emits the current SearchSessionState to drive the callout visibility.
     */
    state$: Observable<SearchSessionState>;
}
/**
 * Displays a sticky callout when a search session was restored (cached background search).
 *
 * The callout becomes visible when the session transitions to Restored and remains visible
 * for the Restored / BackgroundLoading states until a non-background state appears.
 *
 * @param props Component props.
 */
export declare function BackgroundSearchRestoredCallout(props: BackgroundSearchRestoredCalloutProps): React.JSX.Element | null;
export {};
