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

import _ from 'lodash';
import { createDocTransform } from './create_doc_transform';
import { SavedObjectDoc, TransformFn } from './types';

describe('createDocTransform', () => {
  test('applies transforms to the doc', () => {
    const opts = {
      kibanaVersion: '3.0.0',
      plugins: [
        {
          id: 'foo-plugin',
          migrations: {
            foo: {
              '1': addAttribute('a', 0),
              '2': addAttribute('b', 1),
              '3': addAttribute('c', 2),
              '4': addAttribute('d', 3),
            },
          },
        },
      ],
    };
    const original = {
      attributes: {
        hello: 'world',
      },
      id: 'bar',
      migrationVersion: 2,
      type: 'foo',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      attributes: {
        b: 1,
        c: 2,
        hello: 'world',
      },
      id: 'bar',
      type: 'foo',
    });
  });

  test('applies transforms in version order', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'muy-plugin',
          migrations: {
            boo: {
              '1': _.compose<TransformFn>(
                addAttribute('un', 1),
                assertAttribute({})
              ),
              '10': _.compose<TransformFn>(
                addAttribute('dix', 10),
                assertAttribute({
                  deux: 2,
                  un: 1,
                })
              ),
              '2': _.compose<TransformFn>(
                addAttribute('deux', 2),
                assertAttribute({ un: 1 })
              ),
            },
          },
        },
      ],
    };
    const original = {
      attributes: {},
      id: 'dang',
      migrationVersion: 0,
      type: 'boo',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      attributes: {
        deux: 2,
        dix: 10,
        un: 1,
      },
      id: 'dang',
      type: 'boo',
    });
  });

  test('assigns the current kibanaVersion as the migration Version', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'muy-plugin',
          migrations: {
            boo: {
              '2': _.identity,
            },
          },
        },
      ],
    };
    const original = {
      attributes: {},
      id: 'bar',
      migrationVersion: 1,
      type: 'boo',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      migrationVersion: 11,
    });
  });

  test('applies only transforms belonging to the correct type', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            aaa: {
              '1': addAttribute('hi', 'there'),
            },
            bbb: {
              '1': addAttribute('bye', 'there'),
            },
          },
        },
      ],
    };
    const doc = createDocTransform(opts)({
      attributes: {},
      id: 'shazm',
      migrationVersion: 0,
      type: 'aaa',
    });
    expect(doc.attributes).toEqual({ hi: 'there' });
  });

  test('decorates errors with the failed plugin, version, and type', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '1': () => {
                throw new Error('Bang boom pow!');
              },
            },
          },
        },
      ],
    };
    const doc = {
      attributes: {},
      id: 'bar',
      migrationVersion: 0,
      type: 'gee',
    };
    let error;
    try {
      createDocTransform(opts)(doc);
    } catch (e) {
      error = e;
    }
    expect(error.message).toMatch(/Bang boom pow/);
    expect(error.transform).toEqual({
      docId: 'bar',
      pluginId: 'aaa',
      type: 'gee',
      version: '1',
    });
  });

  test('up-to-date documents are run through the major version transform', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '10': () => {
                throw new Error('Never runs, hopefully!');
              },
              '11': addAttribute('foo', 'bar'),
            },
          },
        },
      ],
    };
    const doc = {
      attributes: {},
      id: 'bar',
      migrationVersion: 11,
      type: 'gee',
    };
    expect(createDocTransform(opts)(doc)).toEqual({
      attributes: { foo: 'bar' },
      id: 'bar',
      migrationVersion: 11,
      type: 'gee',
    });
  });

  test('unversioned documents are assumed to be current major', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '10': addAttribute('ten', 'ten'),
              '11': addAttribute('leven', 'leaven'),
            },
          },
        },
      ],
    };
    const doc = {
      attributes: {},
      id: 'bar',
      type: 'gee',
    };
    expect(createDocTransform(opts)(doc)).toEqual({
      attributes: { leven: 'leaven' },
      id: 'bar',
      migrationVersion: 11,
      type: 'gee',
    });
  });

  test('handles plugins that have no migrations', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
        },
      ],
    };
    const doc = {
      attributes: { here: 'you go' },
      id: 'bar',
      type: 'gee',
    };
    expect(createDocTransform(opts)(doc)).toMatchObject({
      attributes: { here: 'you go' },
    });
  });

  test('allows document type to change, applies transforms from the new types', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            aaa: {
              '1': addAttribute('one', 1),
              '2': (doc: SavedObjectDoc) => ({ ...doc, type: 'bbb' }),
            },
            bbb: {
              '1': () => {
                throw new Error('DOH!');
              },
              '2': addAttribute('bee', 'cool'),
            },
          },
        },
      ],
    };
    const original = {
      attributes: { here: 'you go' },
      id: 'bar',
      migrationVersion: 1,
      type: 'aaa',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      attributes: {
        bee: 'cool',
        here: 'you go',
        one: 1,
      },
      migrationVersion: 11,
    });
  });
});

function assertAttribute(attrib: any) {
  return (doc: SavedObjectDoc) => {
    expect(doc.attributes).toEqual(attrib);
    return doc;
  };
}

function addAttribute(prop: string, val: any) {
  return (doc: SavedObjectDoc) =>
    _.set<SavedObjectDoc>(doc, ['attributes', prop], val);
}
