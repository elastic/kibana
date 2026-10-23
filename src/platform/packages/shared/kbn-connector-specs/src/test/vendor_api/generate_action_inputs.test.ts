/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { generateActionInputs, mergeInput } from './generate_action_inputs';

const input = z.object({
  query: z.string().min(1).max(100),
  boardId: z.string().regex(/^[0-9a-f]{24}$/),
  limit: z.number().int().min(1).max(50).optional(),
  filter: z.object({ field: z.string(), exact: z.boolean().optional() }).optional(),
});

describe('generateActionInputs', () => {
  it('generates inputs without optional properties, with them and at the upper bounds', async () => {
    expect(await generateActionInputs({ input })).toEqual({
      inputs: [
        { query: 'string', boardId: 'a'.repeat(24) },
        {
          query: 'string',
          boardId: 'a'.repeat(24),
          limit: 1,
          filter: { field: 'string', exact: true },
        },
        {
          query: 'string'.padEnd(100, 'x'),
          boardId: 'a'.repeat(24),
          limit: 50,
          filter: { field: 'string'.padEnd(1024, 'x'), exact: true },
        },
      ],
      rejected: [],
    });
  });

  it('merges the override into each input', async () => {
    const { inputs } = await generateActionInputs(
      { input },
      { boardId: '5f0c1e2d3b4a596877665544', filter: { field: 'name' } }
    );

    expect(inputs).toEqual([
      { query: 'string', boardId: '5f0c1e2d3b4a596877665544', filter: { field: 'name' } },
      expect.objectContaining({ limit: 1, filter: { field: 'name', exact: true } }),
      expect.objectContaining({ limit: 50, filter: { field: 'name', exact: true } }),
    ]);
  });

  it('generates one input per enum value, ignoring defaults', async () => {
    const { inputs } = await generateActionInputs({
      input: z.object({
        sort: z.enum(['asc', 'desc']),
        status: z.enum(['open', 'pending', 'closed', 'merged']).default('pending'),
      }),
    });

    expect(inputs).toEqual([
      { sort: 'asc' },
      { sort: 'asc', status: 'pending' },
      { sort: 'desc', status: 'merged' },
      { sort: 'asc', status: 'open' },
      { sort: 'desc', status: 'pending' },
      { sort: 'desc', status: 'closed' },
    ]);
  });

  it('generates an unbounded input once and at the default upper bound', async () => {
    const { inputs } = await generateActionInputs({ input: z.object({ id: z.string() }) });

    expect(inputs).toEqual([{ id: 'string' }, { id: 'string'.padEnd(1024, 'x') }]);
  });

  it('reports inputs the schema rejects', async () => {
    const refined = z.object({ id: z.string().refine((id) => id.startsWith('ID-'), 'Needs ID-') });

    expect(await generateActionInputs({ input: refined })).toEqual({
      inputs: [],
      rejected: [
        { variant: 'required', input: { id: 'string' }, message: expect.stringContaining('ID-') },
        {
          variant: 'boundary',
          input: { id: 'string'.padEnd(1024, 'x') },
          message: expect.stringContaining('ID-'),
        },
      ],
    });
  });
});

describe('mergeInput', () => {
  it('merges objects key by key and replaces arrays and primitives', () => {
    expect(mergeInput({ a: { b: 1, c: [1, 2] }, d: 'x' }, { a: { c: [3] }, d: 'y', e: 1 })).toEqual(
      { a: { b: 1, c: [3] }, d: 'y', e: 1 }
    );
  });
});
