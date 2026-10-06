import type { Logger } from '@kbn/logging';
import type { SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { type Transform, type TransformFn, type TypeVersionSchema } from './types';
export declare const getModelVersionSchemas: ({ typeDefinition, }: {
    typeDefinition: SavedObjectsType;
}) => Record<string, TypeVersionSchema>;
export declare const getModelVersionTransforms: ({ typeDefinition, log, }: {
    typeDefinition: SavedObjectsType;
    log: Logger;
}) => Transform[];
export declare const convertModelVersionTransformFn: ({ typeDefinition, virtualVersion, modelVersion, modelVersionDefinition, log, }: {
    typeDefinition: SavedObjectsType;
    virtualVersion: string;
    modelVersion: number;
    modelVersionDefinition: SavedObjectsModelVersion;
    log: Logger;
}) => TransformFn;
