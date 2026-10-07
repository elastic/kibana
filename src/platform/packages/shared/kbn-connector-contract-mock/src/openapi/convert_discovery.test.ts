/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import { convertDiscovery, isDiscoveryDocument } from './convert_discovery';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

// An excerpt of Secret Manager's and Gmail's Discovery documents, trimmed to what conversion uses.
const discovery = {
  kind: 'discovery#restDescription',
  discoveryVersion: 'v1',
  name: 'secretmanager',
  version: 'v1',
  title: 'Secret Manager API',
  rootUrl: 'https://secretmanager.googleapis.com/',
  servicePath: '',
  parameters: {
    alt: { type: 'string', location: 'query', enum: ['json', 'media'], default: 'json' },
    key: { type: 'string', location: 'query' },
  },
  auth: { oauth2: { scopes: { [SCOPE]: { description: 'See, edit and configure your data' } } } },
  schemas: {
    AccessSecretVersionResponse: {
      id: 'AccessSecretVersionResponse',
      type: 'object',
      properties: {
        name: { type: 'string' },
        payload: { $ref: 'SecretPayload' },
      },
    },
    SecretPayload: {
      id: 'SecretPayload',
      type: 'object',
      properties: {
        data: { type: 'string', format: 'byte', required: true },
        dataCrc32c: { type: 'string', format: 'int64' },
      },
    },
    ListSecretsResponse: {
      id: 'ListSecretsResponse',
      type: 'object',
      properties: {
        secrets: { type: 'array', items: { $ref: 'Secret' } },
        nextPageToken: { type: 'string' },
        totalSize: { type: 'integer', format: 'int32' },
      },
    },
    Secret: {
      id: 'Secret',
      type: 'object',
      properties: {
        name: { type: 'string', readOnly: true },
        labels: { type: 'object', additionalProperties: { type: 'string' } },
        annotations: { type: 'any' },
      },
    },
  },
  resources: {
    projects: {
      resources: {
        secrets: {
          methods: {
            list: {
              id: 'secretmanager.projects.secrets.list',
              path: 'v1/{+parent}/secrets',
              flatPath: 'v1/projects/{projectsId}/secrets',
              httpMethod: 'GET',
              parameters: {
                parent: { type: 'string', location: 'path', required: true },
                pageSize: { type: 'integer', format: 'int32', location: 'query', maximum: '25000' },
                pageToken: { type: 'string', location: 'query' },
              },
              response: { $ref: 'ListSecretsResponse' },
              scopes: [SCOPE],
            },
            delete: {
              id: 'secretmanager.projects.secrets.delete',
              path: 'v1/{+name}',
              flatPath: 'v1/projects/{projectsId}/secrets/{secretsId}',
              httpMethod: 'DELETE',
              parameters: { name: { type: 'string', location: 'path', required: true } },
              scopes: [SCOPE],
            },
          },
          resources: {
            versions: {
              methods: {
                access: {
                  id: 'secretmanager.projects.secrets.versions.access',
                  path: 'v1/{+name}:access',
                  flatPath:
                    'v1/projects/{projectsId}/secrets/{secretsId}/versions/{versionsId}:access',
                  httpMethod: 'GET',
                  parameters: { name: { type: 'string', location: 'path', required: true } },
                  response: { $ref: 'AccessSecretVersionResponse' },
                  scopes: [SCOPE],
                },
              },
            },
          },
        },
      },
    },
    users: {
      resources: {
        messages: {
          methods: {
            send: {
              id: 'gmail.users.messages.send',
              path: 'gmail/v1/users/{userId}/messages/send',
              httpMethod: 'POST',
              parameters: {
                userId: { type: 'string', location: 'path', required: true },
                labelIds: { type: 'string', location: 'query', repeated: true },
              },
              request: { $ref: 'SecretPayload' },
              supportsMediaUpload: true,
              mediaUpload: {
                accept: ['message/*'],
                protocols: { simple: { path: '/upload/gmail/v1/users/{userId}/messages/send' } },
              },
            },
          },
        },
      },
    },
  },
};

