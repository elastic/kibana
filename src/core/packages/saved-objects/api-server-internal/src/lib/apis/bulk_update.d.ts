import { type SavedObjectsBulkUpdateObject, type SavedObjectsBulkUpdateOptions, type SavedObjectsBulkUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformUpdateParams<T = unknown> {
    objects: Array<SavedObjectsBulkUpdateObject<T>>;
    options: SavedObjectsBulkUpdateOptions;
}
export declare const performBulkUpdate: <T>({ objects, options }: PerformUpdateParams<T>, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsBulkUpdateResponse<T>>;
