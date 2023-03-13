/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Type, ValidationError } from '@kbn/config-schema';
import { ObjectMigrationDefinition, ObjectTransform, ObjectTransforms, Version } from './types';

/**
 * Extract versions metadata from an object migration definition
 *
 * @param migrationDefinition The object migration definition
 * @returns Metadata about the versions (list of available, last supported, latest)
 */
const getVersionsMeta = (migrationDefinition: ObjectMigrationDefinition) => {
  const versions = Object.keys(migrationDefinition)
    .map((version) => {
      const parsed = parseInt(version, 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid version number [${version}].`);
      }
      return parsed;
    })
    .sort((a, b) => a - b);

  const latestVersion = versions[versions.length - 1];
  const lastSupportedVersion = versions[0];

  return {
    versions,
    lastSupportedVersion,
    latestVersion,
  };
};

/**
 * Validate an object based on a schema.
 *
 * @param obj The object to validate
 * @param objSchema The schema to validate the object against
 * @returns null or ValidationError
 */
const validateObj = (obj: unknown, objSchema?: Type<any>): ValidationError | null => {
  if (objSchema === undefined) {
    return null;
  }

  try {
    objSchema.validate(obj);
    return null;
  } catch (e: any) {
    return e as ValidationError;
  }
};

/**
 * Get a list of pure functions to transform an object from one version
 * to another. Either "up" or "down" according if the "to" is > than the "from"
 *
 * @param from The version to start from
 * @param to The version to end to
 * @param migrationDefinition The object migration definition
 * @returns An array of transform functions
 */
const getTransformFns = (
  from: Version,
  to: Version,
  migrationDefinition: ObjectMigrationDefinition
): ObjectTransform[] => {
  const fns: ObjectTransform[] = [];

  let i = from;
  let fn: ObjectTransform | undefined;
  if (to > from) {
    while (i <= to) {
      fn = migrationDefinition[i].up;
      if (fn) {
        fns.push(fn);
      }
      i++;
    }
  } else if (to < from) {
    while (i >= to) {
      fn = migrationDefinition[i].down;
      if (fn) {
        fns.push(fn);
      }
      i--;
    }
  }

  return fns;
};

/**
 * Initiate a transform for a specific request version. After we initiate the transforms
 * for a specific version we can then pass different `ObjectMigrationDefinition` to the provided
 * handler to start up/down transforming different object based on this request version.
 *
 * @example
 *
 * ```ts
 * const transforms = initTransform(2); // start from version "2"
 * const fooTransforms = transforms(fooMigrationDefinition);
 * const barTransforms = transforms(barMigrationDefinition);
 *
 * // Up transform the objects to the latest, starting from version "2"
 * const { value: fooOnLatest } = foo.up();
 * const { value: barOnLatest } = bar.up();
 * ```
 *
 * @param requestVersion The starting version before up/down transforming
 * @returns A handler to pass an object migration definition
 */
export const initTransform =
  (requestVersion: Version) =>
  (migrationDefinition: ObjectMigrationDefinition): ObjectTransforms => {
    const { latestVersion } = getVersionsMeta(migrationDefinition);

    const getVersion = (v: Version | 'latest'): Version => (v === 'latest' ? latestVersion : v);

    return {
      up: (obj, to = 'latest', { validate = true }: { validate?: boolean } = {}) => {
        try {
          if (!migrationDefinition[requestVersion]) {
            return {
              error: new Error(`Unvalid version to up transform from [${requestVersion}].`),
              value: null,
            };
          }

          if (validate && migrationDefinition[requestVersion].schema) {
            const error = validateObj(obj, migrationDefinition[requestVersion].schema!);
            if (error) {
              return { error, value: null };
            }
          }

          const targetVersion = getVersion(to);

          if (!migrationDefinition[targetVersion]) {
            return {
              error: new Error(`Unvalid version to up transform to [${to}].`),
              value: null,
            };
          }

          const fns = getTransformFns(requestVersion, targetVersion, migrationDefinition);

          const value = fns.reduce((acc, fn) => fn(acc), obj);
          return { value, error: null };
        } catch (e) {
          return {
            value: null,
            error: new Error(`[Transform error] ${e.message ?? 'could not transform object'}.`),
          };
        }
      },
      down: (obj, from = 'latest', { validate = true }: { validate?: boolean } = {}) => {
        try {
          if (!migrationDefinition[requestVersion]) {
            return {
              error: new Error(`Unvalid version to down transform to [${requestVersion}].`),
              value: null,
            };
          }

          const fromVersion = getVersion(from);

          if (!migrationDefinition[fromVersion]) {
            return {
              error: new Error(`Unvalid version to down transform from [${from}].`),
              value: null,
            };
          }

          const fns = getTransformFns(fromVersion, requestVersion, migrationDefinition);
          const value = fns.reduce((acc, fn) => fn(acc), obj);

          if (validate && migrationDefinition[requestVersion].schema) {
            const error = validateObj(value, migrationDefinition[requestVersion].schema!);
            if (error) {
              return { error, value: null };
            }
          }

          return { value, error: null };
        } catch (e) {
          return {
            value: null,
            error: new Error(`[Transform error] ${e.message ?? 'could not transform object'}.`),
          };
        }
      },
    };
  };
