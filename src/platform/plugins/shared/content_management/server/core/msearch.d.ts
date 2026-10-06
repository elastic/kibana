import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MSearchResult, SearchQuery } from '../../common';
import type { ContentRegistry } from './registry';
import type { StorageContext } from './types';
export declare class MSearchService {
    private readonly deps;
    constructor(deps: {
        getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
        contentRegistry: ContentRegistry;
        getConfig: {
            listingLimit: () => Promise<number>;
            perPage: () => Promise<number>;
        };
    });
    search(contentTypes: Array<{
        contentTypeId: string;
        ctx: StorageContext;
    }>, query: SearchQuery): Promise<MSearchResult>;
}
