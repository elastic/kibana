/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '../types';
import { getProperty } from './get_property';

const MAPPINGS = {
  properties: {
    foo: {
      properties: {
        name: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
    bar: {
      properties: {
        baz: {
          type: 'text',
          fields: {
            box: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
} as const;

function runTest(key: string | string[], mapping: IndexMapping | SavedObjectsFieldMapping) {
  expect(typeof key === 'string' || Array.isArray(key)).toBeTruthy();
  expect(typeof mapping).toBe('object');

  expect(getProperty(MAPPINGS, key)).toBe(mapping);
}

describe('getProperty(mappings, path)', () => {
  describe('string key', () => {
    it('finds root properties', () => {
      runTest('foo', MAPPINGS.properties.foo);
    });
    it('finds nested properties', () => {
      runTest('foo.name', MAPPINGS.properties.foo.properties.name);
      runTest('foo.description', MAPPINGS.properties.foo.properties.description);
      runTest('bar.baz', MAPPINGS.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      runTest('bar.baz.box', MAPPINGS.properties.bar.properties.baz.fields.box);
    });
  });
  describe('array of string keys', () => {
    it('finds root properties', () => {
      runTest(['foo'], MAPPINGS.properties.foo);
    });
    it('finds nested properties', () => {
      runTest(['foo', 'name'], MAPPINGS.properties.foo.properties.name);
      runTest(['foo', 'description'], MAPPINGS.properties.foo.properties.description);
      runTest(['bar', 'baz'], MAPPINGS.properties.bar.properties.baz);
    });
    it('finds nested multi-fields', () => {
      runTest(['bar', 'baz', 'box'], MAPPINGS.properties.bar.properties.baz.fields.box);
    });
  });
});
