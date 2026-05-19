import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
    type: string;
    attributes: T;
    options: SavedObjectsCreateOptions;
}
export declare const performCreate: <T>({ type, attributes, options }: PerformCreateParams<T>, { registry, helpers, allowedTypes, client, serializer, migrator, extensions, }: ApiExecutionContext) => Promise<SavedObject<T>>;
