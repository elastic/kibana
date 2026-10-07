/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FirecrawlConnector } from '../specs/firecrawl/firecrawl';
import { Trello } from '../specs/trello/trello';
import { createContractContext } from './create_contract_context';

// Excerpts of the vendors' specs, with the operations and security the tests use.
const firecrawlSpec = {
  openapi: '3.0.0',
  info: { title: 'Firecrawl', version: 'v2' },
  servers: [{ url: 'https://api.firecrawl.dev/v2' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/scrape': {
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  onlyMainContent: { type: 'boolean' },
                  waitFor: { type: 'integer', minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object', properties: { markdown: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
};

const trelloSpec = {
  openapi: '3.0.0',
  info: { title: 'Trello', version: '1' },
  servers: [{ url: 'https://api.trello.com/1' }],
  security: [{ APIKey: [], APIToken: [] }],
  paths: {
    '/members/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: { id: { type: 'string' }, username: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      APIKey: { type: 'apiKey', in: 'query', name: 'key' },
      APIToken: { type: 'apiKey', in: 'query', name: 'token' },
    },
  },
};

describe('createContractContext', () => {
  it('sends requests through the connector auth type to the mock', async () => {
    const { runAction, mock } = await createContractContext({
      connector: FirecrawlConnector,
      specs: [firecrawlSpec],
    });

    await runAction('scrape', { url: 'https://example.com' });

    expect(mock.calls).toEqual([
      {
        request: 'POST https://api.firecrawl.dev/v2/scrape',
        operation: 'POST /scrape',
        status: 200,
        requestViolations: [],
        responseViolations: [],
      },
    ]);
  });

  it('fills auth secrets the test leaves out, using the connector defaults', async () => {
    const { ctx, runAction, mock } = await createContractContext({
      connector: Trello,
      secrets: { token: 'my-token' },
      specs: [trelloSpec],
    });

    await runAction('whoAmI', {});

    expect(ctx.secrets).toEqual({
      authType: 'api_key_query',
      key: 'contract-mock-key',
      token: 'my-token',
    });
    expect(mock.calls.map(({ status, requestViolations }) => [status, requestViolations])).toEqual([
      [200, []],
    ]);
  });

  it('reports requests the vendor spec rejects', async () => {
    const { runAction, mock } = await createContractContext({
      connector: FirecrawlConnector,
      specs: [
        {
          ...firecrawlSpec,
          security: [{ apiKeyHeader: [] }],
          components: {
            securitySchemes: { apiKeyHeader: { type: 'apiKey', in: 'header', name: 'X-Api-Key' } },
          },
        },
      ],
    });

    await expect(runAction('scrape', { url: 'https://example.com' })).rejects.toThrow();
    expect(mock.calls[0]).toMatchObject({
      status: 401,
      requestViolations: [{ code: 'unauthenticated' }],
    });
  });

  it('rejects inputs the action schema rejects, before any request', async () => {
    const { runAction, mock } = await createContractContext({
      connector: FirecrawlConnector,
      specs: [firecrawlSpec],
    });

    await expect(runAction('scrape', { url: 42 })).rejects.toThrow();
    await expect(runAction('missing', {})).rejects.toThrow('.firecrawl has no action missing');
    expect(mock.calls).toEqual([]);
  });

  it('rejects auth types the connector does not declare', async () => {
    await expect(
      createContractContext({
        connector: FirecrawlConnector,
        authType: 'basic',
        specs: [firecrawlSpec],
      })
    ).rejects.toThrow('.firecrawl has no auth type basic');
  });
});
