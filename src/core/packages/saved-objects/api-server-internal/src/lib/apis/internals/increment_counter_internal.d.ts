import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsIncrementCounterOptions, SavedObjectsIncrementCounterField } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from '../types';
export interface PerformIncrementCounterInternalParams<T = unknown> {
    type: string;
    id: string;
    counterFields: Array<string | SavedObjectsIncrementCounterField>;
    options: SavedObjectsIncrementCounterOptions<T>;
}
export declare const incrementCounterInternal: <T>({ type, id, counterFields, options }: PerformIncrementCounterInternalParams<T>, { registry, helpers, client, serializer }: ApiExecutionContext) => Promise<SavedObject<T>>;
