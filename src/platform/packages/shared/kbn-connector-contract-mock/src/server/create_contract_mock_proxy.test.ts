/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Agent as HttpAgent } from 'http';
import { request as httpRequest } from 'http';
import type { Agent as HttpsAgent } from 'https';
import { request as httpsRequest } from 'https';
import type { CustomHostSettings } from '@kbn/actions-utils';
import { getCustomAgents } from '@kbn/actions-utils';
import { loggerMock } from '@kbn/logging-mocks';
import type { OpenApiDocument } from '../openapi';
import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import { createCertificateAuthority } from './certificate_authority';
import type { ContractMockProxy } from './create_contract_mock_proxy';
import { createContractMockProxy } from './create_contract_mock_proxy';

const spec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Vendor', version: '1' },
  servers: [{ url: 'https://api.vendor.example/v1' }, { url: 'http://plain.vendor.example' }],
  components: {
    securitySchemes: { key: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
  },
  security: [{ key: [] }],
  paths: {
    '/items/{id}': {
      get: {
        operationId: 'getItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'The item',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: { id: { type: 'integer' } },
                },
              },
            },
          },
        },
      },
    },
    '/items': {
      post: {
        operationId: 'createItem',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: { '204': { description: 'Created' } },
      },
    },
  },
};

interface SentRequest {
  readonly method?: string;
  readonly body?: string;
  readonly agent: HttpAgent | HttpsAgent | undefined;
}

const send = (url: string, { method = 'GET', body, agent }: SentRequest) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = (url.startsWith('https:') ? httpsRequest : httpRequest)(
      url,
      {
        method,
        agent,
        headers: {
          'x-api-key': 'any',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (text += chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: text }));
      }
    );
    request.on('error', reject);
    request.end(body);
  });

describe('createContractMockProxy', () => {
  const certificateAuthority = createCertificateAuthority();
  let mock: ReturnType<typeof createContractMockFetch>;
  let proxy: ContractMockProxy;
  let proxyUrl: URL;

  // The agents Kibana's actions plugin builds for `xpack.actions.proxyUrl`, trusting the mock's CA
  // for the vendor host through `xpack.actions.customHostSettings`.
  const kibanaAgents = (url: string, customHostSettings?: CustomHostSettings) =>
    getCustomAgents({
      logger: loggerMock.create(),
      proxySettings: {
        proxyUrl: proxyUrl.href,
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
        proxySSLSettings: {},
      },
      sslSettings: { verificationMode: 'full' },
      customHostSettings,
      url,
    });

  const trustingCa = (url: string) =>
    kibanaAgents(url, {
      url: new URL(url).origin,
      ssl: { certificateAuthoritiesData: certificateAuthority.cert },
    });

  beforeEach(async () => {
    mock = createContractMockFetch({ specs: [spec] });
    proxy = createContractMockProxy({ fetch: mock.fetch, certificateAuthority });
    proxyUrl = await proxy.listen();
  });

  afterEach(async () => {
    await proxy.close();
  });

  it('answers HTTPS requests tunnelled through CONNECT, with a certificate for the vendor host', async () => {
    const url = 'https://api.vendor.example/v1/items/42';

    const response = await send(url, { agent: trustingCa(url).httpsAgent });

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ id: expect.any(Number) });
    expect(mock.calls).toEqual([
      expect.objectContaining({
        request: 'GET https://api.vendor.example/v1/items/42',
        operation: 'getItem',
        status: 200,
        requestViolations: [],
      }),
    ]);
  });

  it('fails the TLS handshake for clients that do not trust the certificate authority', async () => {
    const url = 'https://api.vendor.example/v1/items/42';

    await expect(send(url, { agent: kibanaAgents(url).httpsAgent })).rejects.toThrow(/certificate/);
    expect(mock.calls).toEqual([]);
  });

  it('passes request bodies to the mock, which validates them', async () => {
    const url = 'https://api.vendor.example/v1/items';
    const { httpsAgent } = trustingCa(url);

    const invalid = await send(url, { method: 'POST', body: '{"name":1}', agent: httpsAgent });
    const valid = await send(url, { method: 'POST', body: '{"name":"x"}', agent: httpsAgent });

    expect(invalid.status).toBe(422);
    expect(JSON.parse(invalid.body)).toEqual({
      operation: 'createItem',
      violations: [expect.objectContaining({ path: ['body', 'name'] })],
    });
    expect(valid).toEqual({ status: 204, body: '' });
  });

  it('answers plain HTTP requests sent in absolute form', async () => {
    const url = 'http://plain.vendor.example/items/7';

    const response = await send(url, { agent: kibanaAgents(url).httpAgent });

    expect(response.status).toBe(200);
    expect(mock.calls).toEqual([
      expect.objectContaining({ request: 'GET http://plain.vendor.example/items/7', status: 200 }),
    ]);
  });

  it('answers 400 to requests sent to the proxy as if it were the vendor', async () => {
    const response = await send(new URL('/items/7', proxyUrl).href, { agent: undefined });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({ title: 'Not a proxy request' })
    );
  });

  it('answers 502 when the mock throws', async () => {
    await proxy.close();
    proxy = createContractMockProxy({
      fetch: () => Promise.reject(new Error('boom')),
      certificateAuthority,
    });
    proxyUrl = await proxy.listen();
    const url = 'http://plain.vendor.example/items/7';

    const response = await send(url, { agent: kibanaAgents(url).httpAgent });

    expect(response.status).toBe(502);
    expect(JSON.parse(response.body).detail).toContain('boom');
  });
});
