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

import { mergeCapabilities } from './merge_capabilities';

describe('mergeCapabilities', () => {
  it('merges empty object with non-empty object', () => {
    const capabilities = mergeCapabilities({ foo: {} }, { foo: { bar: true } });
    expect(capabilities).toEqual({ foo: { bar: true } });
  });

  it('merges nested object properties', () => {
    const capabilities = mergeCapabilities({ foo: { baz: true } }, { foo: { bar: true } });
    expect(capabilities).toEqual({ foo: { bar: true, baz: true } });
  });

  it('merges all object properties', () => {
    const capabilities = mergeCapabilities({ foo: { bar: true } }, { hello: { dolly: true } });
    expect(capabilities).toEqual({ foo: { bar: true }, hello: { dolly: true } });
  });

  it('merges boolean as same path if they are equals', () => {
    const capabilities = mergeCapabilities(
      { foo: { bar: true, dolly: false, a: true } },
      { foo: { bar: true, dolly: false, b: false } }
    );
    expect(capabilities).toEqual({ foo: { bar: true, dolly: false, a: true, b: false } });
  });

  it('throws if boolean at same path are not equals', () => {
    expect(() => {
      mergeCapabilities({ foo: { bar: false } }, { foo: { bar: true } });
    }).toThrowErrorMatchingInlineSnapshot(
      `"conflict trying to merge booleans with different values"`
    );

    expect(() => {
      mergeCapabilities({ foo: { bar: true } }, { foo: { bar: false } });
    }).toThrowErrorMatchingInlineSnapshot(
      `"conflict trying to merge booleans with different values"`
    );
  });

  it('throws if value as same path is boolean on left and object on right', () => {
    expect(() => {
      mergeCapabilities({ foo: { bar: false } }, { foo: { bar: {} } });
    }).toThrowErrorMatchingInlineSnapshot(`"conflict trying to merge boolean with object"`);
    expect(() => {
      mergeCapabilities({ foo: { bar: false } }, { foo: { bar: { baz: false } } });
    }).toThrowErrorMatchingInlineSnapshot(`"conflict trying to merge boolean with object"`);
  });

  it('should not alter the input capabilities', () => {
    const left = { foo: { bar: true } };
    const right = { hello: { dolly: true } };
    mergeCapabilities(left, right);
    expect(left).toEqual({ foo: { bar: true } });
    expect(right).toEqual({ hello: { dolly: true } });
  });
});
