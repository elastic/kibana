/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowInputObjectSchema, WorkflowSchemaForAutocomplete } from './schema';

describe('WorkflowSchemaForAutocomplete', () => {
  it('should allow empty "with" block', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        name: 'test',
        steps: [
          {
            name: 'step1',
            type: 'console',
            with: {},
          },
        ],
      }).data
    ).toEqual({
      name: 'test',
      triggers: [],
      steps: [
        {
          name: 'step1',
          type: 'console',
          with: {},
        },
      ],
    });
  });

  it('should allow steps with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: 'console',
          },
        ],
      }).data
    ).toEqual({
      triggers: [],
      steps: [
        {
          name: '',
          type: 'console',
        },
      ],
    });
  });

  it('should allow triggers with just type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: 'manual',
          },
        ],
      }).data
    ).toEqual({
      triggers: [
        {
          type: 'manual',
        },
      ],
      steps: [],
    });
  });

  it('should catch null type for steps and triggers and return empty string for name and type', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      triggers: [],
      steps: [
        {
          name: '',
          type: '',
        },
      ],
    });
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        triggers: [
          {
            type: null,
          },
        ],
      }).data
    ).toEqual({
      triggers: [
        {
          type: '',
        },
      ],
      steps: [],
    });
  });

  it('should catch non-array steps and triggers and return empty array for steps and triggers', () => {
    expect(
      WorkflowSchemaForAutocomplete.safeParse({
        steps: 'console',
      }).data
    ).toEqual({
      steps: [],
      triggers: [],
    });
  });
});

describe('WorkflowInputObjectSchema', () => {
  it('should accept valid type literals in schema', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
      schema: {
        str: 'string',
        num: 'number',
        bool: 'boolean',
        arr: 'array',
        obj: 'object',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid array type definitions', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
      schema: {
        tags: ['string'],
        scores: ['number'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept nested objects in schema', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
      schema: {
        profile: {
          firstName: 'string',
          metadata: {
            source: 'string',
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid string value in schema', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
      schema: {
        firstName: 'bla', // Invalid - not a valid type
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid array item type', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
      schema: {
        tags: ['invalid'], // Invalid - not a valid type
      },
    });
    expect(result.success).toBe(false);
  });

  it('should accept object without schema', () => {
    const result = WorkflowInputObjectSchema.safeParse({
      name: 'test',
      type: 'object',
    });
    expect(result.success).toBe(true);
  });
});
