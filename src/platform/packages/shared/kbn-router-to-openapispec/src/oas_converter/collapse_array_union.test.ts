/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { collapseArrayUnion } from './collapse_array_union';

type SchemaObject = OpenAPIV3.SchemaObject;

const s = (obj: Record<string, unknown>) => obj as SchemaObject;

describe('collapseArrayUnion', () => {
  it('collapses oneOf [string, array[string]]', () => {
    const input: SchemaObject = {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    };
    expect(collapseArrayUnion(input)).toEqual({ type: 'array', items: { type: 'string' } });
  });

  it('collapses anyOf [enum string, array[enum string]]', () => {
    const input: SchemaObject = {
      anyOf: [
        { type: 'string', enum: ['running', 'finished'] },
        { type: 'array', items: { type: 'string', enum: ['running', 'finished'] } },
      ],
    };
    expect(collapseArrayUnion(input)).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['running', 'finished'] },
    });
  });

  it('preserves maxItems from array branch', () => {
    const input: SchemaObject = {
      anyOf: [
        { type: 'string', enum: ['pending', 'running'] },
        {
          type: 'array',
          items: { type: 'string', enum: ['pending', 'running'] },
          maxItems: 9,
        },
      ],
    };
    expect(collapseArrayUnion(input)).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['pending', 'running'] },
      maxItems: 9,
    });
  });

  it('collapses oneOf [string, {type: array}] by inferring items', () => {
    const input = s({
      oneOf: [{ type: 'string' }, { type: 'array' }],
    });
    expect(collapseArrayUnion(input)).toEqual({ type: 'array', items: { type: 'string' } });
  });

  it('collapses oneOf [enum string, {type: array}] by inferring items with enum', () => {
    const input = s({
      oneOf: [{ type: 'string', enum: ['browser', 'http', 'icmp', 'tcp'] }, { type: 'array' }],
    });
    expect(collapseArrayUnion(input)).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['browser', 'http', 'icmp', 'tcp'] },
    });
  });

  it('preserves description and nullable from top-level schema', () => {
    const input: SchemaObject = {
      description: 'Filter by status',
      nullable: true,
      anyOf: [
        { type: 'string', enum: ['a', 'b'] },
        { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
      ],
    };
    expect(collapseArrayUnion(input)).toEqual({
      description: 'Filter by status',
      nullable: true,
      type: 'array',
      items: { type: 'string', enum: ['a', 'b'] },
    });
  });

  it('returns schema unchanged for non scalar+array anyOf', () => {
    const input: SchemaObject = {
      anyOf: [{ type: 'string' }, { type: 'boolean' }],
    };
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('returns schema unchanged for 3+ branches', () => {
    const input = s({
      oneOf: [{ type: 'string' }, { type: 'array' }, { type: 'number' }],
    });
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('returns schema unchanged for $ref branches', () => {
    const input = s({
      anyOf: [{ $ref: '#/components/schemas/Foo' }, { type: 'array' }],
    });
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('returns schema unchanged when no anyOf or oneOf', () => {
    const input: SchemaObject = { type: 'string' };
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('returns schema unchanged for degenerate 5-branch anyOf (spaces pattern)', () => {
    const input = s({
      anyOf: [
        { items: {}, type: 'array' },
        { type: 'boolean' },
        { type: 'number' },
        { type: 'object' },
        { type: 'string' },
      ],
      nullable: true,
    });
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('returns schema unchanged when array items type mismatches scalar', () => {
    const input: SchemaObject = {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'number' } }],
    };
    expect(collapseArrayUnion(input)).toBe(input);
  });

  it('handles array-first, scalar-second ordering', () => {
    const input: SchemaObject = {
      oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
    };
    expect(collapseArrayUnion(input)).toEqual({ type: 'array', items: { type: 'string' } });
  });
});
