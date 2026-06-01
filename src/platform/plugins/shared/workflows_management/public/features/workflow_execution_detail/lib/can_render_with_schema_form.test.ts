/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { canRenderWithSchemaForm } from './can_render_with_schema_form';

describe('canRenderWithSchemaForm', () => {
  it('returns false for null', () => {
    expect(canRenderWithSchemaForm(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(canRenderWithSchemaForm(undefined)).toBe(false);
  });

  it('returns false for a schema with no properties', () => {
    expect(canRenderWithSchemaForm({ type: 'object' } as never)).toBe(false);
  });

  it('returns false for a schema with empty properties', () => {
    expect(canRenderWithSchemaForm({ type: 'object', properties: {} } as never)).toBe(false);
  });

  it('returns true for a boolean-only schema', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: { approved: { type: 'boolean', title: 'Approve action' } },
        required: ['approved'],
      } as never)
    ).toBe(true);
  });

  it('returns true for string, number, and boolean properties together', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
          active: { type: 'boolean' },
        },
      } as never)
    ).toBe(true);
  });

  it('returns true for a string property with enum (single-select)', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      } as never)
    ).toBe(true);
  });

  it('returns true for an array property with items.enum (multi-select)', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
        },
      } as never)
    ).toBe(true);
  });

  it('returns false for an array property without items.enum', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
        },
      } as never)
    ).toBe(false);
  });

  it('returns false for an array property with empty items.enum', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string', enum: [] } },
        },
      } as never)
    ).toBe(false);
  });

  it('returns false for a nested object property', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: { inner: { type: 'string' } },
          },
        },
      } as never)
    ).toBe(false);
  });

  it('returns false when a property type is not in the supported set', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: { data: { type: 'null' } },
      } as never)
    ).toBe(false);
  });

  it('returns false when the schema has oneOf at the root', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: { approved: { type: 'boolean' } },
        oneOf: [{ required: ['approved'] }],
      } as never)
    ).toBe(false);
  });

  it('returns false when the schema has anyOf at the root', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: { x: { type: 'string' } },
        anyOf: [],
      } as never)
    ).toBe(false);
  });

  it('returns false when the schema has $ref at the root', () => {
    expect(
      canRenderWithSchemaForm({
        type: 'object',
        properties: { x: { type: 'string' } },
        $ref: '#/definitions/Foo',
      } as never)
    ).toBe(false);
  });
});
