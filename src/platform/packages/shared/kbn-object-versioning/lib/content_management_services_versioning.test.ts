/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { set } from '@kbn/safer-lodash-set';
import { get } from 'lodash';
import { getTransforms } from './content_management_services_versioning';
import type { ServiceDefinitionVersioned } from './content_management_types';

/**
 * Wrap the key with [] if it is a key from an Array
 * @param key The object key
 * @param isArrayItem Flag to indicate if it is the key of an Array
 */
const renderKey = (key: string, isArrayItem: boolean): string => (isArrayItem ? `[${key}]` : key);

const flattenObject = (
  obj: Record<any, any>,
  prefix: string[] = [],
  isArrayItem = false
): Record<any, any> =>
  Object.keys(obj).reduce<Record<any, any>>((acc, k) => {
    const nextValue = obj[k];

    if (typeof nextValue === 'object' && nextValue !== null) {
      const isNextValueArray = Array.isArray(nextValue);
      const dotSuffix = isNextValueArray ? '' : '.';

      if (Object.keys(nextValue).length > 0) {
        return {
          ...acc,
          ...flattenObject(
            nextValue,
            [...prefix, `${renderKey(k, isArrayItem)}${dotSuffix}`],
            isNextValueArray
          ),
        };
      }
    }

    const fullPath = `${prefix.join('')}${renderKey(k, isArrayItem)}`;
    acc[fullPath] = nextValue;

    return acc;
  }, {});

/**
 * Create an object and set a value at the specific path
 *
 * @param path The path where to create the object
 * @param value The value to set at the path
 * @returns An object with a value at the provided path
 */
const setObjectValue = (path: string, value: unknown) => {
  const obj = {};
  set(obj, path, value);
  return obj;
};

const wrapVersion = (obj: object, version = 1): object => ({
  [version]: obj,
});

/**
 * Get all the test cases for a versionable object at a specific path
 *
 * @param path The versionable object path (e.g. "get.in.options")
 * @returns A veresioned service definition
 */
const getVersionnableObjectTests = (path: string) => {
  return [
    {
      definitions: wrapVersion(setObjectValue(path, 123)),
      expected: false,
      ref: 'versionable object is not an object',
    },
    {
      definitions: wrapVersion(
        setObjectValue(path, {
          up: 123,
        })
      ),
      expected: false,
      ref: '"up" transform is not a function',
    },
    {
      definitions: wrapVersion(
        setObjectValue(path, {
          down: 123,
        })
      ),
      expected: false,
      ref: '"down" transform is not a function',
    },
    {
      definitions: wrapVersion(
        setObjectValue(path, {
          schema: 123,
        })
      ),
      expected: false,
      ref: '"schema" is not a valid validation Type',
    },
    {
      definitions: wrapVersion(
        setObjectValue(path, {
          schema: schema.object({
            foo: schema.string(),
          }),
          up: () => ({}),
          down: () => ({}),
        })
      ),
      expected: true,
      ref: `valid versionable object [${path}]`,
    },
  ];
};

// Get the tests to validate the services props
const getInvalidServiceObjectTests = () =>
  ['get', 'bulkGet', 'create', 'update', 'delete', 'search'].map((service) => ({
    definitions: {
      1: {
        [service]: {
          unknown: {},
        },
      },
    },
    expected: false,
    ref: `invalid ${service}: unknown prop`,
  }));

