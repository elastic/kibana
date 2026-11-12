/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActionDefinition, ConnectorSpec } from '../../connector_spec';
import type { ResponseHandlingFinding } from './check_response_handling';
import { checkResponseHandling, formatResponseFindings } from './check_response_handling';

const V1 = 'https://api.example.com/v1';

const item = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: { type: 'string' }, name: { type: 'string', maxLength: 255 } },
};
const json = (schema: unknown) => ({
  description: 'response',
  content: { 'application/json': { schema } },
});

const specs = {
  v1: {
    openapi: '3.0.3',
    info: { title: 'Example', version: 'v1' },
    servers: [{ url: V1 }],
    security: [{ bearer: [] }],
    paths: {
      '/items': {
        get: {
          parameters: [
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
          ],
          responses: {
            '200': json({
              type: 'object',
              required: ['items'],
              properties: {
                items: { type: 'array', items: item },
                next: { type: 'string', nullable: true },
              },
            }),
          },
        },
      },
      '/items/{id}': {
        get: {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': json(item), '404': json({ type: 'object' }) },
        },
        delete: {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': json(item), '404': json({ type: 'object' }) },
        },
      },
    },
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  },
};

const pagination = [
  {
    operation: { method: 'get', path: '/items', source: 'v1' },
    pagination: {
      style: 'cursor',
      request: { cursorParam: 'cursor', sizeParam: 'limit' },
      response: { itemsPath: 'items', nextPath: 'next' },
      end: 'null',
    },
  },
] as const;

const action = <T>(
  input: z.ZodType<T>,
  handler: ActionDefinition<T>['handler'],
  scope: ActionDefinition<T>['scope'] = 'read'
): ActionDefinition<T> => ({ input, handler, scope });

interface Page {
  readonly items: Array<{ id: string; name: string }>;
  readonly next?: string | null;
}

const noInput = z.object({});
const idInput = z.object({ id: z.string() });

