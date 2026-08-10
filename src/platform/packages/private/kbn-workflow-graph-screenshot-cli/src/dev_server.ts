/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type { GraphConfig } from './page_template';
import { buildIndexHtml, buildPageHtml } from './page_template';

export interface WorkflowEntry {
  readonly name: string;
  readonly yamlPath: string;
}

export interface DevServer {
  readonly port: number;
  readonly close: () => Promise<void>;
}

const MIME: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const mimeFor = (filePath: string): string =>
  MIME[path.extname(filePath)] ?? 'application/octet-stream';

/**
 * Starts a minimal HTTP server that serves:
 *   GET /           → index listing all workflows
 *   GET /w/:index   → per-workflow page (injects YAML + config as globals, mounts the bundle)
 *   GET /bundle.js  → the pre-built browser bundle
 *   GET /*          → any other file from the bundle directory (fonts, assets)
 */
export const startDevServer = async (
  entries: readonly WorkflowEntry[],
  bundleDir: string,
  config: GraphConfig,
  width: number,
  height: number
): Promise<DevServer> => {
  const indexHtml = buildIndexHtml(entries.map((e, i) => ({ name: e.name, index: i })));

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? '/';

    try {
      // Index page
      if (url === '/' || url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexHtml);
        return;
      }

      // Per-workflow page: /w/<index>
      const workflowMatch = url.match(/^\/w\/(\d+)(?:\?.*)?$/);
      if (workflowMatch) {
        const index = parseInt(workflowMatch[1], 10);
        const entry = entries[index];
        if (!entry) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end(`Workflow index ${index} not found (max: ${entries.length - 1})`);
          return;
        }
        const yamlString = await fs.readFile(entry.yamlPath, 'utf8');
        const html = buildPageHtml(yamlString, config, width, height);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // Static files from bundle dir
      const safeName = url.split('?')[0].replace(/^\/+/, '');
      const filePath = path.join(bundleDir, safeName);

      // Basic path traversal guard
      if (!filePath.startsWith(bundleDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeFor(filePath) });
      res.end(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not found: ${url}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal error: ${msg}`);
      }
    }
  });

  const port = await new Promise<number>((resolve, reject) => {
    // Port 0 → OS assigns a free port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Unexpected server address'));
        return;
      }
      resolve(addr.port);
    });
    server.once('error', reject);
  });

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));

  return { port, close };
};
