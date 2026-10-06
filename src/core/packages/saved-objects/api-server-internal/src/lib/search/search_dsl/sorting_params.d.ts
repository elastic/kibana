import type { SortOrder, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server/src/apis';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
export declare function getSortingParams(mappings: IndexMapping, type: string | string[], sortField?: string, sortOrder?: SortOrder, pit?: SavedObjectsPitParams): {
    sort?: SortCombinations[];
};
