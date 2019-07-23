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
  const type = schema.nullable(schema.string());
  expect(type.validate('test')).toEqual('test');
});

test('returns null if null', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(null)).toEqual(null);
});

test('returns null if undefined', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(undefined)).toEqual(null);
});

test('returns null even if contained type has a default value', () => {
  const type = schema.nullable(
    schema.string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toEqual(null);
});

test('validates contained type', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo')).toThrowErrorMatchingSnapshot();
});

test('includes namespace in failure', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo', {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});
