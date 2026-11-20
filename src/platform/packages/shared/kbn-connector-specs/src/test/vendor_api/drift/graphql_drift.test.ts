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

describe('diffGraphQLSchemas, beyond the fields of a root field', () => {
  const summary = (beforeSdl: string, afterSdl: string, rootFields: typeof roots) =>
    diffGraphQLSchemas(beforeSdl, afterSdl, rootFields)
      .map(({ kind, id, operation, coordinate }) => `${operation} ${kind} ${id} ${coordinate}`)
      .sort();

  it('attributes what a union or an interface can be to the roots whose response reaches it', () => {
    const base = `
      type Query { owner: Owner, node: Node }
      interface Node { id: ID }
      type Item implements Node { id: ID }
      type Person { name: String }
      type Team { name: String }
      union Owner = Person | Team
    `;
    const changed = `
      type Query { owner: Owner, node: Node }
      interface Node { id: ID }
      interface Extra { id: ID }
      type Item implements Node & Extra { id: ID }
      type Cog implements Node { id: ID }
      type Person { name: String }
      type Team { name: String }
      type Robot { name: String }
      union Owner = Person | Robot
    `;
    expect(
      summary(base, changed, [
        { method: 'query', path: 'owner' },
        { method: 'query', path: 'node' },
      ])
    ).toEqual(
      [
        'QUERY owner breaking response-property-one-of-added Owner',
        'QUERY owner non-breaking response-property-one-of-removed Owner',
        // A new type implementing Node widens it, though Item started to implement another
        // interface, which no root field returns
        'QUERY node breaking response-property-one-of-added Node',
      ].sort()
    );
  });

  it('reports an interface by the types it can be, whether an existing type starts to implement it or not', () => {
    const query = 'type Query { node: Node, other: Other }';
    const base = `${query}
      interface Node { id: ID }
      interface Other { id: ID }
      type Item implements Node { id: ID }
      type Old implements Other { id: ID }`;
    const rootFields = [
      { method: 'query', path: 'node' },
      { method: 'query', path: 'other' },
    ];
    // An existing type starts to implement Node, and Item stops
    expect(
      summary(
        base,
        `${query}
        interface Node { id: ID }
        interface Other { id: ID }
        type Item { id: ID }
        type Old implements Other & Node { id: ID }`,
        rootFields
      )
    ).toEqual([
      'QUERY node breaking response-property-one-of-added Node',
      'QUERY node non-breaking response-property-one-of-removed Node',
    ]);
  });

  it('reports a type that changed kind', () => {
    expect(
      summary(
        'type Query { thing: Thing } type Thing { id: ID }',
        'type Query { thing: Thing } interface Thing { id: ID }',
        [{ method: 'query', path: 'thing' }]
      )
    ).toEqual(['QUERY thing breaking response-property-type-changed Thing']);
  });

  it('attributes an enum that is sent and returned to the roots on each side', () => {
    const query = `
      type Query { status: Status }
      type Mutation { setStatus(status: Status): Boolean }
    `;
    const rootFields = [
      { method: 'query', path: 'status' },
      { method: 'mutation', path: 'setStatus' },
    ];
    expect(
      summary(`${query} enum Status { A B }`, `${query} enum Status { A B C }`, rootFields)
    ).toEqual([
      'MUTATION setStatus non-breaking request-property-enum-value-added Status.C',
      'QUERY status breaking response-property-enum-value-added Status.C',
    ]);
    expect(
      summary(`${query} enum Status { A B }`, `${query} enum Status { A }`, rootFields)
    ).toEqual([
      'MUTATION setStatus breaking request-property-enum-value-removed Status.B',
      'QUERY status non-breaking response-property-enum-value-removed Status.B',
    ]);
  });

  it('attributes the arguments of the fields below a root field to it', () => {
    const base = `
      type Query { items: [Item!]! }
      type Item { id: ID, updates(limit: Int = 5, source: Source, old: Int): [String] }
      enum Source { X }
    `;
    const changed = `
      type Query { items: [Item!]! }
      type Item {
        id: ID
        updates(limit: Int = 7, source: Source, old: Int @deprecated(reason: "no use"), q: String): [String]
      }
      enum Source { X Y }
    `;
    expect(summary(base, changed, [{ method: 'query', path: 'items' }])).toEqual(
      [
        'QUERY items breaking request-parameter-default-value-changed Item.updates(limit:)',
        'QUERY items deprecation request-property-deprecated Item.updates(old:)',
        // An enum only a nested argument takes is sent too
        'QUERY items non-breaking request-property-enum-value-added Source.Y',
        'QUERY items non-breaking new-optional-request-property Item.updates(q:)',
      ].sort()
    );
  });

  it('reports a deprecated enum value on each side it is used', () => {
    const query = `
      type Query { status: Status }
      type Mutation { setStatus(status: Status): Boolean }
    `;
    expect(
      summary(
        `${query} enum Status { A B }`,
        `${query} enum Status { A B @deprecated(reason: "retired") }`,
        [
          { method: 'query', path: 'status' },
          { method: 'mutation', path: 'setStatus' },
        ]
      )
    ).toEqual([
      'MUTATION setStatus deprecation request-property-enum-value-deprecated Status.B',
      'QUERY status deprecation response-property-enum-value-deprecated Status.B',
    ]);
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
      selectedFields: ['Item.color', 'Item.name', 'Item.owner', 'User.email'],
      sent: ['Query.items(ids:)', 'Query.items(state:)'],
      sentTypes: ['State'],
      sentValues: [],
      omitted: [],
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

  it('reads a field by the alias the query gave it', () => {
    expect(
      resolveGraphQLFieldUse(
        before,
        { method: 'query', path: 'items' },
        {
          read: ['items', 'items/label'],
          copied: [],
          returned: [],
          selected: ['name'],
          aliased: ['label=name'],
        }
      )
    ).toMatchObject({ read: ['Item.name'] });
  });

  it('keeps a field named items from being taken for the elements of a list', () => {
    const page = `
      type Query { page: Page }
      type Page { items: [Item!]!, cursor: String }
      type Item { id: ID }
    `;
    // Returning `page.items` passes along the items, not the cursor beside them
    expect(
      resolveGraphQLFieldUse(
        page,
        { method: 'query', path: 'page' },
        { read: [], copied: [], returned: ['items'], selected: ['cursor', 'items', 'items/id'] }
      )
    ).toMatchObject({ passed: ['Item.id', 'Page.items'] });
  });

  it('finds a field of an interface under the fragment on its type', () => {
    const node = `
      type Query { node: Node }
      interface Node { id: ID }
      type Item implements Node { id: ID, title: String }
    `;
    expect(
      resolveGraphQLFieldUse(
        node,
        { method: 'query', path: 'node' },
        { read: ['title'], copied: [], returned: [], selected: ['title'] }
      )
    ).toMatchObject({ read: ['Item.title'], selectedFields: ['Item.title'] });
  });

  it('resolves the arguments sent to the fields below the root field', () => {
    const nested = `
      type Query { items: [Item!]! }
      type Item { id: ID, updates(limit: Int, source: Source): [String] }
      enum Source { X }
    `;
    expect(
      resolveGraphQLFieldUse(
        nested,
        { method: 'query', path: 'items' },
        {
          read: [],
          copied: [],
          returned: [],
          sent: ['updates(limit:)', 'updates(source:)'],
          selected: ['updates'],
        }
      )
    ).toMatchObject({
      sent: ['Item.updates(limit:)', 'Item.updates(source:)'],
      sentTypes: ['Source'],
      selectedFields: ['Item.updates'],
    });
  });

  it('finds the enum values an action sends, and the arguments some selection leaves out', () => {
    const use = resolveGraphQLFieldUse(
      before,
      { method: 'query', path: 'items' },
      {
        read: [],
        copied: [],
        returned: [],
        sent: ['state', 'limit'],
        values: ['state=OPEN', 'limit=not an enum', 'ids/items=1'],
        // One call sends every argument and another only `ids`; the field below has none
        occurrences: ['(ids,limit,state)', '(ids)', 'owner()'],
      }
    );

    expect(use).toMatchObject({
      sentValues: ['State.OPEN'],
      omitted: ['Query.items(limit:)', 'Query.items(state:)'],
    });
  });

  it('keeps every field a response key was aliased to, as calls may differ', () => {
    expect(
      resolveGraphQLFieldUse(
        before,
        { method: 'query', path: 'items' },
        {
          read: ['items/label'],
          copied: [],
          returned: [],
          selected: ['name', 'size'],
          aliased: ['label=name', 'label=size'],
        }
      )
    ).toMatchObject({ read: ['Item.name', 'Item.size'] });
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

  it('counts a deprecated field the query selects, though the handler never reads it', () => {
    const use = {
      read: [],
      passed: [],
      types: ['Owner'],
      selectedFields: ['Item.legacy'],
      sent: [],
      sentTypes: [],
      sentValues: [],
      omitted: [],
    };
    const uses = (id: string, coordinate: string) => usesCoordinate(use, { id, coordinate });
    expect(uses('response-property-deprecated', 'Item.legacy')).toBe(true);
    // Only a deprecation concerns it: removing a field it doesn't read breaks nothing it reads
    expect(uses('response-property-removed', 'Item.legacy')).toBe(false);
    // What a union can be concerns the actions getting it
    expect(uses('response-property-one-of-added', 'Owner')).toBe(true);
    expect(uses('response-property-one-of-added', 'Other')).toBe(false);
  });

  it('concerns an action by the enum value it sends, not by the enum', () => {
    const use = {
      read: [],
      passed: [],
      types: [],
      selectedFields: [],
      sent: ['Query.items(state:)'],
      sentTypes: ['State'],
      sentValues: ['State.OPEN'],
      omitted: [],
    };
    const id = 'request-property-enum-value-deprecated';
    expect(usesCoordinate(use, { id, coordinate: 'State.OPEN' })).toBe(true);
    expect(usesCoordinate(use, { id, coordinate: 'State.CLOSED' })).toBe(false);
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

describe("compareGraphQLFields, beyond a field's name", () => {
  const compare = (beforeSdl: string, afterSdl: string, fields: string[]) =>
    compareGraphQLFields(beforeSdl, afterSdl, { method: 'query', path: 'items' }, fields);

  it('reports the values a read enum gained or lost, which leave its name as it was', () => {
    const schema = (values: string) => `
      type Query { items: [Item!]! }
      enum Color { ${values} }
      type Item { color: Color }
    `;
    expect(compare(schema('RED GREEN'), schema('RED GREEN BLUE'), ['items/color'])).toEqual([
      { field: 'items/color', changes: ['enum value added: BLUE'] },
    ]);
    expect(compare(schema('RED GREEN'), schema('RED'), ['items/color'])).toEqual([
      { field: 'items/color', changes: ['enum value removed: GREEN'] },
    ]);
  });

  it('reports the types a read union gained', () => {
    const schema = (members: string) => `
      type Query { items: [Item!]! }
      type Person { name: String }
      type Robot { name: String }
      union Owner = ${members}
      type Item { owner: Owner }
    `;
    expect(compare(schema('Person'), schema('Person | Robot'), ['items/owner'])).toEqual([
      { field: 'items/owner', changes: ['type added: Robot'] },
    ]);
  });

  it('reports the shape of what the root field returns, as a handler reads it from there', () => {
    const list = 'type Query { items: [Item!]! } type Item { name: String }';
    const single = 'type Query { items: Item! } type Item { name: String }';
    expect(compare(list, single, ['items/name'])).toEqual([
      { field: 'items', changes: ['type [Item!]! → Item!'] },
    ]);
    // Nothing is read from it, so its shape doesn't concern the action
    expect(compare(list, single, [])).toEqual([]);
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
