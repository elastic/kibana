/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import {
  detectKibana,
  listConnectors,
  createConnector,
  executeConnector,
  updateConnector,
  KibanaRequestError,
} from './kibana_client';

let server: http.Server | undefined;
let port: number;

function createTestServer(handler: http.RequestListener): Promise<void> {
  return new Promise((resolve) => {
    const s = http.createServer(handler);
    server = s;
    s.listen(0, () => {
      port = (s.address() as any).port;
      resolve();
    });
  });
}

afterEach((done) => {
  if (server) {
    const s = server;
    server = undefined;
    s.close(done);
  } else {
    done();
  }
});

describe('detectKibana', () => {
  it('detects a running Kibana and returns connection info', async () => {
    await createTestServer((req, res) => {
      if (req.url === '/api/status') {
        res.writeHead(200);
        res.end('{}');
      } else if (req.url === '/internal/security/me') {
        const auth = req.headers.authorization;
        if (auth === 'Basic ' + Buffer.from('elastic:changeme').toString('base64')) {
          res.writeHead(200);
          res.end('{}');
        } else {
          res.writeHead(401);
          res.end();
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const result = await detectKibana({ urls: [`http://localhost:${port}`] });
    expect(result).toEqual({
      url: `http://localhost:${port}`,
      auth: 'elastic:changeme',
    });
  });

  it('throws when no Kibana is reachable', async () => {
    await expect(detectKibana({ urls: ['http://localhost:1'] })).rejects.toThrow(
      /Could not detect a running Kibana/
    );
  });
});

describe('listConnectors', () => {
  it('returns parsed connector list', async () => {
    const connectors = [{ id: '1', name: 'GitHub (testing)', connector_type_id: '.github' }];
    await createTestServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(connectors));
    });

    const result = await listConnectors({
      url: `http://localhost:${port}`,
      auth: 'elastic:changeme',
    });
    expect(result).toEqual(connectors);
  });
});

describe('createConnector', () => {
  it('posts connector payload and returns the response', async () => {
    let receivedBody = '';
    await createTestServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        receivedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'new-id', name: 'Test' }));
      });
    });

    const result = await createConnector(
      { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
      {
        connector_type_id: '.github',
        name: 'GitHub (testing)',
        config: { serverUrl: 'https://example.com' },
        secrets: { authType: 'bearer', token: 'ghp_xxx' },
      }
    );

    expect(result).toEqual({ id: 'new-id', name: 'Test' });
    const parsed = JSON.parse(receivedBody);
    expect(parsed.connector_type_id).toBe('.github');
    expect(parsed.secrets.authType).toBe('bearer');
  });

  it('throws on non-2xx response', async () => {
    await createTestServer((_req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad request' }));
    });

    await expect(
      createConnector(
        { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
        {
          connector_type_id: '.bad',
          name: 'Bad',
          config: {},
          secrets: { authType: 'bearer', token: 'x' },
        }
      )
    ).rejects.toThrow(/400/);
  });
});

describe('executeConnector', () => {
  const params = { subAction: 'getMe', subActionParams: {} };

  it('posts the sub-action params to the execute endpoint and returns the result', async () => {
    let receivedUrl = '';
    let receivedBody = '';
    await createTestServer((req, res) => {
      receivedUrl = req.url ?? '';
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        receivedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connector_id: 'abc', status: 'ok', data: { login: 'octocat' } }));
      });
    });

    const result = await executeConnector(
      { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
      'abc',
      params
    );

    expect(receivedUrl).toBe('/api/actions/connector/abc/_execute');
    expect(JSON.parse(receivedBody)).toEqual({ params });
    expect(result).toEqual({ connector_id: 'abc', status: 'ok', data: { login: 'octocat' } });
  });

  it('returns connector errors reported with HTTP 200', async () => {
    await createTestServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          connector_id: 'abc',
          status: 'error',
          message: 'Request failed with status code 401',
          error_meta: { statusCode: 401 },
        })
      );
    });

    const result = await executeConnector(
      { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
      'abc',
      params
    );

    expect(result.status).toBe('error');
    expect(result.error_meta).toEqual({ statusCode: 401 });
  });

  it('throws a KibanaRequestError carrying the status code on non-2xx responses', async () => {
    await createTestServer((_req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Invalid params' }));
    });

    const error = await executeConnector(
      { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
      'abc',
      params
    ).catch((e) => e);

    expect(error).toBeInstanceOf(KibanaRequestError);
    expect(error.statusCode).toBe(400);
  });

  it('rejects when the request exceeds the timeout', async () => {
    await createTestServer(() => {
      // never respond
    });

    await expect(
      executeConnector(
        { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
        'abc',
        params,
        { timeoutMs: 50 }
      )
    ).rejects.toThrow(/timed out/);
  });

  it('leaves no deadline timer behind when the request cannot even be created', async () => {
    jest.useFakeTimers();
    try {
      await expect(
        executeConnector({ url: 'http://[invalid', auth: 'elastic:changeme' }, 'abc', params)
      ).rejects.toThrow();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects when the response keeps trickling in past the deadline', async () => {
    await createTestServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const interval = setInterval(() => res.write(' '), 10);
      res.on('close', () => clearInterval(interval));
    });

    await expect(
      executeConnector(
        { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
        'abc',
        params,
        { timeoutMs: 100 }
      )
    ).rejects.toThrow(/timed out/);
  });
});

describe('updateConnector', () => {
  it('puts the name, config and secrets to the connector endpoint', async () => {
    let receivedMethod = '';
    let receivedUrl = '';
    let receivedBody = '';
    await createTestServer((req, res) => {
      receivedMethod = req.method ?? '';
      receivedUrl = req.url ?? '';
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        receivedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'abc', name: 'GitHub (testing)' }));
      });
    });

    const payload = { name: 'GitHub (testing)', config: {}, secrets: { token: 'new' } };
    const result = await updateConnector(
      { url: `http://localhost:${port}`, auth: 'elastic:changeme' },
      'abc',
      payload
    );

    expect(receivedMethod).toBe('PUT');
    expect(receivedUrl).toBe('/api/actions/connector/abc');
    expect(JSON.parse(receivedBody)).toEqual(payload);
    expect(result).toEqual({ id: 'abc', name: 'GitHub (testing)' });
  });

  it('throws on a non-2xx response', async () => {
    await createTestServer((_req, res) => {
      res.writeHead(404);
      res.end('not found');
    });

    await expect(
      updateConnector({ url: `http://localhost:${port}`, auth: 'elastic:changeme' }, 'abc', {
        name: 'x',
        config: {},
        secrets: {},
      })
    ).rejects.toThrow(/404/);
  });
});
