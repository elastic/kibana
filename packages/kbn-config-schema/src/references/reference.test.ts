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

import { Reference } from './reference';
import { schema } from '../';

describe('Reference.isReference', () => {
  it('handles primitives', () => {
    expect(Reference.isReference(undefined)).toBe(false);
    expect(Reference.isReference(null)).toBe(false);
    expect(Reference.isReference(true)).toBe(false);
    expect(Reference.isReference(1)).toBe(false);
    expect(Reference.isReference('a')).toBe(false);
    expect(Reference.isReference({})).toBe(false);
  });

  it('handles schemas', () => {
    expect(
      Reference.isReference(
        schema.string({
          defaultValue: 'value',
        })
      )
    ).toBe(false);

    expect(
      Reference.isReference(
        schema.conditional(
          schema.contextRef('context_value_1'),
          schema.contextRef('context_value_2'),
          schema.string(),
          schema.string()
        )
      )
    ).toBe(false);
  });

  it('handles context references', () => {
    expect(Reference.isReference(schema.contextRef('ref_1'))).toBe(true);
  });

  it('handles sibling references', () => {
    expect(Reference.isReference(schema.siblingRef('ref_1'))).toBe(true);
  });
});
