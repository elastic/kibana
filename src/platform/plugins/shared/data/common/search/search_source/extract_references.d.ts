import type { SavedObjectReference } from '@kbn/core/server';
import type { SerializedSearchSourceFields } from './types';
export declare const extractReferences: (state: SerializedSearchSourceFields, options?: {
    refNamePrefix?: string;
}) => [SerializedSearchSourceFields, SavedObjectReference[]];
