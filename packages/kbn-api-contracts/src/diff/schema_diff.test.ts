/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  diffSchemas,
  diffResponseSchemas,
  diffRequestBodySchemas,
  diffParameters,
} from './schema_diff';

describe('diffSchemas', () => {
  it('returns no changes for identical schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    };

    const result = diffSchemas(schema, schema);

    expect(result.hasChanges).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects added optional property as non-breaking', () => {
    const baseline = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    };
    const current = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['id'],
    };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(false);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'property_added_optional',
        details: expect.objectContaining({ property: 'description' }),
      })
    );
  });

  it('detects added required property as breaking', () => {
    const baseline = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    };
    const current = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'property_added_required',
        details: expect.objectContaining({ property: 'name', isRequired: true }),
      })
    );
  });

  it('detects removed property as breaking', () => {
    const baseline = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    };
    const current = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'property_removed',
        details: expect.objectContaining({ property: 'name' }),
      })
    );
  });

  it('detects type change as breaking', () => {
    const baseline = { type: 'string' };
    const current = { type: 'number' };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'property_type_changed',
        details: expect.objectContaining({ oldType: 'string', newType: 'number' }),
      })
    );
  });

  it('detects property becoming required as breaking', () => {
    const baseline = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    };
    const current = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'required_changed',
        details: expect.objectContaining({
          property: 'name',
          wasRequired: false,
          isRequired: true,
        }),
      })
    );
  });

  it('detects $ref change as breaking', () => {
    const baseline = { $ref: '#/components/schemas/OldType' };
    const current = { $ref: '#/components/schemas/NewType' };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('handles nested properties', () => {
    const baseline = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    };
    const current = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            extra: { type: 'string' },
          },
        },
      },
    };

    const result = diffSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(false);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'property_added_optional',
        path: expect.arrayContaining(['properties', 'data', 'properties', 'extra']),
      })
    );
  });
});

describe('diffResponseSchemas', () => {
  it('returns no changes for identical responses', () => {
    const responses = {
      '200': {
        content: {
          'application/json': {
            schema: { type: 'object', properties: { id: { type: 'string' } } },
          },
        },
      },
    };

    const result = diffResponseSchemas(responses, responses);

    expect(result.hasChanges).toBe(false);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects removed response status as breaking', () => {
    const baseline = {
      '200': { content: {} },
      '404': { content: {} },
    };
    const current = {
      '200': { content: {} },
    };

    const result = diffResponseSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('allows adding optional properties to response schema (non-breaking)', () => {
    const baseline = {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
    };
    const current = {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                newField: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const result = diffResponseSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects removed property from response schema as breaking', () => {
    const baseline = {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
    };
    const current = {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { id: { type: 'string' } },
            },
          },
        },
      },
    };

    const result = diffResponseSchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });
});

describe('diffRequestBodySchemas', () => {
  it('returns no changes for identical request bodies', () => {
    const requestBody = {
      content: {
        'application/json': {
          schema: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
    };

    const result = diffRequestBodySchemas(requestBody, requestBody);

    expect(result.hasChanges).toBe(false);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects added required property as breaking', () => {
    const baseline = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      },
    };
    const current = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name', 'email'],
          },
        },
      },
    };

    const result = diffRequestBodySchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('allows adding optional property to request body (non-breaking)', () => {
    const baseline = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      },
    };
    const current = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    };

    const result = diffRequestBodySchemas(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(false);
  });
});

describe('diffParameters', () => {
  it('returns no changes for identical parameters', () => {
    const params = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];

    const result = diffParameters(params, params);

    expect(result.hasChanges).toBe(false);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects removed parameter as breaking', () => {
    const baseline = [
      { name: 'id', in: 'path', required: true },
      { name: 'filter', in: 'query', required: false },
    ];
    const current = [{ name: 'id', in: 'path', required: true }];

    const result = diffParameters(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('detects added required parameter as breaking', () => {
    const baseline = [{ name: 'id', in: 'path', required: true }];
    const current = [
      { name: 'id', in: 'path', required: true },
      { name: 'version', in: 'query', required: true },
    ];

    const result = diffParameters(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('allows adding optional parameter (non-breaking)', () => {
    const baseline = [{ name: 'id', in: 'path', required: true }];
    const current = [
      { name: 'id', in: 'path', required: true },
      { name: 'filter', in: 'query', required: false },
    ];

    const result = diffParameters(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects parameter becoming required as breaking', () => {
    const baseline = [
      { name: 'id', in: 'path', required: true },
      { name: 'filter', in: 'query', required: false },
    ];
    const current = [
      { name: 'id', in: 'path', required: true },
      { name: 'filter', in: 'query', required: true },
    ];

    const result = diffParameters(baseline, current);

    expect(result.hasChanges).toBe(true);
    expect(result.hasBreakingChanges).toBe(true);
  });
});
