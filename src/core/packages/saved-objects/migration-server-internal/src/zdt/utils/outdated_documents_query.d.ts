import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
interface GetOutdatedDocumentsQueryOps {
    types: SavedObjectsType[];
}
export declare const getOutdatedDocumentsQuery: ({ types, }: GetOutdatedDocumentsQueryOps) => QueryDslQueryContainer;
export {};
