/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import type { OverlayAction } from '.';
import { applyOverlay, InvalidOverlayError } from '.';

const CARDS = "$.paths['/cards']";

// Trello-style defects: `idList` documented in the query string but sent in the body, and a
// `badge` the API never returns marked as required.
const vendorSpec = () => ({
  openapi: '3.0.3',
  info: { title: 'Cards', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/cards': {
      post: {
        parameters: [{ name: 'idList', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Card: {
        type: 'object',
        required: ['id', 'badge'],
        properties: { id: { type: 'string' }, badge: { type: 'string' } },
      },
    },
  },
});

const corrections: OverlayAction[] = [
  {
    target: `${CARDS}.post.parameters[?@.name == 'idList']`,
    description: 'idList is sent in the JSON body, not the query string',
    remove: true,
  },
  {
    target: `${CARDS}.post`,
    description: 'idList is sent in the JSON body, not the query string',
    update: {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['idList'],
              properties: { idList: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  {
    target: "$.components.schemas.Card.required[?@ == 'badge']",
    description: 'Cards without a badge omit the property',
    remove: true,
  },
];

const overlay = (actions: OverlayAction[]) => ({
  overlay: '1.1.0',
  info: { title: 'Cards corrections', version: '1' },
  actions,
});

describe('applyOverlay', () => {
  it('applies actions in order to a copy of the document', () => {
    const spec = vendorSpec();
    const { document, findings } = applyOverlay(spec, overlay(corrections));

    expect(document).toMatchObject({
      paths: { '/cards': { post: { parameters: [], requestBody: { required: true } } } },
      components: { schemas: { Card: { required: ['id'] } } },
    });
    expect(findings).toEqual([]);
    expect(spec).toEqual(vendorSpec());
  });

  it('merges objects, concatenates arrays and replaces primitives', () => {
    const { document } = applyOverlay(
      vendorSpec(),
      overlay([
        { target: '$.components.schemas.Card', update: { required: ['name'], maxProperties: 3 } },
        { target: '$.components.schemas.Card.required', update: 'owner' },
        { target: '$.components.schemas.Card.properties.id.type', update: 'integer' },
        {
          target: '$.components.schemas',
          copy: '$.components.schemas.Card.properties',
        },
      ])
    );

    expect(document.components).toEqual({
      schemas: {
        Card: {
          type: 'object',
          required: ['id', 'badge', 'name', 'owner'],
          maxProperties: 3,
          properties: { id: { type: 'integer' }, badge: { type: 'string' } },
        },
        id: { type: 'integer' },
        badge: { type: 'string' },
      },
    });
  });

  it('reports actions whose target is gone or that no longer change anything', () => {
    const { findings } = applyOverlay(
      vendorSpec(),
      overlay([
        { target: '$.components.schemas.Board', update: { type: 'object' } },
        { target: '$.components.schemas.Card.required', update: 'id' },
        { target: '$.components.schemas.Card', update: { type: 'object' } },
      ])
    );

    expect(findings.map(({ index, problem }) => [index, problem])).toEqual([
      [0, 'no-match'],
      [1, 'no-change'],
      [2, 'no-change'],
    ]);
  });

  it('rejects malformed overlays and actions that cannot apply', () => {
    const apply = (actions: OverlayAction[], version = '1.0.0') =>
      applyOverlay(vendorSpec(), { ...overlay(actions), overlay: version });

    expect(() => apply(corrections, '2.0.0')).toThrow(InvalidOverlayError);
    expect(() => apply([])).toThrow('An overlay needs at least one action');
    expect(() => apply([{ target: '$.info' }])).toThrow('action 0: needs update, copy or remove');
    expect(() => apply([{ target: '$.info', update: 'x' }])).toThrow('needs an object to merge');
    expect(() => apply([{ target: '$.info.title', update: { a: 1 } }])).toThrow(
      'can only be replaced by a primitive'
    );
    expect(() => apply([{ target: '$', remove: true }])).toThrow('root cannot be removed');
    expect(() => apply([{ target: '$.info', copy: '$.components.schemas.Board' }])).toThrow(
      'copy selects 0 nodes instead of one'
    );
    expect(() => apply([{ target: '$.info[', remove: true }])).toThrow(
      'Overlay action 0: Unsupported selector at offset 7 in JSONPath $.info['
    );
  });

  it('lets the mock enforce the corrected contract and serve recordings it contradicted', async () => {
    const recordings = [
      {
        exchanges: [
          {
            operation: { method: 'post', path: '/cards' },
            response: { status: 200, body: { id: 'c1' } },
          },
        ],
      },
    ];
    const post = (specs: Array<Record<string, unknown>>) => {
      const mock = createContractMockFetch({ specs, recordings });
      const response = mock.fetch('https://api.example.com/cards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idList: 'l1' }),
      });
      return { mock, response };
    };

    const vendor = post([vendorSpec()]);
    expect((await vendor.response).status).toBe(422);
    expect(vendor.mock.rejectedResponses).toHaveLength(1);

    const corrected = post([applyOverlay(vendorSpec(), overlay(corrections)).document]);
    const response = await corrected.response;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 'c1' });
    expect(corrected.mock.rejectedResponses).toEqual([]);
  });
});
