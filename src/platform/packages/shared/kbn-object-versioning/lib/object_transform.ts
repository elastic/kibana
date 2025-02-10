/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ObjectMigrationDefinition, ObjectTransform, Version } from './types';
import { validateObj, validateVersion } from './utils';

/**
 * Extract versions metadata from an object migration definition
 *
 * @param migrationDefinition The object migration definition
 * @returns Metadata about the versions (list of available, last supported, latest)
 */
const getVersionsMeta = (migrationDefinition: ObjectMigrationDefinition) => {
  const versions = Object.keys(migrationDefinition)
    .map((version) => {
      const { result, value } = validateVersion(version);
      if (!result) {
        throw new Error(`Invalid version number [${version}].`);
      }
      return value as number;
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
 * Get a list of pure functions to transform an object from one version
 * to another. Either "up" or "down" according if the "to" is > than the "from"
 *
 * @param from The version to start from
 * @param to The version to end to
 * @param migrationDefinition The object migration definition
 * @returns An array of transform functions
 */
const getTransformFns = <I = unknown, O = unknown>(
  from: Version,
  to: Version,
  migrationDefinition: ObjectMigrationDefinition
): Array<ObjectTransform<I, O>> => {
  const fns: Array<ObjectTransform<I, O>> = [];

  let i = from;
  let fn: ObjectTransform<I, O> | undefined;
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
  <UpIn = unknown, UpOut = unknown, DownIn = unknown, DownOut = unknown>(requestVersion: Version) =>
  (migrationDefinition: ObjectMigrationDefinition) => {
    const { latestVersion } = getVersionsMeta(migrationDefinition);
    const getVersion = (v: Version | 'latest'): Version => (v === 'latest' ? latestVersion : v);

    const validateFn = (value: unknown, version: number = requestVersion) => {
      const def = migrationDefinition[version];

      if (!def) {
        throw new Error(`Invalid version number [${version}].`);
      }

      const { schema } = def;

      if (schema) {
        return validateObj(value, schema);
      }
      return null;
    };

    return {
      up: <I = UpIn, O = UpOut>(
        obj: I,
        to: number | 'latest' = 'latest',
        { validate = true }: { validate?: boolean } = {}
      ) => {
        try {
          if (!migrationDefinition[requestVersion]) {
            return {
              error: new Error(`Unvalid version to up transform from [${requestVersion}].`),
              value: null,
            };
          }

          if (validate) {
            const error = validateFn(obj, requestVersion);
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

          const fns = getTransformFns<I, O>(requestVersion, targetVersion, migrationDefinition);

          const value = fns.reduce((acc, fn) => {
            const res = fn(acc as unknown as I);
            return res;
          }, obj as unknown as O);

          return { value, error: null };
        } catch (e) {
          return {
            value: null,
            error: new Error(`[Transform error] ${e.message ?? 'could not transform object'}.`),
          };
        }
      },
      down: <I = DownIn, O = DownOut>(
        obj: I,
        from: number | 'latest' = 'latest',
        { validate = true }: { validate?: boolean } = {}
      ) => {
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

          if (validate) {
            const error = validateFn(obj, fromVersion);
            if (error) {
              return { error, value: null };
            }
          }

          const fns = getTransformFns<I, O>(fromVersion, requestVersion, migrationDefinition);

          const value = fns.reduce((acc, fn) => {
            const res = fn(acc as unknown as I);
            return res;
          }, obj as unknown as O);

          return { value: value as any, error: null };
        } catch (e) {
          return {
            value: null,
            error: new Error(`[Transform error] ${e.message ?? 'could not transform object'}.`),
          };
        }
      },
      validate: validateFn,
    };
  };
