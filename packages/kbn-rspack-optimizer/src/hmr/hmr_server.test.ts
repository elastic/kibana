/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import { HmrServer } from './hmr_server';

const connectClient = (port: number): Promise<{ res: http.IncomingMessage; data: string[] }> =>
  new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      const data: string[] = [];
      res.setEncoding('utf8');
      res.on('data', (chunk) => data.push(chunk));
      resolve({ res, data });
    });
    req.on('error', reject);
  });

describe('HmrServer', () => {
  let server: HmrServer;

  afterEach(async () => {
    await server?.close();
  });

  it('starts and listens on the requested port', async () => {
    // Use an OS-assigned ephemeral port so the test does not assume a specific
    // host port (e.g. 5678) is free — common when a dev server is also running.
    const original = process.env.KBN_HMR_PORT;
    process.env.KBN_HMR_PORT = '0';

    try {
      server = new HmrServer();
      const port = await server.start();
      expect(port).toBeGreaterThan(0);
      expect(server.port).toBe(port);
    } finally {
      if (original === undefined) {
        delete process.env.KBN_HMR_PORT;
      } else {
        process.env.KBN_HMR_PORT = original;
      }
    }
  });

  it('returns correct SSE headers', async () => {
    server = new HmrServer();
    const port = await server.start();
    const { res } = await connectClient(port);

    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['access-control-allow-origin']).toBe('*');

    res.destroy();
  });

  it('broadcasts hash events to a connected client', async () => {
    server = new HmrServer();
    const port = await server.start();
    const { res, data } = await connectClient(port);

    // Small delay for the connection to register
    await new Promise((r) => setTimeout(r, 50));

    server.broadcast('abc123');

    await new Promise((r) => setTimeout(r, 50));

    const combined = data.join('');
    expect(combined).toContain('data: {"hash":"abc123"}');

    res.destroy();
  });

  it('broadcasts to multiple clients', async () => {
    server = new HmrServer();
    const port = await server.start();

    const client1 = await connectClient(port);
    const client2 = await connectClient(port);

    await new Promise((r) => setTimeout(r, 50));

    server.broadcast('multi');

    await new Promise((r) => setTimeout(r, 50));

    expect(client1.data.join('')).toContain('"hash":"multi"');
    expect(client2.data.join('')).toContain('"hash":"multi"');

    client1.res.destroy();
    client2.res.destroy();
  });

  it('handles client disconnection gracefully', async () => {
    server = new HmrServer();
    const port = await server.start();
    const { res } = await connectClient(port);

    await new Promise((r) => setTimeout(r, 50));

    res.destroy();

    // Allow the close event to propagate
    await new Promise((r) => setTimeout(r, 50));

    // Should not throw when broadcasting after client disconnect
    expect(() => server.broadcast('afterDisconnect')).not.toThrow();
  });

  it('broadcastErrors() sends error events to connected clients', async () => {
    server = new HmrServer();
    const port = await server.start();
    const { res, data } = await connectClient(port);

    await new Promise((r) => setTimeout(r, 50));

    server.broadcastErrors(['Syntax Error in foo.tsx', 'Missing import in bar.ts']);

    await new Promise((r) => setTimeout(r, 50));

    const combined = data.join('');
    expect(combined).toContain('"errors":["Syntax Error in foo.tsx","Missing import in bar.ts"]');

    res.destroy();
  });

  it('broadcastErrors() with no connected clients does not throw', async () => {
    server = new HmrServer();
    await server.start();

    expect(() => server.broadcastErrors(['some error'])).not.toThrow();
  });

  it('close() tears down cleanly', async () => {
    server = new HmrServer();
    const port = await server.start();

    const { res } = await connectClient(port);
    await new Promise((r) => setTimeout(r, 50));

    await server.close();

    // Verify server is no longer listening by attempting a connection
    await expect(
      new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, resolve);
        req.on('error', reject);
      })
    ).rejects.toThrow();

    res.destroy();
  });

  it('respects KBN_HMR_PORT environment variable', async () => {
    const original = process.env.KBN_HMR_PORT;
    process.env.KBN_HMR_PORT = '15678';

    try {
      server = new HmrServer();
      const port = await server.start();
      expect(port).toBe(15678);
    } finally {
      if (original === undefined) {
        delete process.env.KBN_HMR_PORT;
      } else {
        process.env.KBN_HMR_PORT = original;
      }
    }
  });

  describe('port-collision fallback', () => {
    let squatter: http.Server;
    let squattedPort: number;
    let originalEnv: string | undefined;

    beforeEach(async () => {
      originalEnv = process.env.KBN_HMR_PORT;
      squatter = http.createServer();
      await new Promise<void>((resolve, reject) => {
        squatter.once('error', reject);
        squatter.listen(0, '127.0.0.1', () => resolve());
      });
      const addr = squatter.address();
      if (!addr || typeof addr !== 'object') {
        throw new Error('Failed to capture squatter port');
      }
      squattedPort = addr.port;
      process.env.KBN_HMR_PORT = String(squattedPort);
    });

    afterEach(async () => {
      if (originalEnv === undefined) {
        delete process.env.KBN_HMR_PORT;
      } else {
        process.env.KBN_HMR_PORT = originalEnv;
      }
      await new Promise<void>((resolve) => squatter.close(() => resolve()));
    });

    it('falls back to an ephemeral port when the requested port is in use', async () => {
      server = new HmrServer();
      const port = await server.start();

      expect(port).not.toBe(squattedPort);
      expect(port).toBeGreaterThan(0);
      expect(server.port).toBe(port);
    });

    it('emits a warning explaining the fallback when a log is provided', async () => {
      const warning = jest.fn();
      const log = { warning } as unknown as ConstructorParameters<typeof HmrServer>[1];

      server = new HmrServer(undefined, log);
      await server.start();

      expect(warning).toHaveBeenCalledTimes(1);
      const message: string = warning.mock.calls[0][0];
      expect(message).toContain(`HMR port ${squattedPort} is already in use`);
      expect(message).toContain(`lsof -i :${squattedPort}`);
      expect(message).toMatch(/ephemeral port/i);
    });

    it('serves SSE traffic on the fallback port', async () => {
      server = new HmrServer();
      const port = await server.start();
      const { res, data } = await connectClient(port);

      await new Promise((r) => setTimeout(r, 50));

      server.broadcast('after-fallback');

      await new Promise((r) => setTimeout(r, 50));

      expect(data.join('')).toContain('"hash":"after-fallback"');
      res.destroy();
    });
  });

  describe('basePath welcome message', () => {
    let originalPort: string | undefined;

    beforeEach(() => {
      originalPort = process.env.KBN_HMR_PORT;
      process.env.KBN_HMR_PORT = '35678';
    });

    afterEach(() => {
      if (originalPort === undefined) {
        delete process.env.KBN_HMR_PORT;
      } else {
        process.env.KBN_HMR_PORT = originalPort;
      }
    });

    it('sends basePath on client connect', async () => {
      server = new HmrServer('/abc');
      const port = await server.start();
      const { res, data } = await connectClient(port);

      await new Promise((r) => setTimeout(r, 50));

      const combined = data.join('');
      expect(combined).toContain('data: {"basePath":"/abc"}');

      res.destroy();
    });

    it('sends empty basePath when constructed without one', async () => {
      server = new HmrServer();
      const port = await server.start();
      const { res, data } = await connectClient(port);

      await new Promise((r) => setTimeout(r, 50));

      const combined = data.join('');
      expect(combined).toContain('data: {"basePath":""}');

      res.destroy();
    });

    it('sends basePath before replay message', async () => {
      server = new HmrServer('/xyz');
      const port = await server.start();

      server.broadcast('hash123');

      const { res, data } = await connectClient(port);

      await new Promise((r) => setTimeout(r, 50));

      const combined = data.join('');
      const basePathIdx = combined.indexOf('"basePath":"/xyz"');
      const replayIdx = combined.indexOf('"replay":true');
      expect(basePathIdx).toBeGreaterThan(-1);
      expect(replayIdx).toBeGreaterThan(-1);
      expect(basePathIdx).toBeLessThan(replayIdx);

      res.destroy();
    });
  });
});
