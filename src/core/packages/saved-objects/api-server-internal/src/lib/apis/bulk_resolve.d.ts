import type { SavedObjectsBulkResolveObject, SavedObjectsBulkResolveResponse, SavedObjectsResolveOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
    objects: SavedObjectsBulkResolveObject[];
    options: SavedObjectsResolveOptions;
}
export declare const performBulkResolve: <T>({ objects, options }: PerformCreateParams<T>, apiExecutionContext: ApiExecutionContext) => Promise<SavedObjectsBulkResolveResponse<T>>;
