/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getGcpIdToken, parseServiceAccountKey } from '../auth_types/gcp_jwt_helpers';
import type { ConnectorSpec } from '../connector_spec';
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

  it('authenticates OAuth auth types with a bearer token the spec accepts', async () => {
    const { ctx, runAction, mock } = await createContractContext({
      connector: FigmaConnector,
      specs: [
        {
          ...figmaSpec,
          security: [{ OAuth2: [] }],
          components: { securitySchemes: { OAuth2: { type: 'http', scheme: 'bearer' } } },
        },
      ],
    });

    await runAction('whoAmI', {});

    expect(ctx.client.defaults.headers.common.Authorization).toBe(
      'Bearer contract-mock-access-token'
    );
    expect(mock.calls.map(({ status, requestViolations }) => [status, requestViolations])).toEqual([
      [200, []],
    ]);
  });

  it('sends FormData as multipart, as the http adapter does', async () => {
    const uploadSpec = {
      ...figmaSpec,
      paths: {
        '/v1/files': {
          post: {
            requestBody: {
              required: true,
              content: { 'multipart/form-data': { schema: { type: 'object' } } },
            },
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    };
    const { runAction, mock } = await createContractContext({
      connector: {
        ...FigmaConnector,
        actions: {
          upload: {
            isTool: false,
            scope: 'write',
            input: z.object({}),
            handler: async ({ client }) => {
              const form = new FormData();
              form.append('file', new Blob(['contents']), 'notes.txt');
              return (await client.post('https://api.figma.com/v1/files', form)).status;
            },
          },
        },
      },
      authType: 'api_key_header',
      specs: [uploadSpec],
    });

    expect(await runAction('upload', {})).toBe(200);
    expect(mock.calls[0].requestViolations).toEqual([]);
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

  it('parses the config with the connector schema, applying its defaults', async () => {
    const { ctx } = await createContractContext({
      connector: {
        ...FigmaConnector,
        schema: z.object({ apiUrl: z.string().default('https://api.figma.com'), team: z.string() }),
      },
      config: { team: 'design' },
      specs: [figmaSpec],
    });

    expect(ctx.config).toEqual({ apiUrl: 'https://api.figma.com', team: 'design' });
  });

  it('fills enum secrets and secrets that must be PEM private keys', async () => {
    const { ctx } = await createContractContext({
      connector: {
        ...FigmaConnector,
        auth: { types: ['oauth_client_credentials_private_key_jwt'] },
      },
      specs: [figmaSpec],
    });

    expect(ctx.secrets).toMatchObject({
      clientId: 'contract-mock-clientId',
      algorithm: 'PS256',
      certificateBinding: 'x5t#S256',
      privateKey: expect.stringContaining('-----BEGIN PRIVATE KEY-----'),
    });
  });

  it('fills Azure shared keys with base64, as the signer decodes them', async () => {
    const { ctx } = await createContractContext({
      connector: { ...FigmaConnector, auth: { types: ['azure_shared_key'] } },
      specs: [figmaSpec],
    });

    expect(atob(String(ctx.secrets?.accountKey))).toBe('contract-mock-accountKey');
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

  describe('gcp_service_account', () => {
    const SECRETS_URL = 'https://secretmanager.googleapis.com/v1/projects/p/secrets';
    const gcpSpec = {
      openapi: '3.0.0',
      info: { title: 'Secret Manager', version: 'v1' },
      servers: [{ url: 'https://secretmanager.googleapis.com/' }],
      security: [{ Oauth2: [] }],
      paths: {
        '/v1/projects/{projectsId}/secrets': {
          get: {
            parameters: [
              { name: 'projectsId', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
      components: {
        securitySchemes: {
          Oauth2: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scopes: {},
              },
            },
          },
        },
      },
    };
    const gcpConnector: ConnectorSpec = {
      metadata: {
        id: '.gcp-example',
        displayName: 'GCP example',
        description: 'GCP example',
        minimumLicense: 'enterprise',
        supportedFeatureIds: ['workflows'],
      },
      auth: { types: ['gcp_service_account'] },
      test: { enabled: false, handler: async () => ({}) },
      actions: {
        listSecrets: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) => (await client.get(SECRETS_URL)).status,
        },
        getIdToken: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ secrets, fetch: contextFetch }) => {
            const { client_email: email, private_key: key } = parseServiceAccountKey(
              String(secrets?.serviceAccountJson)
            );
            return getGcpIdToken(email, key, 'https://fn.example.com', contextFetch);
          },
        },
        globalFetch: {
          scope: 'read',
          input: z.object({}),
          handler: async () => fetch(SECRETS_URL),
        },
      },
    };

    it('signs with a sampled key and exchanges the JWT for a token at the mock', async () => {
      const { ctx, runAction, mock } = await createContractContext({
        connector: gcpConnector,
        specs: [gcpSpec],
      });

      expect(await runAction('listSecrets', {})).toBe(200);
      expect(ctx.client.defaults.headers.common.Authorization).toBe(
        'Bearer contract-mock-access-token'
      );
      expect(mock.calls.map(({ operation, status }) => [operation, status])).toEqual([
        ['OAuth token', 200],
        ['GET /v1/projects/{projectsId}/secrets', 200],
      ]);
    });

    it('routes handler token exchanges through the context fetch', async () => {
      const { runAction } = await createContractContext({
        connector: gcpConnector,
        specs: [gcpSpec],
      });

      expect(await runAction('getIdToken', {})).toBe('contract-mock-id-token');
    });

    it('fails requests sent with the global fetch instead of reaching the network', async () => {
      const originalFetch = globalThis.fetch;
      const { runAction } = await createContractContext({
        connector: gcpConnector,
        specs: [gcpSpec],
      });

      await expect(runAction('globalFetch', {})).rejects.toThrow(
        `${SECRETS_URL} was requested with the global fetch, bypassing the contract mock`
      );
      expect(globalThis.fetch).toBe(originalFetch);
    });
  });
});
