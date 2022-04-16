/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from './reference';
import { schema } from '..';

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
