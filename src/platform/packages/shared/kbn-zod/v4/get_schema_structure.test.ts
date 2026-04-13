/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import { getZodSchemaStructure } from './get_schema_structure';

describe('getZodSchemaStructure', () => {
  it('lists leaf paths for a flat object', () => {
    const schema = z.object({
      title: z.string(),
      count: z.number().optional(),
    });
    const structure = getZodSchemaStructure(schema);
    expect(structure).toEqual(
      expect.arrayContaining([
        { path: ['title'], type: 'string' },
        { path: ['count'], type: 'number?' },
      ])
    );
    expect(structure).toHaveLength(2);
  });

  it('nests object properties in path', () => {
    const schema = z.object({
      meta: z.object({
        author: z.string(),
      }),
    });
    expect(getZodSchemaStructure(schema)).toEqual([{ path: ['meta', 'author'], type: 'string' }]);
  });

  it('describes arrays of primitives', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    expect(getZodSchemaStructure(schema)).toEqual([{ path: ['tags'], type: 'string[]' }]);
  });

  it('uses array label for array of object', () => {
    const schema = z.object({
      rows: z.array(z.object({ id: z.string() })),
    });
    expect(getZodSchemaStructure(schema)).toEqual([{ path: ['rows'], type: 'array' }]);
  });
});
