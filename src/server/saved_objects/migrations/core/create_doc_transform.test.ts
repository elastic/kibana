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
              '1.0.1': addAttribute('a', 0),
              '1.0.2': addAttribute('b', 1),
              '2.0.0': addAttribute('c', 2),
              '3.1.0': addAttribute('d', 3),
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
      semver: '1.0.1',
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

  test('applies transforms in semver order', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'muy-plugin',
          migrations: {
            boo: {
              '1.0.1': _.compose<TransformFn>(
                addAttribute('un', 1),
                assertAttribute({})
              ),
              '10.1.2': _.compose<TransformFn>(
                addAttribute('dix', 10),
                assertAttribute({
                  deux: 2,
                  un: 1,
                })
              ),
              '2.0.0': _.compose<TransformFn>(
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
      semver: '1.0.0',
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

  test('assigns the current kibanaVersion as semver', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'muy-plugin',
          migrations: {
            boo: {
              '1.0.1': _.identity,
            },
          },
        },
      ],
    };
    const original = {
      attributes: {},
      id: 'bar',
      semver: '1.0.0',
      type: 'boo',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      semver: opts.kibanaVersion,
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
              '1.0.1': addAttribute('hi', 'there'),
            },
            bbb: {
              '1.0.1': addAttribute('bye', 'there'),
            },
          },
        },
      ],
    };
    const doc = createDocTransform(opts)({
      attributes: {},
      id: 'shazm',
      semver: '1.0.0',
      type: 'aaa',
    });
    expect(doc.attributes).toEqual({ hi: 'there' });
  });

  test('decorates errors with the failed plugin, semver, and type', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '1.0.1': () => {
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
      semver: '1.0.0',
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
      pluginId: 'aaa',
      semver: '1.0.1',
      type: 'gee',
    });
  });

  test('up-to-date documents are untouched', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '1.0.1': () => {
                throw new Error('Never runs, hopefully!');
              },
            },
          },
        },
      ],
    };
    const doc = {
      attributes: {},
      id: 'bar',
      semver: '11.0.0',
      type: 'gee',
    };
    expect(createDocTransform(opts)(_.cloneDeep(doc))).toEqual(doc);
  });

  test('unversioned documents get all transforms', () => {
    const opts = {
      kibanaVersion: '11.0.0',
      plugins: [
        {
          id: 'aaa',
          migrations: {
            gee: {
              '0.0.1': addAttribute('boiled', 'peanuts'),
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
    expect(createDocTransform(opts)(doc)).toMatchObject({
      attributes: { boiled: 'peanuts' },
      semver: '11.0.0',
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
      semver: '11.0.0',
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
              '1.0.0': addAttribute('one', 1),
              '2.0.0': (doc: SavedObjectDoc) => ({ ...doc, type: 'bbb' }),
            },
            bbb: {
              '2.0.0': () => {
                throw new Error('DOH!');
              },
              '2.0.1': addAttribute('bee', 'cool'),
            },
          },
        },
      ],
    };
    const original = {
      attributes: { here: 'you go' },
      id: 'bar',
      type: 'aaa',
    };
    expect(createDocTransform(opts)(original)).toMatchObject({
      attributes: {
        bee: 'cool',
        here: 'you go',
        one: 1,
      },
      semver: '11.0.0',
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
