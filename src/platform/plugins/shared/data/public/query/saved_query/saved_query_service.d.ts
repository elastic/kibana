import type { HttpStart } from '@kbn/core/public';
import type { SavedQuery } from './types';
import type { SavedQueryAttributes } from '../../../common';
export declare const createSavedQueryService: (http: HttpStart) => {
    isDuplicateTitle: (title: string, id?: string) => Promise<boolean>;
    createQuery: (attributes: SavedQueryAttributes, { overwrite }?: {
        overwrite?: boolean | undefined;
    }) => Promise<SavedQuery>;
    updateQuery: (id: string, attributes: SavedQueryAttributes) => Promise<SavedQuery>;
    findSavedQueries: (search?: string, perPage?: number, page?: number) => Promise<{
        total: number;
        queries: SavedQuery[];
    }>;
    getSavedQuery: (id: string) => Promise<SavedQuery>;
    deleteSavedQuery: (id: string) => Promise<{}>;
    getSavedQueryCount: () => Promise<number>;
};
