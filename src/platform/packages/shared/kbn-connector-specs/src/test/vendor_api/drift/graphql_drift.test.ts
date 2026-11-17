/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  compareGraphQLFields,
  diffGraphQLSchemas,
  locateGraphQLRootField,
  resolveGraphQLFieldUse,
  usesCoordinate,
} from './graphql_drift';

const before = `
  type Query { items(ids: [ID!], limit: Int = 10, state: State): [Item!]!, old: Int @deprecated }
  type Mutation { archive(opts: Opts!): Item }
  input Opts { reason: String, force: Boolean }
  enum State { OPEN CLOSED }
  enum Color { RED GREEN }
  type Item { id: ID!, name: String!, size: Int, color: Color, owner: User }
  type User { id: ID!, email: String }
`;

const after = `
  type Query { items(ids: [ID!], limit: Int = 20, state: State, q: String): [Item!]! }
  type Mutation { archive(opts: Opts!, dry: Boolean): Item }
  input Opts { reason: Int, force: Boolean @deprecated(reason: "always forced"), mode: String! }
  enum State { OPEN CLOSED ARCHIVED }
  enum Color { RED GREEN BLUE }
  type Item { id: ID!, name: String @deprecated(reason: "use title"), title: String, color: Color, owner: User }
  type User { id: ID!, email: String }
`;

const roots = [
  { method: 'query', path: 'items' },
  { method: 'query', path: 'old' },
  { method: 'mutation', path: 'archive' },
];

describe('diffGraphQLSchemas', () => {
  it('attributes each change to the root fields reaching it, as request or response', () => {
    const changes = diffGraphQLSchemas(before, after, roots).map(
      ({ kind, id, operation, coordinate }) => `${operation} ${kind} ${id} ${coordinate}`
    );

    expect(changes.sort()).toEqual(
      [
        // The deprecated root field was removed
        'QUERY old breaking api-path-removed-with-deprecation Query.old',
        'QUERY items breaking request-parameter-default-value-changed Query.items(limit:)',
        'QUERY items non-breaking new-optional-request-property Query.items(q:)',
        // A value of an enum only sent, and of one only returned
        'QUERY items non-breaking request-property-enum-value-added State.ARCHIVED',
        'QUERY items breaking response-property-enum-value-added Color.BLUE',
        'MUTATION archive breaking response-property-enum-value-added Color.BLUE',
        'QUERY items breaking response-property-removed Item.size',
        'MUTATION archive breaking response-property-removed Item.size',
        'QUERY items breaking response-property-type-changed Item.name',
        'MUTATION archive breaking response-property-type-changed Item.name',
        'QUERY items non-breaking response-optional-property-added Item.title',
        'MUTATION archive non-breaking response-optional-property-added Item.title',
        'QUERY items deprecation response-property-deprecated Item.name',
        'MUTATION archive deprecation response-property-deprecated Item.name',
        'MUTATION archive non-breaking new-optional-request-property Mutation.archive(dry:)',
        'MUTATION archive breaking request-property-type-changed Opts.reason',
        'MUTATION archive breaking new-required-request-property Opts.mode',
        'MUTATION archive deprecation request-property-deprecated Opts.force',
      ].sort()
    );
  });
});

describe('resolveGraphQLFieldUse', () => {
  it('resolves read, passed and sent paths to schema coordinates', () => {
    expect(
      resolveGraphQLFieldUse(
        before,
        { method: 'query', path: 'items' },
        {
          read: ['items', 'items/name'],
          copied: [],
          returned: ['items/owner'],
          sent: ['ids', 'ids/items', 'state'],
          selected: ['color', 'name', 'owner', 'owner/email'],
        }
      )
    ).toEqual({
      read: ['Item.name'],
      // Only what the query selects under what it returns
      passed: ['Item.owner', 'User.email'],
      types: ['User'],
      sent: ['Query.items(ids:)', 'Query.items(state:)'],
      sentTypes: ['State'],
    });
  });

  it('takes everything the passed types reach without a recorded selection', () => {
    expect(
      resolveGraphQLFieldUse(
        before,
        { method: 'query', path: 'items' },
        { read: [], copied: [], returned: ['items/owner'] }
      )
    ).toMatchObject({ passed: ['Item.owner', 'User'] });
  });

  it('says whether an action uses what a change names', () => {
    const use = resolveGraphQLFieldUse(
      before,
      { method: 'mutation', path: 'archive' },
      {
        read: ['color', 'name'],
        copied: [],
        returned: [],
        sent: ['opts', 'opts/reason'],
        selected: ['color', 'name'],
      }
    );

    expect(use).toBeDefined();
    if (!use) {
      return;
    }
    const uses = (id: string, coordinate: string) => usesCoordinate(use, { id, coordinate });
    expect(uses('response-property-deprecated', 'Item.name')).toBe(true);
    expect(uses('response-property-removed', 'Item.size')).toBe(false);
    // An enum value concerns the actions getting that enum
    expect(uses('response-property-enum-value-added', 'Color.BLUE')).toBe(true);
    expect(uses('request-property-deprecated', 'Opts.reason')).toBe(true);
    // It sends `opts`, but not `force`
    expect(uses('request-property-deprecated', 'Opts.force')).toBe(false);
  });
});

describe('compareGraphQLFields', () => {
  it('describes how the fields an action reads changed', () => {
    expect(
      compareGraphQLFields(before, after, { method: 'query', path: 'items' }, [
        'items/id',
        'items/name',
        'items/size',
      ])
    ).toEqual([
      { field: 'items/name', changes: ['can now be null', 'deprecated'] },
      { field: 'items/size', changes: ['not in the latest spec'] },
    ]);
  });
});

describe('locateGraphQLRootField', () => {
  it('finds root fields in the latest schema', () => {
    expect(locateGraphQLRootField(after, { method: 'query', path: 'items' })).toEqual({
      status: 'present',
    });
    expect(locateGraphQLRootField(after, { method: 'query', path: 'old' })).toEqual({
      status: 'missing',
    });
  });
});
