/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { ServicesDefinition, ServiceTransforms } from './content_management_types';
import { serviceDefinitionSchema } from './content_management_services_schemas';

import { ObjectMigrationDefinition, Version, VersionableObject } from './types';
import { validateObj, validateVersion } from './utils';
import { initTransform } from './object_transform';

const serviceObjectPaths = [
  'get.in.options',
  'get.out.result',
  'bulkGet.in.options',
  'bulkGet.out.result',
  'create.in.options',
  'create.in.data',
  'create.out.result',
  'update.in.options',
  'update.in.data',
  'update.out.result',
  'delete.in.options',
  'delete.out.result',
  'search.in.query',
  'search.in.options',
  'search.out.result',
];

export interface ServiceDefinitionVersioned {
  [version: Version]: ServicesDefinition;
}

const validateServiceDefinitions = (definitions: ServiceDefinitionVersioned) => {
  if (definitions === null || Array.isArray(definitions) || typeof definitions !== 'object') {
    throw new Error('Invalid service definition. Must be an object.');
  }

  if (Object.keys(definitions).length === 0) {
    throw new Error('At least one version must be defined.');
  }

  Object.entries(definitions).forEach(([version, definition]) => {
    const { result: isVersionValid } = validateVersion(version);

    if (!isVersionValid) {
      throw new Error(`Invalid version [${version}]. Must be an integer.`);
    }

    const error = validateObj(definition, serviceDefinitionSchema);
    if (error !== null) {
      throw new Error(`Invalid services definition. [${error}]`);
    }
  });
};

export const getTransforms = (
  definitions: ServiceDefinitionVersioned,
  requestVersion: Version
): ServiceTransforms => {
  validateServiceDefinitions(definitions);

  const serviceDefinitionWithVersionableObjects = {};

  /**
   * Convert a versionned service definition to a single service definition
   * where _each object_ is versioned (at the leaf).
   *
   * @example
   *
   * ```ts
   * From this
   * {
   *   1: {
   *     get: {
   *       in: {
   *         options: { up: () => {} }
   *       }
   *     }
   *   },
   *   2: { ... }
   * }
   *
   * To this
   *
   * {
   *   get: {
   *     in: {
   *       options: {
   *         1: { up: () => {} },
   *         2: { up: () => {} }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  Object.entries(definitions).forEach(([version, definition]: [string, ServicesDefinition]) => {
    serviceObjectPaths.forEach((path) => {
      const versionableObject: VersionableObject = get(definition, path) ?? {};

      const objectMigrationDefinition: ObjectMigrationDefinition = {
        ...(get(serviceDefinitionWithVersionableObjects, path) ?? {}),
        [version]: versionableObject,
      };

      set(serviceDefinitionWithVersionableObjects, path, objectMigrationDefinition);
    });
  });

  // Initiate transform for specific request version
  const transformForCurrentRequest = {};

  serviceObjectPaths.forEach((path) => {
    const versionableObject: ObjectMigrationDefinition = get(
      serviceDefinitionWithVersionableObjects,
      path
    );
    const objectTransforms = initTransform(requestVersion)(versionableObject);
    set(transformForCurrentRequest, path, objectTransforms);
  });

  return transformForCurrentRequest as ServiceTransforms;
};
