import { type SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsIncrementCounterField, SavedObjectsIncrementCounterOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformIncrementCounterParams<T = unknown> {
    type: string;
    id: string;
    counterFields: Array<string | SavedObjectsIncrementCounterField>;
    options: SavedObjectsIncrementCounterOptions<T>;
}
export declare const performIncrementCounter: <T>({ type, id, counterFields, options }: PerformIncrementCounterParams<T>, apiExecutionContext: ApiExecutionContext) => Promise<SavedObject<T>>;
