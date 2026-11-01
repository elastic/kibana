/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod/v4';
import { getGcpIdToken, parseServiceAccountKey } from '../auth_types/gcp_jwt_helpers';
import type { ConnectorSpec } from '../connector_spec';
import { FirecrawlConnector } from '../specs/firecrawl/firecrawl';
import { FigmaConnector } from '../specs/figma/figma';
import type { BuildContext, ClientTypeSpec } from '../lib/clients';
import { mysqlClientType } from '../lib/clients/mysql';
import { MysqlConnector } from '../specs/mysql/mysql';
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

  it('answers stream responses with Node streams, as the http adapter does', async () => {
    const { ctx } = await createContractContext({
      connector: FigmaConnector,
      authType: 'api_key_header',
      specs: [figmaSpec],
    });

    const { data } = await ctx.client.get('https://api.figma.com/v1/me', {
      responseType: 'stream',
    });

    expect(data).toBeInstanceOf(Readable);
    expect(JSON.parse(Buffer.concat(await data.toArray()).toString())).toEqual(
      expect.objectContaining({ handle: 'string' })
    );
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

  describe('getClient', () => {
    const mysqlConfig = { host: 'db.example.com', port: 3306, database: 'app' };
    const mysqlSecrets = { username: 'alice', password: 's3cret' };

    // A pool that answers every statement with the same rows, recording what it was sent.
    const fakeMysql = () => {
      const statements: string[] = [];
      const builds: BuildContext[] = [];
      let terminated = 0;
      const pool = {
        query: async (sql: string) => {
          statements.push(sql);
          return [[{ Database: 'app' }], []];
        },
      };
      const clientType = {
        id: 'mysql',
        build: async (ctx: BuildContext) => {
          builds.push(ctx);
          return pool;
        },
        terminate: async () => {
          terminated++;
        },
      } as unknown as ClientTypeSpec<never>;
      return { clientType, statements, builds, terminated: () => terminated };
    };

    it('throws for client types the test does not provide', async () => {
      const { runAction } = await createContractContext({
        connector: MysqlConnector,
        config: mysqlConfig,
        specs: [],
      });

      await expect(runAction('listDatabases', {})).rejects.toThrow(
        'Client mysql is not available in contract tests'
      );
    });

    it('builds provided client types once, with the config and the auth type headers, and terminates them on close', async () => {
      const mysql = fakeMysql();
      const { ctx, runAction, close } = await createContractContext({
        connector: MysqlConnector,
        config: mysqlConfig,
        secrets: mysqlSecrets,
        specs: [],
        clientTypes: { mysql: mysql.clientType },
      });

      expect(await runAction('listDatabases', {})).toEqual([{ Database: 'app' }]);
      await runAction('listDatabases', {});
      expect(await ctx.getClient('mysql')).toBeDefined();

      expect(mysql.statements).toEqual(['SHOW DATABASES', 'SHOW DATABASES']);
      expect(mysql.builds).toHaveLength(1);
      const [build] = mysql.builds;
      // Parsed with the connector schema, so its defaults apply.
      expect(build.config).toEqual(expect.objectContaining({ ...mysqlConfig, ssl: 'required' }));
      expect(await build.credential.getAuthHeaders()).toEqual({
        Authorization: `Basic ${Buffer.from('alice:s3cret').toString('base64')}`,
      });
      expect(() => build.networkSettings.ensureHostnameAllowed('db.example.com')).not.toThrow();
      expect(build.networkSettings.getProxySettings()).toBeUndefined();
      await expect(build.platform.resolveSrvHosts('db.example.com', 'mongodb')).rejects.toThrow(
        "needs an SRV lookup, which contract tests don't make"
      );

      expect(mysql.terminated()).toBe(0);
      await close();
      expect(mysql.terminated()).toBe(1);
    });

    it('applies network setting overrides, such as TLS settings for a test server', async () => {
      const mysql = fakeMysql();
      const { ctx } = await createContractContext({
        connector: MysqlConnector,
        config: mysqlConfig,
        specs: [],
        clientTypes: { mysql: mysql.clientType },
        networkSettings: { getSslSettings: () => ({ verificationMode: 'none' }) },
      });

      await ctx.getClient('mysql');

      const [{ networkSettings, platform, logger }] = mysql.builds;
      expect(networkSettings.getSslSettings()).toEqual({ verificationMode: 'none' });
      expect(platform.buildTlsOptions([], logger)).toEqual(
        expect.objectContaining({ rejectUnauthorized: false })
      );
    });

    it('does not terminate a client whose build failed', async () => {
      const terminate = jest.fn();
      const { ctx, close } = await createContractContext({
        connector: MysqlConnector,
        config: mysqlConfig,
        specs: [],
        clientTypes: {
          mysql: {
            id: 'mysql',
            build: async () => {
              throw new Error('connect ECONNREFUSED');
            },
            terminate,
          },
        },
      });

      await expect(ctx.getClient('mysql')).rejects.toThrow('connect ECONNREFUSED');
      await close();
      expect(terminate).not.toHaveBeenCalled();
    });

    it('builds the production client types, which decode the credential they are given', async () => {
      const { ctx, close } = await createContractContext({
        connector: MysqlConnector,
        config: mysqlConfig,
        secrets: mysqlSecrets,
        specs: [],
        clientTypes: { mysql: mysqlClientType },
      });

      // mysql2 pools connect on their first query, so building opens no connection.
      const pool = await ctx.getClient('mysql');

      expect(pool).toHaveProperty(['pool', 'config', 'connectionConfig', 'user'], 'alice');
      expect(pool).toHaveProperty(['pool', 'config', 'connectionConfig', 'host'], 'db.example.com');
      await close();
    });
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
          handler: async ({ secrets, fetchTestOnly: contextFetch }) => {
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
      // The mock appends the granted scopes to the token it issues.
      expect(ctx.client.defaults.headers.common.Authorization).toMatch(
        /^Bearer contract-mock-access-token(\.|$)/
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
