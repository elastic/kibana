import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SurrDocType } from '../services/context';
import type { ContextFetchState } from '../services/context_query_state';
import type { AppState } from '../services/context_state';
export interface ContextAppFetchProps {
    anchorId: string;
    dataView: DataView;
    appState: AppState;
}
export declare function useContextAppFetch({ anchorId, dataView, appState }: ContextAppFetchProps): {
    fetchedState: ContextFetchState;
    fetchAllRows: () => Promise<[PromiseSettledResult<void>, PromiseSettledResult<void>] | undefined>;
    fetchContextRows: (anchor?: DataTableRecord) => Promise<[PromiseSettledResult<void>, PromiseSettledResult<void>]>;
    fetchSurroundingRows: (type: SurrDocType, fetchedAnchor?: DataTableRecord) => Promise<void>;
    resetFetchedState: () => void;
};
