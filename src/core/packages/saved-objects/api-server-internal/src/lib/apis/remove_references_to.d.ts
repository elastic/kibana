import type { SavedObjectsRemoveReferencesToOptions, SavedObjectsRemoveReferencesToResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformRemoveReferencesToParams {
    type: string;
    id: string;
    options: SavedObjectsRemoveReferencesToOptions;
}
export declare const performRemoveReferencesTo: <T>({ type, id, options }: PerformRemoveReferencesToParams, { registry, helpers, client, mappings, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsRemoveReferencesToResponse>;
