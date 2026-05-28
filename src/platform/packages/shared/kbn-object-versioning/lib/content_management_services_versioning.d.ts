import type { ObjectMigrationDefinition, Version } from './types';
import type { ServiceDefinitionVersioned, ServiceTransforms } from './content_management_types';
/**
 * Convert a versionned service definition to a flattened service definition
 * where _each object_ is versioned (at the leaf).
 *
 * @example
 *
 * ```ts
 * From this
 * {
 *   // Service definition version 1
 *   1: {
 *     get: {
 *       in: {
 *         options: { up: () => {} }
 *       }
 *     },
 *     ...
 *   },
 *   // Service definition version 2
 *   2: {
 *     get: {
 *       in: {
 *         options: { up: () => {} }
 *       }
 *     },
 *   }
 * }
 *
 * To this
 *
 * {
 *   'get.in.options': { // Flattend path
 *      1: { up: () => {} }, // 1
 *      2: { up: () => {} }  // 2
 *    }
 * }
 * ```
 */
export declare const compile: (definitions: ServiceDefinitionVersioned) => {
    [path: string]: ObjectMigrationDefinition;
};
export declare const getTransforms: (definitions: ServiceDefinitionVersioned, requestVersion: Version, _compiled?: {
    [path: string]: ObjectMigrationDefinition;
}) => ServiceTransforms;
export type GetTransformsFn = typeof getTransforms;
