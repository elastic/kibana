/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FirecrawlConnector } from '../specs/firecrawl/firecrawl';
import { FigmaConnector } from '../specs/figma/figma';
import { createContractContext } from './create_contract_context';

// Excerpts of the vendors' specs, with the operations and security the tests use.
const firecrawlSpecWith = (waitFor: Record<string, unknown>) => ({
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
                  waitFor,
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
});

const firecrawlSpec = firecrawlSpecWith({ type: 'integer', minimum: 0 });

const figmaSpec = {
  openapi: '3.1.0',
  info: { title: 'Figma', version: '0.1.0' },
  servers: [{ url: 'https://api.figma.com' }],
  security: [{ PersonalAccessToken: [] }],
  paths: {
    '/v1/me': {
      get: {
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'handle', 'email', 'img_url'],
                  properties: {
                    id: { type: 'string' },
                    handle: { type: 'string' },
                    email: { type: 'string' },
                    img_url: { type: 'string' },
                  },
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
      PersonalAccessToken: { type: 'apiKey', in: 'header', name: 'X-Figma-Token' },
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
        matched: { method: 'post', path: '/scrape' },
        status: 200,
        requestViolations: [],
        responseViolations: [],
      },
    ]);
  });

  it('fills auth secrets the test leaves out, using the connector defaults', async () => {
    const { ctx, runAction, mock } = await createContractContext({
      connector: FigmaConnector,
      authType: 'api_key_header',
      specs: [figmaSpec],
    });

    await runAction('whoAmI', {});

    expect(ctx.secrets).toEqual({
      authType: 'api_key_header',
      'X-Figma-Token': 'contract-mock-X-Figma-Token',
    });
    expect(ctx.client.defaults.headers.common['X-Figma-Token']).toBe('contract-mock-X-Figma-Token');
    expect(mock.calls.map(({ status, requestViolations }) => [status, requestViolations])).toEqual([
      [200, []],
    ]);
  });

  it('reports requests the vendor spec rejects', async () => {
    const { runAction, mock } = await createContractContext({
      connector: FirecrawlConnector,
      specs: [firecrawlSpecWith({ type: 'integer', minimum: 0, maximum: 60000 })],
    });

    await expect(
      runAction('scrape', { url: 'https://example.com', waitFor: 120000 })
    ).rejects.toThrow();
    expect(mock.calls[0]).toMatchObject({
      status: 422,
      requestViolations: [{ path: ['body', 'waitFor'] }],
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
