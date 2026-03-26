/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';

const DEFAULT_HMR_PORT = 5678;

export class HmrServer {
  private readonly server: http.Server;
  private readonly clients = new Set<http.ServerResponse>();
  private assignedPort = 0;

  constructor() {
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

      req.on('close', () => {
        this.clients.delete(res);
      });
    });
  }

  start(): Promise<number> {
    const port = Number(process.env.KBN_HMR_PORT) || DEFAULT_HMR_PORT;

    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, '127.0.0.1', () => {
        const addr = this.server.address();
        this.assignedPort = typeof addr === 'object' && addr ? addr.port : port;
        resolve(this.assignedPort);
      });
    });
  }

  get port(): number {
    return this.assignedPort;
  }

  broadcast(hash: string): void {
    const payload = `data: ${JSON.stringify({ hash })}\n\n`;
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
