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
import { isConfigSchema } from './is_config_schema';

describe('isConfigSchema', () => {
  it('returns true for every sub classes of `Type`', () => {
    expect(isConfigSchema(schema.any())).toBe(true);
    expect(isConfigSchema(schema.arrayOf(schema.string()))).toBe(true);
    expect(isConfigSchema(schema.boolean())).toBe(true);
    expect(isConfigSchema(schema.buffer())).toBe(true);
    expect(isConfigSchema(schema.byteSize())).toBe(true);
    expect(isConfigSchema(schema.duration())).toBe(true);
    expect(isConfigSchema(schema.literal(''))).toBe(true);
    expect(isConfigSchema(schema.mapOf(schema.string(), schema.number()))).toBe(true);
    expect(isConfigSchema(schema.nullable(schema.string()))).toBe(true);
    expect(isConfigSchema(schema.number())).toBe(true);
    expect(isConfigSchema(schema.object({}))).toBe(true);
    expect(isConfigSchema(schema.oneOf([schema.string()]))).toBe(true);
    expect(isConfigSchema(schema.recordOf(schema.string(), schema.object({})))).toBe(true);
    expect(isConfigSchema(schema.string())).toBe(true);
    expect(isConfigSchema(schema.stream())).toBe(true);
  });

  it('returns false for every javascript data type', () => {
    expect(isConfigSchema('foo')).toBe(false);
    expect(isConfigSchema(42)).toBe(false);
    expect(isConfigSchema(new Date())).toBe(false);
    expect(isConfigSchema(null)).toBe(false);
    expect(isConfigSchema(undefined)).toBe(false);
    expect(isConfigSchema([1, 2, 3])).toBe(false);
    expect(isConfigSchema({ foo: 'bar' })).toBe(false);
    expect(isConfigSchema(function () {})).toBe(false);
  });

  it('returns true as long as `__isKbnConfigSchemaType` is true', () => {
    expect(isConfigSchema({ __isKbnConfigSchemaType: true })).toBe(true);
  });
});
