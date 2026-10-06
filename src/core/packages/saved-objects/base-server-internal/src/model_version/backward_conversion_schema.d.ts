import type { SavedObjectUnsanitizedDoc, SavedObjectModelVersionForwardCompatibilitySchema } from '@kbn/core-saved-objects-server';
export type ConvertedSchema = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
export declare const convertModelVersionBackwardConversionSchema: (schema: SavedObjectModelVersionForwardCompatibilitySchema) => ConvertedSchema;