describe('CM services getTransforms()', () => {
  describe('validation', () => {
    [
      {
        definitions: 123,
        expected: false,
        ref: 'definition is not an object',
        error: 'Invalid service definition. Must be an object.',
      },
      // Test that each version is an integer
      {
        definitions: { a: {} },
        expected: false,
        ref: 'invalid version',
        error: 'Invalid version [a]. Must be an integer.',
      },
      {
        definitions: { '123a': {} },
        expected: false,
        ref: 'invalid version (2)',
        error: 'Invalid version [123a]. Must be an integer.',
      },
      {
        definitions: wrapVersion({ foo: 'bar', get: { in: { options: { up: () => ({}) } } } }),
        expected: false,
        ref: 'invalid root prop',
      },
      // Test that each service only accepts an "in" and "out" prop
      ...getInvalidServiceObjectTests(),
      // Test that each versionable object has a valid definition
      ...getVersionnableObjectTests('get.in.options'),
      ...getVersionnableObjectTests('get.out.result'),
      ...getVersionnableObjectTests('bulkGet.in.options'),
      ...getVersionnableObjectTests('bulkGet.out.result'),
      ...getVersionnableObjectTests('create.in.options'),
      ...getVersionnableObjectTests('create.in.data'),
      ...getVersionnableObjectTests('create.out.result'),
      ...getVersionnableObjectTests('update.in.options'),
      ...getVersionnableObjectTests('update.in.data'),
      ...getVersionnableObjectTests('update.out.result'),
      ...getVersionnableObjectTests('delete.in.options'),
      ...getVersionnableObjectTests('delete.out.result'),
      ...getVersionnableObjectTests('search.in.options'),
      ...getVersionnableObjectTests('search.out.result'),
    ].forEach(({ definitions, expected, ref, error = 'Invalid services definition.' }: any) => {
      test(`validate: ${ref}`, () => {
        if (expected === false) {
          expect(() => {
            getTransforms(definitions, 1);
          }).toThrowError(error);
        } else {
          expect(() => {
            getTransforms(definitions, 1);
          }).not.toThrow();
        }
      });
    });
  });

  describe('transforms', () => {
    describe('validate objects', () => {
      const setup = (definitions: ServiceDefinitionVersioned) => {
        const transforms = getTransforms(definitions, 1);

        // We flatten the object and extract the paths so we can later make sure that
        // each of them have "up()" and "down()" that are callable. Even if they simply proxy
        // the data that we send them in.
        const flattened = flattenObject(transforms);
        const paths = Object.keys(flattened);

        // Remove the last section of the path as that's where our ServiceObject is
        // e.g. path === "get.in.options.up" --> the versionable object is at "get.in.options"
        const serviceObjectPaths = paths.map((path) => {
          const index = path.lastIndexOf('.');
          if (index < 0) {
            throw new Error(`Invalid transforms [${JSON.stringify(transforms)}]`);
          }
          return path.substring(0, index);
        });

        return {
          transforms,
          serviceObjectPaths: [...new Set(serviceObjectPaths)],
        };
      };

      test('should return a ServiceObject for each of the CM services objects', () => {
        const { serviceObjectPaths } = setup({ 1: {} });
        expect(serviceObjectPaths.sort()).toEqual(
          [
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
          ].sort()
        );
      });

      test('each of the services objects must have a up, down and validate method', () => {
        const { transforms, serviceObjectPaths } = setup({ 1: {} });

        // Test every service object...
        serviceObjectPaths.forEach((path) => {
          const serviceObject = get(transforms, path);

          // We haven't passed any definition for any object. We still expect the
          // up(), down() methods to exist and to be callable
          const data = { foo: 'bar' };
          expect(serviceObject.up(data).value).toBe(data);
          expect(serviceObject.down(data).value).toBe(data);
        });
      });
    });

    describe('up/down transform & validation', () => {
      const definitions: ServiceDefinitionVersioned = {
        1: {
          get: {
            in: {
              options: {
                schema: schema.object({
                  version1: schema.string(),
                }),
                up: (pre: object) => ({ ...pre, version2: 'added' }),
              },
            },
            out: {
              result: {
                schema: schema.object({
                  version1: schema.string(),
                }),
              },
            },
          },
        },
        2: {
          get: {
            in: {
              options: {
                schema: schema.object({
                  version1: schema.string(),
                  version2: schema.string(),
                }),
                up: (pre: object) => ({ ...pre, version3: 'added' }),
              },
            },
            out: {
              result: {
                schema: schema.object({
                  version1: schema.string(),
                  version2: schema.string(),
                }),
                down: (pre: any) => {
                  const { version1 } = pre;
                  return { version1 };
                },
              },
            },
          },
        },
        3: {
          get: {
            out: {
              result: {
                schema: schema.object({
                  version1: schema.string(),
                  version2: schema.string(),
                  version3: schema.string(),
                }),
                down: (pre: any) => {
                  const { version1, version2 } = pre;
                  return { version1, version2 };
                },
              },
            },
          },
        },
      };

      test('should up transform an object', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);
        const initial = { version1: 'option version 1' };
        const upTransform = transforms.get.in.options.up(initial);
        expect(upTransform.value).toEqual({ ...initial, version2: 'added', version3: 'added' });
      });

      test('should validate object *before* up transform', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);
        const upTransform = transforms.get.in.options.up({ unknown: 'foo' });
        expect(upTransform.error?.message).toBe(
          '[version1]: expected value of type [string] but got [undefined]'
        );
      });

      test('should down transform an object', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);
        const downTransform = transforms.get.out.result.down({
          version1: 'foo',
          version2: 'bar',
          version3: 'superBar',
        });
        expect(downTransform.value).toEqual({ version1: 'foo' });
      });

      test('should validate object *before* down transform', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);

        // Implicitly down transform from "latest" version (which is version 3 in our case)
        const downTransform = transforms.get.out.result.down({
          version1: 'foo',
          version2: 'bar',
          version3: 123,
        });
        expect(downTransform.error?.message).toBe(
          '[version3]: expected value of type [string] but got [number]'
        );
      });

      test('should validate object *before* down transform (2)', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);

        // Explicitly down transform from version 1
        const downTransformFrom = 1;
        const downTransform = transforms.get.out.result.down({ version1: 123 }, downTransformFrom);
        expect(downTransform.error?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );
      });

      test('should expose a method to validate at the specific version', () => {
        const requestVersion = 1;
        const transforms = getTransforms(definitions, requestVersion);

        // Validate request version (1)
        expect(transforms.get.in.options.validate({ version1: 123 })?.message).toBe(
          '[version1]: expected value of type [string] but got [number]'
        );

        expect(transforms.get.in.options.validate({ version1: 'foo' })).toBe(null);

        // Validate version 2 schema
        expect(transforms.get.in.options.validate({ version1: 'foo' }, 2)?.message).toBe(
          '[version2]: expected value of type [string] but got [undefined]'
        );
      });
    });
  });
});