const connector: ConnectorSpec = {
  metadata: {
    id: '.example',
    displayName: 'Example',
    description: 'Example',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: { types: ['bearer'] },
  test: { enabled: false, handler: async () => ({}) },
  actions: {
    // Pages until the vendor says there are no more, and returns every item.
    listAll: action(noInput, async ({ client }) => {
      const all: Page['items'] = [];
      let cursor: string | undefined;
      do {
        const { data } = await client.get<Page>(`${V1}/items`, { params: { cursor, limit: 5 } });
        all.push(...data.items);
        cursor = data.next ?? undefined;
      } while (cursor);
      return all;
    }),
    // Broken: the vendor ends a collection with `next: null`, which is not `undefined`, so it
    // asks for the page after the last one for ever.
    listLooping: action(noInput, async ({ client }) => {
      const all: Page['items'] = [];
      let cursor: string | null | undefined;
      for (;;) {
        const { data } = await client.get<Page>(`${V1}/items`, { params: { cursor, limit: 5 } });
        all.push(...data.items);
        if (data.next === undefined) {
          return all;
        }
        cursor = data.next;
      }
    }),
    // Broken: stops on the page without a next cursor before it keeps that page's items.
    listDropsLast: action(noInput, async ({ client }) => {
      const all: Page['items'] = [];
      let cursor: string | undefined;
      for (;;) {
        const { data } = await client.get<Page>(`${V1}/items`, { params: { cursor, limit: 5 } });
        if (!data.next) {
          return all;
        }
        all.push(...data.items);
        cursor = data.next;
      }
    }),
    // Leaves paging to the caller: one request, and the cursor back.
    listPage: action(noInput, async ({ client }) => {
      const { data } = await client.get<Page>(`${V1}/items`, { params: { limit: 5 } });
      return { items: data.items, next: data.next };
    }),
    // Broken: a list that comes back empty when the vendor fails, for an operation that declares
    // no error status.
    listSwallowing: action(noInput, async ({ client }) => {
      try {
        return (await client.get<Page>(`${V1}/items`, { params: { limit: 5 } })).data.items;
      } catch {
        return [];
      }
    }),
    // Fails with the vendor's message.
    getItem: action(idInput, async ({ client }, { id }) => {
      try {
        return (await client.get(`${V1}/items/${id}`)).data;
      } catch (error) {
        const { response } = error as { response?: { data?: { message?: string } } };
        throw new Error(`Could not get item ${id}: ${response?.data?.message ?? 'unknown error'}`);
      }
    }),
    // Broken: reads an error body that the vendor doesn't send, and crashes on the missing field.
    getItemCrashing: action(idInput, async ({ client }, { id }) => {
      try {
        return (await client.get(`${V1}/items/${id}`)).data;
      } catch (error) {
        const { response } = error as { response: { data: { error: { message: string } } } };
        throw new Error(response.data.error.message);
      }
    }),
    // Broken: hides every failure behind an empty result.
    getItemSwallowing: action(idInput, async ({ client }, { id }) => {
      try {
        return (await client.get(`${V1}/items/${id}`)).data;
      } catch {
        return null;
      }
    }),
    // Answers a 404 with a result, as "no such item" is an answer, and throws on any failure.
    getItemOrNothing: action(idInput, async ({ client }, { id }) => {
      try {
        return (await client.get(`${V1}/items/${id}`)).data;
      } catch (error) {
        const { response } = error as { response?: { status?: number } };
        if (response?.status === 404) {
          return { found: false };
        }
        throw error;
      }
    }),
    // Broken: a change that is reported as done when the item doesn't exist.
    deleteItemSwallowing: action(
      idInput,
      async ({ client }, { id }) => {
        try {
          return (await client.delete(`${V1}/items/${id}`)).data;
        } catch (error) {
          const { response } = error as { response?: { status?: number } };
          if (response?.status === 404) {
            return { deleted: true };
          }
          throw error;
        }
      },
      'destroy'
    ),
    // Broken: can't handle a name at the vendor's limit.
    getItemShortName: action(idInput, async ({ client }, { id }) => {
      const { data } = await client.get<{ name: string }>(`${V1}/items/${id}`);
      if (data.name.length > 100) {
        throw new Error(`The name is ${data.name.length} characters long`);
      }
      return data;
    }),
  },
};

const check = (options: Partial<Parameters<typeof checkResponseHandling>[0]> = {}) =>
  checkResponseHandling({ connector, specs, pagination, ...options });

const kindsOf = (findings: readonly ResponseHandlingFinding[], name: string) =>
  [
    ...new Set(findings.filter(({ action: found }) => found === name).map(({ kind }) => kind)),
  ].sort();

describe('checkResponseHandling', () => {
  let findings: ResponseHandlingFinding[];

  beforeAll(async () => {
    findings = await check();
  });

  it.each(['listAll', 'listPage', 'getItem'])('finds nothing wrong with %s', (name) => {
    expect(kindsOf(findings, name)).toEqual([]);
  });

  it('finds a handler that pages for ever', () => {
    expect(kindsOf(findings, 'listLooping')).toEqual(['pagination-unbounded']);
    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'pagination-unbounded',
        action: 'listLooping',
        operation: 'v1 GET /items',
        collectionSize: 0,
      })
    );
  });

  it('finds a handler that drops the last page', () => {
    expect(kindsOf(findings, 'listDropsLast')).toEqual(['pagination-dropped-items']);
    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'pagination-dropped-items',
        action: 'listDropsLast',
        collectionSize: 11,
        missing: 1,
      })
    );
  });

  it('finds a handler that crashes on a failure status', () => {
    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'error-crash',
        action: 'getItemCrashing',
        operation: 'v1 GET /items/{id}',
        status: 400,
      })
    );
    expect(kindsOf(findings, 'getItemCrashing')).toEqual(['error-crash']);
  });

  it('serves 400, 401, 429 and 500 whether the spec declares them or not', () => {
    // GET /items declares no error status.
    expect(
      findings
        .filter(({ action: name, kind }) => name === 'listSwallowing' && kind === 'error-swallowed')
        .map((finding) => ('status' in finding ? finding.status : undefined))
    ).toEqual([400, 401, 429, 500]);
  });

  it('finds a handler that returns a result for a failure status', () => {
    expect(findings).toContainEqual({
      kind: 'error-swallowed',
      action: 'getItemSwallowing',
      operation: 'v1 GET /items/{id}',
      status: 400,
    });
  });

  it('lets a read action answer a 404 with a result, but not any other failure', () => {
    expect(kindsOf(findings, 'getItemOrNothing')).toEqual([]);
    expect(
      findings.some(
        (finding) =>
          finding.action === 'getItemSwallowing' && 'status' in finding && finding.status === 404
      )
    ).toBe(false);
  });

  it('still checks a 404 for an action that changes something', () => {
    expect(findings.filter(({ action: name }) => name === 'deleteItemSwallowing')).toEqual([
      {
        kind: 'error-swallowed',
        action: 'deleteItemSwallowing',
        operation: 'v1 DELETE /items/{id}',
        status: 404,
      },
    ]);
  });

  it('finds a handler that throws on a response at the schema bounds', () => {
    expect(findings).toContainEqual({
      kind: 'boundary-failure',
      action: 'getItemShortName',
      message: 'The name is 255 characters long',
    });
    expect(kindsOf(findings, 'getItem')).toEqual([]);
  });

  it('runs only the modes it is given', async () => {
    const onlyBoundary = await check({ modes: ['boundary'] });
    expect(onlyBoundary).toEqual([
      {
        kind: 'boundary-failure',
        action: 'getItemShortName',
        message: 'The name is 255 characters long',
      },
    ]);
  });

  it('skips the checks an action opts out of, with a reason', async () => {
    const reason = 'Deliberately different';
    const optedOut = await check({
      fixtures: {
        listLooping: { responseChecks: { pagination: reason } },
        listDropsLast: { responseChecks: { pagination: reason } },
        getItemCrashing: { responseChecks: { errors: reason } },
        getItemSwallowing: { responseChecks: { errors: reason } },
        deleteItemSwallowing: { responseChecks: { errors: reason } },
        listSwallowing: { responseChecks: { errors: reason } },
        getItemShortName: { responseChecks: { boundary: reason } },
      },
    });
    expect(optedOut).toEqual([]);
  });

  it('names the problems and how to fix or opt out of each check', () => {
    expect(formatResponseFindings(findings, 'specs/example/vendor_api/fixtures.json')).toContain(
      [
        'Fix the handler. If it behaves this way on purpose, opt the action out of that check with a',
        'reason in specs/example/vendor_api/fixtures.json:',
      ].join('\n')
    );
    const message = formatResponseFindings(
      findings.filter(({ action: name }) => name === 'getItemCrashing'),
      'fixtures.json'
    );
    expect(message).toContain('1 problem with how handlers handle responses');
    expect(message).toContain(
      '  - getItemCrashing: crashed on HTTP 400, 401, 429 and 500 from v1 GET /items/{id}: Cannot read properties of undefined'
    );
    expect(message).toContain(
      '    "getItemCrashing": { "responseChecks": { "errors": "<why it differs on purpose>" } }'
    );
  });
});
