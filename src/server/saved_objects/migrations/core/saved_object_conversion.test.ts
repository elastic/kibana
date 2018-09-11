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
import { rawToSavedObject, ROOT_TYPE, savedObjectToRaw } from './saved_object_conversion';

describe('saved object conversion', () => {
  test('rawToSavedObject converts the id and type properties, and retains migrationVersion', () => {
    const actual = rawToSavedObject({
      _id: 'hello:world',
      _type: ROOT_TYPE,
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
      },
    });
    const expected = {
      id: 'world',
      type: 'hello',
      attributes: {
        a: 'b',
        c: 'd',
      },
      migrationVersion: {
        hello: '1.2.3',
        acl: '33.3.5',
      },
    };
    expect(expected).toEqual(actual);
  });

  test('rawToSavedObject is complimentary with savedObjectToRaw', () => {
    const raw = {
      _id: 'foo:bar',
      _type: ROOT_TYPE,
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
      },
    };

    expect(savedObjectToRaw(rawToSavedObject(raw))).toEqual(raw);
  });
});
