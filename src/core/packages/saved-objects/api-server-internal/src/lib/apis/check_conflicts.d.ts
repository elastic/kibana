import { type SavedObjectsCheckConflictsObject, type SavedObjectsBaseOptions, type SavedObjectsCheckConflictsResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCheckConflictsParams<T = unknown> {
    objects: SavedObjectsCheckConflictsObject[];
    options: SavedObjectsBaseOptions;
}
export declare const performCheckConflicts: <T>({ objects, options }: PerformCheckConflictsParams<T>, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsCheckConflictsResponse>;
