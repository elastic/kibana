/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { set } from '@kbn/safer-lodash-set';
// import type { ServiceDefinition as ContentManagementServiceDefinition } from '@kbn/content-management-plugin/common';
import { getTransforms } from './content_management_services_versioning';

// Create an object at the specific path (e.g. "get.in.options") with the specific value
const setObjectValue = (path: string, value: unknown) => {
  const obj = {};
  set(obj, path, value);
  return obj;
};

const getVersionnableObjectTests = (path: string) => {
  return [
    {
      definition: setObjectValue(path, 123),
      expected: false,
      ref: 'versionable object is not an object',
    },
    {
      definition: setObjectValue(path, {
        up: 123,
      }),
      expected: false,
      ref: '"up" transform is not a function',
    },
    {
      definition: setObjectValue(path, {
        down: 123,
      }),
      expected: false,
      ref: '"down" transform is not a function',
    },
    {
      definition: setObjectValue(path, {
        schema: 123,
      }),
      expected: false,
      ref: '"schema" is not a valid validation Type',
    },
    {
      definition: setObjectValue(path, {
        schema: schema.object({
          foo: schema.string(),
        }),
        up: () => ({}),
        down: () => ({}),
      }),
      expected: true,
      ref: `valid versionable object [${path}]`,
    },
  ];
};

const getInvalidServiceObjectTests = () =>
  ['get', 'bulkGet', 'create', 'update', 'delete', 'search'].map((service) => ({
    definition: {
      [service]: {
        unknown: {},
      },
    },
    expected: false,
    ref: `invalid ${service}: unknown prop`,
  }));

describe('CM services getTransforms()', () => {
  describe('validation', () => {
    [
      {
        definition: { foo: 'bar', get: { in: { options: { up: () => ({}) } } } },
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
      ...getVersionnableObjectTests('search.in.query'),
      ...getVersionnableObjectTests('search.out.result'),
    ].forEach(({ definition, expected, ref }) => {
      test(`validate: ${ref}`, () => {
        if (expected === false) {
          expect(() => {
            getTransforms(definition, 1);
          }).toThrowError('Invalid content management services definition.');
        } else {
          expect(() => {
            getTransforms(definition, 1);
          }).not.toThrowError('Invalid content management services definition.');
        }
      });
    });
  });
});
