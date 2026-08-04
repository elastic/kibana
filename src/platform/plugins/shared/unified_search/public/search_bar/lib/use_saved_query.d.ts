import type { CoreStart } from '@kbn/core/public';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
interface UseSavedQueriesProps {
    queryService: DataPublicPluginStart['query'];
    notifications: CoreStart['notifications'];
    savedQueryId?: string;
}
interface UseSavedQueriesReturn {
    savedQuery?: SavedQuery;
    setSavedQuery: (savedQuery: SavedQuery) => void;
    clearSavedQuery: () => void;
}
export declare const useSavedQuery: (props: UseSavedQueriesProps) => UseSavedQueriesReturn;
export {};
