import type { SavedObjectsResolveOptions, SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
    type: string;
    id: string;
    options: SavedObjectsResolveOptions;
}
export declare const performResolve: <T>({ type, id, options }: PerformCreateParams<T>, apiExecutionContext: ApiExecutionContext) => Promise<SavedObjectsResolveResponse<T>>;
