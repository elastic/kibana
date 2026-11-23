/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecChange } from './detect_drift';
import { fieldTypeOf, fieldTypesOf } from './field_type';

const schema = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const documentOf = (extra: { properties?: Record<string, unknown> } = {}) => ({
  paths: {
    '/files/{key}': {
      get: {
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { $ref: '#/components/parameters/Mode' },
        ],
        responses: {
          '200': { content: { 'application/json': { schema: schema('Root') } } },
          '404': { content: { 'application/json': { schema: { type: 'string' } } } },
        },
      },
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: { properties: { status: { type: 'string', enum: ['open', 'closed'] } } },
            },
          },
        },
        responses: {},
      },
    },
  },
  components: {
    parameters: { Mode: { name: 'mode', in: 'query', schema: { type: 'string', nullable: true } } },
    schemas: {
      SlotContentId: { type: 'object', properties: { id: { type: 'string' } } },
      Value: { oneOf: [{ type: 'boolean' }, { type: 'string' }, schema('SlotContentId')] },
      Kind: { type: 'string', enum: ['A', 'B', 'C'] },
      ComponentNode: {
        properties: {
          value: schema('Value'),
          kind: schema('Kind'),
          parent: schema('ComponentNode'),
        },
      },
      Root: {
        properties: {
          document: {
            allOf: [
              {
                properties: {
                  children: {
                    type: 'array',
                    items: { oneOf: [schema('ComponentNode'), { type: 'object' }] },
                  },
                },
              },
            ],
          },
          tags: { type: 'array', items: { type: 'string' } },
          mixed: { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
          named: schema('SlotContentId'),
          ...extra.properties,
        },
      },
    },
  },
});

const change = (id: string, text: string, operation = 'GET /files/{key}'): SpecChange => ({
  kind: 'non-breaking',
  id,
  text,
  operation,
});

const current = documentOf();

