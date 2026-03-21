import type { SavedObjectReference } from '@kbn/core/server';
import type { SerializedSearchSourceFields } from './types';
export declare const injectReferences: (searchSourceFields: SerializedSearchSourceFields & {
    indexRefName?: string;
}, references: SavedObjectReference[]) => SerializedSearchSourceFields;
