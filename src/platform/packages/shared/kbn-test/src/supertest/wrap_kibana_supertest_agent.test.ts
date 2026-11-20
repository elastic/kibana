/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'node:http';
import { kibanaSupertest } from './kibana_supertest';

describe('wrapKibanaSupertestAgent', () => {
  it('preserves .query() params when the request runs', async () => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.searchParams.get('apiVersion') !== '1') {
        res.writeHead(400);
        res.end('missing apiVersion');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    try {
      const client = kibanaSupertest(`http://127.0.0.1:${port}`);
      const { body } = await client
        .get('/api/example')
        .query({ apiVersion: '1', elasticInternalOrigin: 'true' })
        .expect(200);

      expect(body).toEqual({ ok: true });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it('preserves Connection header when the request runs', async () => {
    let requestConnection: string | undefined;
    const server = http.createServer((req, res) => {
      requestConnection = req.headers.connection;
      res.writeHead(200, { 'Content-Type': 'application/json', Connection: 'keep-alive' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    try {
      const client = kibanaSupertest(`http://127.0.0.1:${port}`);
      const { header } = await client.get('/').set('Connection', 'keep-alive').expect(200);

      expect(requestConnection).toBe('keep-alive');
      expect(header.connection).toBe('keep-alive');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  describe('ELU 429 retries', () => {
    const startServer = async (handler: http.RequestListener) => {
      const server = http.createServer(handler);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const { port } = server.address() as { port: number };
      const close = () =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((err) => (err ? reject(err) : resolve()));
        });
      return { url: `http://127.0.0.1:${port}`, close };
    };

    const overloaded = (res: http.ServerResponse, retryAfter = '0') => {
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': retryAfter,
        RateLimit: `"elu";r=0;t=${retryAfter}`,
      });
      res.end('Server is overloaded');
    };

    it('sends the request untouched when there is no 429 (json body keeps content-type)', async () => {
      const seen: Array<{ contentType?: string; body: string }> = [];
      const { url, close } = await startServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          seen.push({ contentType: req.headers['content-type'], body });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{}');
        });
      });

      try {
        await kibanaSupertest(url).post('/api/example').send({ a: 1 }).expect(200);
        expect(seen).toEqual([{ contentType: 'application/json', body: '{"a":1}' }]);
      } finally {
        await close();
      }
    });

    it('retries a 429 rejected by .expect() and resends headers and body', async () => {
      const seen: Array<{ header?: string; body: string }> = [];
      const { url, close } = await startServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          seen.push({ header: req.headers['kbn-xsrf'] as string, body });
          if (seen.length === 1) {
            overloaded(res);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        });
      });

      try {
        const { body } = await kibanaSupertest(url)
          .post('/api/example')
          .set('kbn-xsrf', 'true')
          .send({ a: 1 })
          .expect(200);

        expect(body).toEqual({ ok: true });
        expect(seen).toEqual([
          { header: 'true', body: '{"a":1}' },
          { header: 'true', body: '{"a":1}' },
        ]);
      } finally {
        await close();
      }
    });

    it('retries when using .end(callback)', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        if (attempts === 1) {
          overloaded(res);
          return;
        }
        res.writeHead(200);
        res.end();
      });

      try {
        const status = await new Promise<number>((resolve, reject) => {
          kibanaSupertest(url)
            .get('/')
            .end((err, res) => (err ? reject(err) : resolve(res.status)));
        });
        expect(status).toBe(200);
        expect(attempts).toBe(2);
      } finally {
        await close();
      }
    });

    it('sends the request once when awaited twice', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        res.writeHead(200);
        res.end();
      });

      try {
        const request = kibanaSupertest(url).get('/');
        await Promise.all([request, request]);
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('settles an aborted in-flight request instead of hanging', async () => {
      const { url, close } = await startServer(() => {
        // never respond
      });

      try {
        const request = kibanaSupertest(url).get('/');
        const settled = request.then(
          () => 'resolved',
          (error: { code?: string }) => error.code
        );
        setTimeout(() => request.abort(), 100);
        await expect(settled).resolves.toBe('ABORTED');
      } finally {
        await close();
      }
    });

    it('does not retry when Retry-After exceeds the remaining budget', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        overloaded(res, '30');
      });

      try {
        await expect(
          kibanaSupertest(url, undefined, { maxRetryMs: 1000 }).get('/').expect(200)
        ).rejects.toThrow();
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('does not retry other failures', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        res.writeHead(500);
        res.end();
      });

      try {
        await expect(kibanaSupertest(url).get('/').expect(200)).rejects.toThrow();
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('does not retry a 429 without the ELU RateLimit header, even with the overload message', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Server is overloaded');
      });

      try {
        await expect(kibanaSupertest(url).get('/').expect(200)).rejects.toThrow();
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('reports each retry through onRetry', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        if (attempts < 3) {
          overloaded(res);
          return;
        }
        res.writeHead(200);
        res.end();
      });

      try {
        const onRetry = jest.fn();
        await kibanaSupertest(url, undefined, { onRetry }).get('/ping').expect(200);
        expect(onRetry).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ method: 'GET', attempt: 1 })
        );
        expect(onRetry).toHaveBeenNthCalledWith(2, expect.objectContaining({ attempt: 2 }));
      } finally {
        await close();
      }
    });

    it('leaves the 429 visible for multipart bodies, which cannot be replayed', async () => {
      let attempts = 0;
      const { url, close } = await startServer((req, res) => {
        attempts++;
        req.resume();
        req.on('end', () => overloaded(res));
      });

      try {
        await expect(
          kibanaSupertest(url)
            .post('/import')
            .attach('file', Buffer.from('x'), 'a.ndjson')
            .expect(200)
        ).rejects.toThrow();
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('does not retry past the caller .timeout() deadline', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        overloaded(res, '1');
      });

      try {
        await expect(kibanaSupertest(url).get('/').timeout(500).expect(200)).rejects.toThrow();
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });

    it('does not resend a request aborted during the backoff', async () => {
      let attempts = 0;
      const { url, close } = await startServer((_req, res) => {
        attempts++;
        overloaded(res, '1');
      });

      try {
        const request = kibanaSupertest(url).get('/');
        const settled = request.then(
          () => 'resolved',
          (error: { code?: string }) => error.code
        );
        setTimeout(() => request.abort(), 300);
        await expect(settled).resolves.toBe('ABORTED');
        await new Promise((resolve) => setTimeout(resolve, 1200));
        expect(attempts).toBe(1);
      } finally {
        await close();
      }
    });
  });
});
