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

import { schema } from '..';

test('returns value if specified', () => {
  const type = schema.maybe(schema.string());
  expect(type.validate('test')).toEqual('test');
});

test('returns undefined if undefined', () => {
  const type = schema.maybe(schema.string());
  expect(type.validate(undefined)).toEqual(undefined);
});

test('returns undefined even if contained type has a default value', () => {
  const type = schema.maybe(
    schema.string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toEqual(undefined);
});

test('validates contained type', () => {
  const type = schema.maybe(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo')).toThrowErrorMatchingSnapshot();
});

test('validates basic type', () => {
  const type = schema.maybe(schema.string());

  expect(() => type.validate(666)).toThrowErrorMatchingSnapshot();
});

test('fails if null', () => {
  const type = schema.maybe(schema.string());
  expect(() => type.validate(null)).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  const type = schema.maybe(schema.string());
  expect(() => type.validate(null, {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});

describe('maybe + object', () => {
  test('returns undefined if undefined object', () => {
    const type = schema.maybe(schema.object({}));
    expect(type.validate(undefined)).toEqual(undefined);
  });

  test('returns undefined if undefined object with no defaults', () => {
    const type = schema.maybe(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    );

    expect(type.validate(undefined)).toEqual(undefined);
  });

  test('returns empty object if maybe keys', () => {
    const type = schema.object({
      name: schema.maybe(schema.string()),
    });
    expect(type.validate({})).toEqual({});
  });

  test('returns empty object if maybe nested object', () => {
    const type = schema.object({
      name: schema.maybe(
        schema.object({
          type: schema.string(),
          id: schema.string(),
        })
      ),
    });

    expect(type.validate({})).toEqual({});
  });
});
