import type { TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { SavedQuery, SavedQueryAttributes } from '../../../common/types';
export type SavedQueryTimeFilter = TimeRange & {
    refreshInterval: RefreshInterval;
};
export type { SavedQuery, SavedQueryAttributes };
export interface SavedQueryService {
    isDuplicateTitle: (title: string, id?: string) => Promise<boolean>;
    createQuery: (attributes: SavedQueryAttributes) => Promise<SavedQuery>;
    updateQuery: (id: string, attributes: SavedQueryAttributes) => Promise<SavedQuery>;
    findSavedQueries: (searchText?: string, perPage?: number, activePage?: number) => Promise<{
        total: number;
        queries: SavedQuery[];
    }>;
    getSavedQuery: (id: string) => Promise<SavedQuery>;
    deleteSavedQuery: (id: string) => Promise<{}>;
    getSavedQueryCount: () => Promise<number>;
}