const converted = convertDiscovery(discovery);
const paths = converted.paths as Record<string, Record<string, Record<string, unknown>>>;

describe('convertDiscovery', () => {
  it('recognizes Discovery documents', () => {
    expect(isDiscoveryDocument(discovery)).toBe(true);
    expect(isDiscoveryDocument({ openapi: '3.0.3' })).toBe(false);
  });

  it('serves methods at their flat paths under rootUrl and servicePath', () => {
    expect(converted.servers).toEqual([{ url: 'https://secretmanager.googleapis.com' }]);
    expect(Object.keys(paths).sort()).toEqual([
      '/gmail/v1/users/{userId}/messages/send',
      '/upload/gmail/v1/users/{userId}/messages/send',
      '/v1/projects/{projectsId}/secrets',
      '/v1/projects/{projectsId}/secrets/{secretsId}',
      '/v1/projects/{projectsId}/secrets/{secretsId}/versions/{versionsId}:access',
    ]);
  });

  it('keeps parameter locations and adds the API-wide ones', () => {
    expect(paths['/v1/projects/{projectsId}/secrets'].get.parameters).toEqual([
      { name: 'projectsId', in: 'path', required: true, schema: { type: 'string' } },
      {
        name: 'alt',
        in: 'query',
        schema: { type: 'string', enum: ['json', 'media'], default: 'json' },
      },
      { name: 'key', in: 'query', schema: { type: 'string' } },
      {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', format: 'int32', maximum: 25000 },
      },
      { name: 'pageToken', in: 'query', schema: { type: 'string' } },
    ]);
    expect(paths['/gmail/v1/users/{userId}/messages/send'].post.parameters).toContainEqual({
      name: 'labelIds',
      in: 'query',
      schema: { type: 'array', items: { type: 'string' } },
    });
  });

  it('converts schemas to components, with draft 3 required flags', () => {
    expect(converted.components).toEqual(
      expect.objectContaining({
        schemas: expect.objectContaining({
          SecretPayload: {
            type: 'object',
            properties: {
              data: { type: 'string', format: 'byte' },
              dataCrc32c: { type: 'string', format: 'int64' },
            },
            required: ['data'],
          },
          Secret: {
            type: 'object',
            properties: {
              name: { type: 'string', readOnly: true },
              labels: { type: 'object', additionalProperties: { type: 'string' } },
              annotations: {},
            },
          },
        }),
      })
    );
  });

  it('turns OAuth scopes into security requirements', () => {
    const { get } = paths['/v1/projects/{projectsId}/secrets'];
    expect(get.security).toEqual([{ Oauth2: [SCOPE] }]);
    expect(paths['/gmail/v1/users/{userId}/messages/send'].post.security).toBeUndefined();
  });

  it('serves simple media uploads from rootUrl', () => {
    const upload = paths['/upload/gmail/v1/users/{userId}/messages/send'].post;
    expect(upload.servers).toEqual([{ url: 'https://secretmanager.googleapis.com' }]);
    expect(Object.keys((upload.requestBody as { content: object }).content)).toEqual([
      'message/*',
      'multipart/related',
    ]);
  });

  it('lets the contract mock match and validate requests, including custom verbs', async () => {
    const { fetch, calls } = createContractMockFetch({ specs: [converted] });
    const headers = { authorization: 'Bearer token' };
    const base = 'https://secretmanager.googleapis.com/v1/projects/p1/secrets';

    const access = await fetch(`${base}/s1/versions/latest:access`, { headers });
    const list = await fetch(`${base}?pageSize=50000`, { headers });
    await fetch(`${base}/s1`, { method: 'DELETE', headers });

    expect(access.status).toBe(200);
    expect(await access.json()).toEqual(
      expect.objectContaining({ payload: expect.objectContaining({ data: expect.any(String) }) })
    );
    expect(list.status).toBe(422);
    expect(calls.map(({ operation, status }) => [operation, status])).toEqual([
      ['secretmanager.projects.secrets.versions.access', 200],
      ['secretmanager.projects.secrets.list', 422],
      ['secretmanager.projects.secrets.delete', 200],
    ]);
  });
});
