import { FilterStateStore } from '@kbn/es-query';
import type { BaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { QuerySetup, QueryStart } from '../query_service';
import type { QueryState } from '../query_state';
/**
 * Helper to setup two-way syncing of global data and a state container
 * @param QueryService: either setup or start
 * @param stateContainer to use for syncing
 */
export declare const connectToQueryState: <S extends QueryState>({ timefilter: { timefilter }, filterManager, queryString, state$, }: Pick<QueryStart | QuerySetup, "timefilter" | "filterManager" | "queryString" | "state$">, stateContainer: BaseStateContainer<S>, syncConfig: {
    time?: boolean;
    refreshInterval?: boolean;
    filters?: FilterStateStore | boolean;
    query?: boolean;
}) => () => void;
