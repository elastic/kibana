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
import {
  generateRawId,
  isRawSavedObject,
  rawToSavedObject,
  ROOT_TYPE,
  savedObjectToRaw,
} from './index';

describe('saved object conversion', () => {
  describe('rawToSavedObject', () => {
    test('it converts the id and type properties, and retains migrationVersion', () => {
      const now = new Date();
      const actual = rawToSavedObject({
        _id: 'hello:world',
        _type: ROOT_TYPE,
        _version: 3,
        _source: {
          type: 'hello',
          hello: {
            a: 'b',
            c: 'd',
          },
          migrationVersion: {
            hello: '1.2.3',
            acl: '33.3.5',
          },
          updated_at: now,
        },
      });
      const expected = {
        id: 'world',
        type: 'hello',
        version: 3,
        attributes: {
          a: 'b',
          c: 'd',
        },
        migrationVersion: {
          hello: '1.2.3',
          acl: '33.3.5',
        },
        updated_at: now,
      };
      expect(expected).toEqual(actual);
    });

    test('it ignores version if not in the raw doc', () => {
      const actual = rawToSavedObject({
        _id: 'hello:world',
        _type: ROOT_TYPE,
        _source: {
          type: 'hello',
          hello: {
            world: 'earth',
          },
        },
      });
      const expected = {
        id: 'world',
        type: 'hello',
        attributes: {
          world: 'earth',
        },
      };
      expect(expected).toEqual(actual);
    });

    test('it handles unprefixed ids', () => {
      const actual = rawToSavedObject({
        _id: 'universe',
        _type: ROOT_TYPE,
        _source: {
          type: 'hello',
          hello: {
            world: 'earth',
          },
        },
      });
      expect(actual.id).toEqual('universe');
    });

    test('it does not pass unknown properties through', () => {
      const actual = rawToSavedObject({
        _id: 'universe',
        _type: ROOT_TYPE,
        _source: {
          type: 'hello',
          hello: {
            world: 'earth',
          },
          banjo: 'Steve Martin',
        },
      });
      expect(actual).toEqual({
        id: 'universe',
        type: 'hello',
        attributes: {
          world: 'earth',
        },
      });
    });

    test('it does not create attributes if [type] is missing', () => {
      const actual = rawToSavedObject({
        _id: 'universe',
        _type: ROOT_TYPE,
        _source: {
          type: 'hello',
        },
      });
      expect(actual).toEqual({
        id: 'universe',
        type: 'hello',
      });
    });

    test('it fails for documents which do not specify a type', () => {
      expect(() =>
        rawToSavedObject({
          _id: 'universe',
          _type: ROOT_TYPE,
          _source: {
            hello: {
              world: 'earth',
            },
          },
        })
      ).toThrow(/Expected "undefined" to be a saved object type/);
    });

    test('it is complimentary with savedObjectToRaw', () => {
      const raw = {
        _id: 'foo:bar',
        _type: ROOT_TYPE,
        _version: 24,
        _source: {
          type: 'foo',
          foo: {
            meaning: 42,
            nested: { stuff: 'here' },
          },
          migrationVersion: {
            foo: '1.2.3',
            bar: '9.8.7',
          },
          updated_at: new Date(),
        },
      };

      expect(savedObjectToRaw(rawToSavedObject(_.cloneDeep(raw)))).toEqual(raw);
    });
  });

  test('savedObjectToRaw generates an id, if none is specified', () => {
    const v1 = savedObjectToRaw({
      type: 'foo',
      attributes: {
        bar: true,
      },
    } as any);

    const v2 = savedObjectToRaw({
      type: 'foo',
      attributes: {
        bar: true,
      },
    } as any);

    expect(v1._id).toMatch(/foo\:[\w-]+$/);
    expect(v1._id).not.toEqual(v2._id);
  });

  describe('isRawSavedObject', () => {
    test('is true if the id is prefixed and the type matches', () => {
      expect(
        isRawSavedObject({
          _id: 'hello:world',
          _source: {
            type: 'hello',
            hello: {},
          },
        })
      ).toBeTruthy();
    });

    test('is false if the id is not prefixed', () => {
      expect(
        isRawSavedObject({
          _id: 'world',
          _source: {
            type: 'hello',
            hello: {},
          },
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute is missing', () => {
      expect(
        isRawSavedObject({
          _id: 'hello:world',
          _source: {
            hello: {},
          },
        })
      ).toBeFalsy();
    });

    test('is false if the type attribute does not match the id', () => {
      expect(
        isRawSavedObject({
          _id: 'hello:world',
          _source: {
            type: 'jam',
            jam: {},
            hello: {},
          },
        })
      ).toBeFalsy();
    });

    test('is false if there is no [type] attribute', () => {
      expect(
        isRawSavedObject({
          _id: 'hello:world',
          _source: {
            type: 'hello',
            jam: {},
          },
        })
      ).toBeFalsy();
    });
  });

  test('generateRawId generates an id, if none is specified', () => {
    const id = generateRawId('goodbye');
    expect(id).toMatch(/goodbye\:[\w-]+$/);
  });

  test('generateRawId uses the id that is specified', () => {
    const id = generateRawId('hello', 'world');
    expect(id).toMatch('hello:world');
  });
});
