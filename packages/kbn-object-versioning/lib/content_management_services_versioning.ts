/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import { ObjectMigrationDefinition, Version, VersionableObject } from './types';
import type {
  ServiceDefinitionVersioned,
  ServicesDefinition,
  ServiceTransforms,
} from './content_management_types';
import { serviceDefinitionSchema } from './content_management_services_schemas';
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
  'search.in.options',
  'search.out.result',
  'mSearch.out.result',
];

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
export const compile = (
  definitions: ServiceDefinitionVersioned
): { [path: string]: ObjectMigrationDefinition } => {
  validateServiceDefinitions(definitions);

  const flattened: { [path: string]: ObjectMigrationDefinition } = {};

  Object.entries(definitions).forEach(([version, definition]: [string, ServicesDefinition]) => {
    serviceObjectPaths.forEach((path) => {
      const versionableObject: VersionableObject = get(definition, path) ?? {};

      const objectMigrationDefinition: ObjectMigrationDefinition = {
        ...(get(flattened, path) ?? {}),
        [version]: versionableObject,
      };

      flattened[path] = objectMigrationDefinition;
    });
  });

  return flattened;
};

const getDefaultTransforms = () => ({
  up: (input: any) => input,
  down: (input: any) => input,
  validate: () => null,
});

const getDefaultServiceTransforms = (): ServiceTransforms => ({
  get: {
    in: {
      options: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  bulkGet: {
    in: {
      options: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  create: {
    in: {
      options: getDefaultTransforms(),
      data: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  update: {
    in: {
      options: getDefaultTransforms(),
      data: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  delete: {
    in: {
      options: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  search: {
    in: {
      options: getDefaultTransforms(),
    },
    out: {
      result: getDefaultTransforms(),
    },
  },
  mSearch: {
    out: {
      result: getDefaultTransforms(),
    },
  },
});

export const getTransforms = (
  definitions: ServiceDefinitionVersioned,
  requestVersion: Version,
  _compiled?: { [path: string]: ObjectMigrationDefinition }
): ServiceTransforms => {
  // Compile the definition into a flattened object with ObjectMigrationDefinition
  const compiled = _compiled ?? compile(definitions);

  // Initiate transform for specific request version
  const transformsForRequest = getDefaultServiceTransforms();

  Object.entries(compiled).forEach(([path, objectMigrationDefinition]) => {
    const objectTransforms = initTransform(requestVersion)(objectMigrationDefinition);
    set(transformsForRequest, path, objectTransforms);
  });

  return transformsForRequest;
};

export type GetTransformsFn = typeof getTransforms;
