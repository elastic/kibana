import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { QuerySetup, QueryStart } from '../query_service';
/**
 * Helper to sync global query state {@link GlobalQueryStateFromUrl} with the URL (`_g` query param that is preserved between apps)
 * @param QueryService: either setup or start
 * @param kbnUrlStateStorage to use for syncing
 */
export declare const syncGlobalQueryStateWithUrl: (query: Pick<QueryStart | QuerySetup, "filterManager" | "timefilter" | "queryString" | "state$">, kbnUrlStateStorage: IKbnUrlStateStorage) => {
    stop: () => void;
    hasInheritedQueryFromUrl: boolean;
};
/**
 * @deprecated use {@link syncGlobalQueryStateWithUrl} instead
 */
export declare const syncQueryStateWithUrl: (query: Pick<QueryStart | QuerySetup, "filterManager" | "timefilter" | "queryString" | "state$">, kbnUrlStateStorage: IKbnUrlStateStorage) => {
    stop: () => void;
    hasInheritedQueryFromUrl: boolean;
};
