/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toOpenAPI30Nullability } from './nullability';

describe('toOpenAPI30Nullability', () => {
  it('removes {type: "null"} from anyOf and adds nullable', () => {
    const input = {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual({
      type: 'string',
      nullable: true,
    });
  });

  it('removes {type: "null"} from oneOf with multiple schemas', () => {
    const input = {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual({
      oneOf: [
        { type: 'string', nullable: true },
        { type: 'number', nullable: true },
      ],
    });
  });

  it('handles nested nullability', () => {
    const input = {
      properties: {
        foo: {
          anyOf: [{ type: 'integer' }, { type: 'null' }],
        },
      },
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual({
      properties: {
        foo: {
          type: 'integer',
          nullable: true,
        },
      },
    });
  });

  it('does nothing if no null type present', () => {
    const input = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual(input);
  });

  it('converts object property with type null to nullable', () => {
    const input = {
      type: 'object',
      properties: {
        foo: { type: 'null' },
        bar: { type: 'string' },
      },
      required: ['foo', 'bar'],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual({
      type: 'object',
      properties: {
        foo: { nullable: true },
        bar: { type: 'string' },
      },
      required: ['foo', 'bar'],
    });
  });

  it('handles anyOf with one object with nullable property and one without', () => {
    const input = {
      anyOf: [
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'null' },
          },
        },
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' },
          },
        },
      ],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual({
      anyOf: [
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { nullable: true },
          },
        },
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' },
          },
        },
      ],
    });
  });

  it('does not disturb unrelated properties', () => {
    const input = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      description: 'A test object',
      required: ['foo'],
    };
    const output = toOpenAPI30Nullability(JSON.parse(JSON.stringify(input)));
    expect(output).toEqual(input);
  });
});