describe('fieldTypeOf', () => {
  it('follows the path through lists, schemas and references to a field, and gives its type', () => {
    expect(
      fieldTypeOf(
        change(
          'response-property-one-of-added',
          'added `#/components/schemas/SlotContentId` to the `document/allOf[subschema #1]/children/items/oneOf[#/components/schemas/ComponentNode]/value` response property `oneOf` list for the response status `200`'
        ),
        { current }
      )
    ).toBe('boolean | string | SlotContentId');
  });

  it('gives the values of an enum, even when the field names the enum as a schema', () => {
    expect(
      fieldTypeOf(
        change(
          'response-property-enum-value-added',
          'added the new `C` enum value to the `document/allOf[subschema #1]/children/items/oneOf[#/components/schemas/ComponentNode]/kind` response property for the response status `200`'
        ),
        { current }
      )
    ).toBe('A | B | C');
  });

  it('names a field of a named schema by it, and a list by what it holds', () => {
    const added = (field: string) =>
      change(
        'response-optional-property-added',
        `added the optional property \`${field}\` to the response with the \`200\` status`
      );

    expect(fieldTypeOf(added('named'), { current })).toBe('SlotContentId');
    expect(fieldTypeOf(added('tags'), { current })).toBe('string[]');
    expect(fieldTypeOf(added('mixed'), { current })).toBe('(string | integer)[]');
  });

  it('reads a field that was removed from the committed snapshot, and the others from the new one', () => {
    const committed = documentOf({ properties: { old: { type: 'integer' } } });
    const removed = change(
      'response-optional-property-removed',
      'removed the optional property `old` from the response with the `200` status'
    );

    expect(fieldTypeOf(removed, { committed, current })).toBe('integer');
    expect(fieldTypeOf(removed, { current })).toBeUndefined();
  });

  it('finds a field of the request body, and a parameter by its location and name', () => {
    expect(
      fieldTypeOf(
        change(
          'new-optional-request-property',
          'added the new optional request property `status`',
          'POST /files/{key}'
        ),
        { current }
      )
    ).toBe('open | closed');
    const parameter = (name: string) =>
      change(
        'request-parameter-became-nullable',
        `the \`query\` request parameter \`${name}\` became nullable`
      );

    expect(fieldTypeOf(parameter('limit'), { current })).toBe('integer');
    expect(fieldTypeOf(parameter('mode'), { current })).toBe('string | null');
  });

  it("takes the operation's parameter over the one of its path", () => {
    const overridden = documentOf();
    Object.assign(overridden.paths['/files/{key}'], {
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'string' } }],
    });

    expect(
      fieldTypeOf(
        change(
          'request-parameter-became-nullable',
          'the `query` request parameter `limit` became nullable'
        ),
        { current: overridden }
      )
    ).toBe('integer');
  });

  it('gives the type a field had before when it was there before', () => {
    const committed = documentOf({ properties: { tags: { type: 'string' } } });
    const retyped = change(
      'response-property-type-changed',
      "the `tags` response's property `type` changed from `string` to `array` for status `200`"
    );
    const added = change(
      'response-optional-property-added',
      'added the optional property `tags` to the response with the `200` status'
    );
    const removed = change(
      'response-optional-property-removed',
      'removed the optional property `tags` from the response with the `200` status'
    );

    expect(fieldTypesOf(retyped, { committed, current })).toEqual({
      type: 'string[]',
      typeBefore: 'string',
    });
    expect(fieldTypesOf(added, { committed, current })).toEqual({ type: 'string[]' });
    expect(fieldTypesOf(removed, { committed, current })).toEqual({ type: 'string' });
  });

  it('takes the status the change names, else the lowest successful one', () => {
    expect(
      fieldTypeOf(
        change(
          'response-property-became-required',
          'the response property `tags` became required for the status `200`'
        ),
        { current }
      )
    ).toBe('string[]');
    expect(
      fieldTypeOf(
        change(
          'response-body-any-of-added',
          'added `#/components/schemas/Value` to the response body `anyOf` list'
        ),
        { current }
      )
    ).toBe('object');
  });

  it('takes the status from where the text names it, not from a value that looks like one', () => {
    expect(
      fieldTypeOf(
        change(
          'response-property-enum-value-added',
          'added the new `default` enum value to the `mode` response property for the response status `200`'
        ),
        {
          current: documentOf({ properties: { mode: { type: 'string', enum: ['a', 'default'] } } }),
        }
      )
    ).toBe('a | default');
  });

  it('reads the media type a change names, and gives no type when that media type is not there', () => {
    const document = {
      paths: {
        '/files': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': { schema: { properties: { size: { type: 'integer' } } } },
                  'application/xml': { schema: { properties: { size: { type: 'string' } } } },
                },
              },
            },
          },
        },
      },
    };
    const widened = (mediaType: string) =>
      change(
        'response-property-list-of-types-widened',
        `response property \`size\` list-of-types was widened by adding types \`null\` to media type \`${mediaType}\` of response \`200\``,
        'GET /files'
      );

    expect(fieldTypeOf(widened('application/xml'), { current: document })).toBe('string');
    expect(fieldTypeOf(widened('text/csv'), { current: document })).toBeUndefined();
  });

  it('gives the type of the field, not of its base, for keys added to the base it extends', () => {
    const graph = {
      paths: {
        '/me/chats': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        { properties: { '@odata.nextLink': { type: 'string' } } },
                        {
                          properties: {
                            value: { type: 'array', items: schema('microsoft.graph.chat') },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          'microsoft.graph.entity': {
            properties: { id: { type: 'string' } },
            discriminator: { propertyName: '@odata.type' },
          },
          'microsoft.graph.chat': {
            allOf: [
              schema('microsoft.graph.entity'),
              { properties: { topic: { type: 'string' } } },
            ],
          },
        },
      },
    };

    expect(
      fieldTypeOf(
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.distributionList` discriminator mapping keys to the `allOf[subschema #2]/value/items/allOf[subschema #1: entity]` response property for the response status `200`',
          'GET /me/chats'
        ),
        { current: graph }
      )
    ).toBe('microsoft.graph.chat[]');
    expect(
      fieldTypeOf(
        change(
          'response-property-discriminator-mapping-added',
          'added `#microsoft.graph.distributionList` discriminator mapping keys to the `allOf[subschema #1: entity]` response property for the response status `200`',
          'GET /chats/{chat-id}'
        ),
        {
          current: {
            ...graph,
            paths: {
              '/chats/{chat-id}': {
                get: {
                  responses: {
                    '200': {
                      content: { 'application/json': { schema: schema('microsoft.graph.chat') } },
                    },
                  },
                },
              },
            },
          },
        }
      )
    ).toBe('microsoft.graph.chat');
  });

  it('finds a parameter whose new enum value looks like a location', () => {
    const document = {
      paths: {
        '/files': {
          get: {
            parameters: [
              { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'header'] } },
            ],
            responses: {},
          },
        },
      },
    };

    expect(
      fieldTypeOf(
        change(
          'request-parameter-enum-value-added',
          'added the new enum value `header` to the `query` request parameter `status`',
          'GET /files'
        ),
        { current: document }
      )
    ).toBe('open | header');
  });

  it('gives a response header no type from a body property of the same name', () => {
    expect(
      fieldTypeOf(
        change(
          'response-required-header-added',
          'added the required response header `named` for the status `200`'
        ),
        { current }
      )
    ).toBeUndefined();
  });

  it.each([
    [
      'a path through a list inside a list',
      'response-property-one-of-added',
      'added `#/components/schemas/A` to the `document/oneOf[subschema #1: A -> subschema #2: A]/x` response property `oneOf` list for the response status `200`',
    ],
    [
      'a field that is not there',
      'response-optional-property-added',
      'added the optional property `nope` to the response with the `200` status',
    ],
    [
      'a subschema that is not there',
      'response-optional-property-added',
      'added the optional property `document/allOf[subschema #9]/x` to the response with the `200` status',
    ],
    [
      'a change that is not about a field',
      'api-security-added',
      'the endpoint scheme security `Oauth2: [a]` was added to the API',
    ],
  ])('gives no type for %s', (_, id, text) => {
    expect(fieldTypeOf(change(id, text), { current })).toBeUndefined();
  });

  it('gives no type for an operation that is not in the snapshot, or no snapshot', () => {
    const text = 'added the optional property `tags` to the response with the `200` status';

    expect(
      fieldTypeOf(change('response-optional-property-added', text, 'GET /other'), { current })
    ).toBeUndefined();
    expect(
      fieldTypeOf(
        { kind: 'non-breaking', id: 'response-optional-property-added', text },
        { current }
      )
    ).toBeUndefined();
    expect(fieldTypeOf(change('response-optional-property-added', text), {})).toBeUndefined();
  });
});
