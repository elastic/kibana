import type { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
export declare const getAllIndices: ({ registry }: {
    registry: SavedObjectTypeRegistry;
}) => string[];
