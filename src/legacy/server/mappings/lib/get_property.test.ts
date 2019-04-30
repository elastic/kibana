/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FieldMapping, IndexMapping } from '../types';
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
};

function runTest(key: string | string[], mapping: IndexMapping | FieldMapping) {
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
