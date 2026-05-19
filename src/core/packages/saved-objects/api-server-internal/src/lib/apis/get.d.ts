import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformGetParams {
    type: string;
    id: string;
    options: SavedObjectsGetOptions;
}
export declare const performGet: <T>({ type, id, options }: PerformGetParams, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObject<T>>;
