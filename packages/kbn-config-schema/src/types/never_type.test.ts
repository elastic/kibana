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

test('throws on any value set', () => {
  const type = schema.never();

  expect(() => type.validate(1)).toThrowErrorMatchingSnapshot();
  expect(() => type.validate('a')).toThrowErrorMatchingSnapshot();
  expect(() => type.validate(null)).toThrowErrorMatchingSnapshot();
  expect(() => type.validate({})).toThrowErrorMatchingSnapshot();
  expect(() => type.validate(undefined)).not.toThrow();
});

test('throws on value set as object property', () => {
  const type = schema.object({
    name: schema.never(),
    status: schema.string(),
  });

  expect(() =>
    type.validate({ name: 'name', status: 'in progress' })
  ).toThrowErrorMatchingSnapshot();

  expect(() => type.validate({ status: 'in progress' })).not.toThrow();
  expect(() => type.validate({ name: undefined, status: 'in progress' })).not.toThrow();
});

test('works for conditional types', () => {
  const type = schema.object({
    name: schema.conditional(
      schema.contextRef('context_value_1'),
      schema.contextRef('context_value_2'),
      schema.string(),
      schema.never()
    ),
  });

  expect(
    type.validate(
      { name: 'a' },
      {
        context_value_1: 0,
        context_value_2: 0,
      }
    )
  ).toEqual({ name: 'a' });

  expect(() =>
    type.validate(
      { name: 'a' },
      {
        context_value_1: 0,
        context_value_2: 1,
      }
    )
  ).toThrowErrorMatchingSnapshot();
});
