import type { History } from 'history';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
interface SavedSearchAliasMatchRedirectProps {
    discoverSession?: DiscoverSession;
    spaces?: SpacesApi;
    history: History;
}
export declare const useSavedSearchAliasMatchRedirect: ({ discoverSession, spaces, history, }: SavedSearchAliasMatchRedirectProps) => void;
export {};
