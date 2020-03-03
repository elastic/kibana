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

import { unset } from './unset';

describe('unset', () => {
  it('deletes a property from an object', () => {
    const obj = {
      a: 'a',
      b: 'b',
      c: 'c',
    };
    unset(obj, 'a');
    expect(obj).toEqual({
      b: 'b',
      c: 'c',
    });
  });

  it('does nothing if the property is not present', () => {
    const obj = {
      a: 'a',
      b: 'b',
      c: 'c',
    };
    unset(obj, 'd');
    expect(obj).toEqual({
      a: 'a',
      b: 'b',
      c: 'c',
    });
  });

  it('handles nested paths', () => {
    const obj = {
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    };
    unset(obj, 'foo.bar.one');
    expect(obj).toEqual({
      foo: {
        bar: {
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    });
  });

  it('does nothing if nested paths does not exist', () => {
    const obj = {
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    };
    unset(obj, 'foo.nothere.baz');
    expect(obj).toEqual({
      foo: {
        bar: {
          one: 'one',
          two: 'two',
        },
        hello: 'dolly',
      },
      some: {
        things: 'here',
      },
    });
  });
});
