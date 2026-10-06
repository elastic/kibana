/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare const getTransforms: (
  definitions: ServiceDefinitionVersioned,
  requestVersion: Version,
  _compiled?: {
    [path: string]: ObjectMigrationDefinition;
  }
) => ServiceTransforms;
export type GetTransformsFn = typeof getTransforms;
