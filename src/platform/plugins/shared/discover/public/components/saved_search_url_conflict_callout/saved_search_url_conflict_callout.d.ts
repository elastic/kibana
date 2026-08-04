import type { History } from 'history';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
interface SavedSearchURLConflictCalloutProps {
    discoverSession?: DiscoverSession;
    spaces?: SpacesApi;
    history: History;
}
export declare const SavedSearchURLConflictCallout: ({ discoverSession, spaces, history, }: SavedSearchURLConflictCalloutProps) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | null;
export {};
