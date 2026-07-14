import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
export declare const mergeForUpdate: ({ targetAttributes, updatedAttributes, typeMappings, }: {
    targetAttributes: Record<string, any>;
    updatedAttributes: any;
    typeMappings: SavedObjectsTypeMappingDefinition;
}) => Record<string, any>;
