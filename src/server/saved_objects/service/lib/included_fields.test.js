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

import { includedFields } from './included_fields';

describe('includedFields', () => {
  it('returns undefined if fields are not provided', () => {
    expect(includedFields()).toBe(undefined);
  });

  it('includes type', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(3);
    expect(fields).toContain('type');
  });

  it('accepts field as string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(3);
    expect(fields).toContain('config.foo');
  });

  it('accepts fields as an array', () => {
    const fields = includedFields('config', ['foo', 'bar']);

    expect(fields).toHaveLength(5);
    expect(fields).toContain('config.foo');
    expect(fields).toContain('config.bar');
  });

  it('uses wildcard when type is not provided', () => {
    const fields = includedFields(undefined, 'foo');
    expect(fields).toHaveLength(3);
    expect(fields).toContain('*.foo');
  });

  describe('v5 compatibility', () => {
    it('includes legacy field path', () => {
      const fields = includedFields('config', ['foo', 'bar']);

      expect(fields).toHaveLength(5);
      expect(fields).toContain('foo');
      expect(fields).toContain('bar');
    });
  });
});
