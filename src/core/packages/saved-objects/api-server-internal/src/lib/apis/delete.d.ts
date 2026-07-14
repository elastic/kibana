import type { SavedObjectsDeleteOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformDeleteParams<T = unknown> {
    type: string;
    id: string;
    options: SavedObjectsDeleteOptions;
}
export declare const performDelete: <T>({ type, id, options }: PerformDeleteParams<T>, { registry, helpers, allowedTypes, client, serializer, extensions, logger, mappings, }: ApiExecutionContext) => Promise<{}>;
