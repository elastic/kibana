/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_HMR_PORT = 5678;

export class HmrServer {
  private readonly server: http.Server;
  private readonly clients = new Set<http.ServerResponse>();
  private readonly basePath: string;
  private readonly log?: ToolingLog;
  private assignedPort = 0;
  private lastState: Record<string, unknown> | null = null;

  constructor(basePath?: string, log?: ToolingLog) {
    this.basePath = basePath ?? '';
    this.log = log;

    this.server = http.createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        });
        res.end();
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        Connection: 'keep-alive',
      });

      res.write('\n');
      this.clients.add(res);

      res.write(`data: ${JSON.stringify({ basePath: this.basePath })}\n\n`);

      if (this.lastState) {
        res.write(`data: ${JSON.stringify({ ...this.lastState, replay: true })}\n\n`);
      }

      req.on('close', () => {
        this.clients.delete(res);
      });
    });
  }

  /**
   * Start the HMR server.
   *
   * Tries to bind to the requested port (KBN_HMR_PORT or 5678). If that port
   * is already in use — typically a zombie optimizer from a previous dev
   * session — falls back to an OS-assigned ephemeral port and logs a warning
   * so the new dev session can proceed instead of failing the whole build.
   *
   * The bundled HMR client always uses the port returned here (via the
   * compile config) so any port is safe at the network layer.
   */
  start(): Promise<number> {
    const envPort = process.env.KBN_HMR_PORT;
    const requestedPort =
      envPort !== undefined && envPort !== '' ? Number(envPort) : DEFAULT_HMR_PORT;

    return this.tryListen(requestedPort).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'EADDRINUSE') {
        throw err;
      }
      this.log?.warning(
        `HMR port ${requestedPort} is already in use ` +
          `(likely a leftover @kbn/rspack-optimizer worker — check \`lsof -i :${requestedPort}\`). ` +
          `Falling back to an ephemeral port.`
      );
      return this.tryListen(0);
    });
  }

  private tryListen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        this.server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        this.server.removeListener('error', onError);
        const addr = this.server.address();
        this.assignedPort = typeof addr === 'object' && addr ? addr.port : port;
        resolve(this.assignedPort);
      };
      this.server.once('error', onError);
      this.server.once('listening', onListening);
      this.server.listen(port, '127.0.0.1');
    });
  }

  public get port(): number {
    return this.assignedPort;
  }

  broadcast(hash: string, time?: string, files?: string[]): void {
    this.lastState = { hash, time, files };
    const payload = `data: ${JSON.stringify(this.lastState)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  broadcastBuilding(): void {
    this.lastState = { building: true };
    const payload = `data: ${JSON.stringify(this.lastState)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  broadcastErrors(errors: string[]): void {
    this.lastState = { errors };
    const payload = `data: ${JSON.stringify(this.lastState)}\n\n`;
    for (const client of this.clients) {
      client.write(payload);
    }
  }

  close(): Promise<void> {
    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();

    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}
