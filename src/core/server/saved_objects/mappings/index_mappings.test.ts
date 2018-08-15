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

import Chance from 'chance';

import { IndexMappings } from './index_mappings';
import { getRootType } from './lib';

const chance = new Chance();

describe('saved objects index mapping', () => {
  describe('constructor', () => {
    it('initializes with a default mapping when no args', () => {
      const mapping = new IndexMappings();
      const dsl = mapping.getDsl();
      expect(typeof dsl).toBe('object');
      expect(typeof getRootType(dsl)).toBe('string');
      expect(typeof dsl[getRootType(dsl)]).toBe('object');
    });

    it('accepts a default mapping dsl as the only argument', () => {
      const mapping = new IndexMappings({
        foobar: {
          dynamic: false,
          properties: {},
        },
      });

      expect(mapping.getDsl()).toEqual({
        foobar: {
          dynamic: false,
          properties: {},
        },
      });
    });

    it('throws if root type is of type=anything-but-object', () => {
      expect(() => {
        // tslint:disable-next-line:no-unused-expression
        new IndexMappings({
          root: {
            type: chance.pickone(['string', 'keyword', 'geo_point']),
          },
        });
      }).toThrowError(/not an object/);
    });

    it('throws if root type has no type and no properties', () => {
      expect(() => {
        // tslint:disable-next-line:no-unused-expression
        new IndexMappings({
          root: {},
        });
      }).toThrowError(/not an object/);
    });

    it('initialized root type with properties object if not set', () => {
      const mapping = new IndexMappings({
        root: {
          type: 'object',
        },
      });

      expect(mapping.getDsl()).toEqual({
        root: {
          type: 'object',
          properties: {},
        },
      });
    });

    it('accepts an array of new extensions that will be added to the mapping', () => {
      const initialMapping = {
        x: { properties: {} },
      };
      const extensions = [
        {
          properties: {
            y: {
              properties: {
                z: {
                  type: 'text',
                },
              },
            },
          },
        },
      ];

      const mapping = new IndexMappings(initialMapping, extensions);
      expect(mapping.getDsl()).toEqual({
        x: {
          properties: {
            y: {
              properties: {
                z: {
                  type: 'text',
                },
              },
            },
          },
        },
      });
    });

    it('throws if any of the new properties conflict', () => {
      const initialMapping = {
        root: { properties: { foo: { type: 'string' } } },
      };
      const extensions = [
        {
          properties: {
            foo: { type: 'string' },
          },
        },
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions); // tslint:disable-line:no-unused-expression
      }).toThrowError(/foo/);
    });

    it('includes the pluginId from the extension in the error message if defined', () => {
      const initialMapping = {
        root: { properties: { foo: { type: 'string' } } },
      };
      const extensions = [
        {
          pluginId: 'abc123',
          properties: {
            foo: { type: 'string' },
          },
        },
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions); // tslint:disable-line:no-unused-expression
      }).toThrowError(/plugin abc123/);
    });

    it('throws if any of the new properties start with _', () => {
      const initialMapping = {
        root: { properties: { foo: { type: 'string' } } },
      };
      const extensions = [
        {
          properties: {
            _foo: { type: 'string' },
          },
        },
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions); // tslint:disable-line:no-unused-expression
      }).toThrowErrorMatchingSnapshot();
    });

    it('includes the pluginId from the extension in the _ error message if defined', () => {
      const initialMapping = {
        root: { properties: { foo: { type: 'string' } } },
      };
      const extensions = [
        {
          pluginId: 'abc123',
          properties: {
            _foo: { type: 'string' },
          },
        },
      ];

      expect(() => {
        new IndexMappings(initialMapping, extensions); // tslint:disable-line:no-unused-expression
      }).toThrowErrorMatchingSnapshot();
    });
  });

  describe('#getDsl()', () => {
    // tests are light because this method is used all over these tests
    it('returns mapping as es dsl', () => {
      const mapping = new IndexMappings();
      expect(typeof mapping.getDsl()).toBe('object');
    });
  });
});
