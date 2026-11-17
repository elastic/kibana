/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareFields } from './compare_fields';

const spec = (group: Record<string, unknown>, path = '/groups') => ({
  openapi: '3.0.3',
  paths: {
    [path]: {
      get: {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Group' } },
              },
            },
          },
        },
      },
    },
  },
  components: { schemas: { Group: group } },
});

const group = (overrides: Record<string, unknown> = {}) => ({
  type: 'object',
  required: ['id', 'state'],
  properties: {
    id: { type: 'integer' },
    state: { type: 'string', enum: ['active', 'archived'] },
    duo: { type: 'string' },
    created: { type: 'string', format: 'date-time' },
    owner: { allOf: [{ $ref: '#/components/schemas/User' }] },
    ...overrides,
  },
});

const compare = (after: Record<string, unknown>, fields: string[], latestPath?: string) =>
  compareFields({
    before: spec(group()),
    after: spec(after, latestPath),
    method: 'get',
    path: '/groups',
    latestPath,
    fields,
  });

describe('compareFields', () => {
  it('finds no change when the fields read are the same', () => {
    expect(compare(group(), ['items/id', 'items/state', 'items/duo'])).toEqual([]);
  });

  it('reports type, format, enum and presence changes of the fields read only', () => {
    const after = {
      ...group({
        duo: { type: 'boolean' },
        created: { type: 'string', format: 'date' },
        state: { type: 'string', enum: ['active', 'archived', 'locked'] },
        id: { type: 'integer', nullable: true },
      }),
      required: ['id'],
    };

    expect(compare(after, ['items/id', 'items/state', 'items/duo', 'items/created'])).toEqual([
      { field: 'items/id', changes: ['can now be null'] },
      { field: 'items/state', changes: ['new values: locked', 'no longer always present'] },
      { field: 'items/duo', changes: ['type string → boolean'] },
      { field: 'items/created', changes: ['format date-time → date'] },
    ]);
    // A changed field the action doesn't read isn't reported
    expect(compare(after, ['items/name'])).toEqual([]);
  });

  it('reports enum changes through allOf, oneOf and anyOf', () => {
    const compareSchemas = (before: unknown, after: unknown) =>
      compareFields({
        before: spec(group({ state: before })),
        after: spec(group({ state: after })),
        method: 'get',
        path: '/groups',
        fields: ['items/state'],
      });
    const wrapped = (values: string[]) => ({ allOf: [{ type: 'string', enum: values }] });
    const nullable = (values: string[]) => ({
      oneOf: [{ type: 'string', enum: values }, { type: 'null' }],
    });

    expect(compareSchemas(wrapped(['active']), wrapped(['active', 'locked']))).toEqual([
      { field: 'items/state', changes: ['new values: locked'] },
    ]);
    expect(compareSchemas(nullable(['active']), nullable(['active', 'locked']))).toEqual([
      { field: 'items/state', changes: ['new values: locked'] },
    ]);
    // Each part of an allOf limits the field, so the values are those every part allows.
    expect(
      compareSchemas(
        { allOf: [{ type: 'string' }, { enum: ['active', 'archived'] }] },
        { allOf: [{ enum: ['active', 'archived', 'locked'] }, { enum: ['active', 'locked'] }] }
      )
    ).toEqual([
      { field: 'items/state', changes: ['new values: locked', 'values removed: archived'] },
    ]);
    // A branch without a list of values allows any value.
    expect(
      compareSchemas(
        { anyOf: [{ enum: ['active'] }, { type: 'string' }] },
        { anyOf: [{ enum: ['active', 'locked'] }, { type: 'string' }] }
      )
    ).toEqual([]);
  });

  it('reports a field that is gone, and follows the operation to its latest path', () => {
    const after = { type: 'object', properties: { id: { type: 'integer' } } };

    expect(compare(after, ['items/duo'], '/v2/groups')).toEqual([
      { field: 'items/duo', changes: ['not in the latest spec'] },
    ]);
  });

  it('skips fields the committed snapshot does not document', () => {
    expect(compare(group({ extra: { type: 'string' } }), ['items/extra'])).toEqual([]);
  });
});
