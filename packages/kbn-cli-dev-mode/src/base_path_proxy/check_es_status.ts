/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export interface EsStatusResult {
  available: boolean;
  status: number;
  host: string;
}

/**
 * Read elasticsearch.hosts directly from kibana.dev.yml / kibana.yml.
 * This is self-contained — no dependency on ConfigService or rxjs —
 * so it cannot interfere with the main config loading pipeline.
 */
export function getElasticsearchHosts(): string[] {
  try {
    // js-yaml would be cleaner but adds a dependency. For this simple
    // case we can use a basic YAML parser or import getConfigFromFiles.
    // Since @kbn/config is already loaded by the parent process, we
    // dynamically import getConfigFromFiles to keep imports minimal.
    //
    // Fallback: simple regex extraction from the YAML file.
    const cwd = process.cwd();
    for (const name of ['config/kibana.dev.yml', 'config/kibana.yml']) {
      const configPath = resolve(cwd, name);
      if (!existsSync(configPath)) continue;

      const content = readFileSync(configPath, 'utf8');
      // Look for elasticsearch.hosts as a YAML array or single value
      // Pattern 1: elasticsearch.hosts: ["http://..."]  (inline array)
      // Pattern 2: elasticsearch.hosts:\n  - http://...  (block array)
      // Pattern 3: elasticsearch.hosts: http://...       (single value)
      const inlineMatch = content.match(/elasticsearch\.hosts\s*:\s*\[([^\]]+)\]/);
      if (inlineMatch) {
        const hosts = inlineMatch[1]
          .split(',')
          .map((h) => h.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        if (hosts.length > 0) return hosts;
      }

      // Block array: lines starting with "  - " after elasticsearch.hosts:
      const blockMatch = content.match(/elasticsearch\.hosts\s*:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (blockMatch) {
        const hosts = blockMatch[1]
          .split('\n')
          .map((line) =>
            line
              .replace(/^\s+-\s+/, '')
              .trim()
              .replace(/^["']|["']$/g, '')
          )
          .filter(Boolean);
        if (hosts.length > 0) return hosts;
      }

      // Single value
      const singleMatch = content.match(/elasticsearch\.hosts\s*:\s+(?![\[\n])(.+)/);
      if (singleMatch) {
        const host = singleMatch[1].trim().replace(/^["']|["']$/g, '');
        if (host) return [host];
      }
    }
  } catch {
    // Ignore — use default
  }
  return ['http://localhost:9200'];
}

/**
 * Check Elasticsearch availability by trying each configured host.
 *
 * Uses Node.js core `http`/`https` modules instead of `fetch` so we can
 * set `rejectUnauthorized: false` for HTTPS — Elasticsearch 8.x+ uses
 * self-signed certificates by default in dev mode.
 *
 * For each host it also tries the opposite protocol as a fallback
 * (e.g. if `http://localhost:9200` is configured but ES is actually
 * running HTTPS, it will try `https://localhost:9200`).
 */
export async function checkEsStatus(hosts: string[]): Promise<EsStatusResult> {
  for (const host of hosts) {
    const result = await tryHost(host);
    if (result.available) {
      return result;
    }

    // If the configured protocol failed, try the opposite one.
    // ES 8.x defaults to HTTPS even if kibana.yml says http://
    const flippedHost = flipProtocol(host);
    if (flippedHost) {
      const flippedResult = await tryHost(flippedHost);
      if (flippedResult.available) {
        return flippedResult;
      }
    }
  }

  return { available: false, status: 0, host: hosts[0] };
}

function flipProtocol(url: string): string | null {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  if (url.startsWith('https://')) {
    return url.replace('https://', 'http://');
  }
  return null;
}

function tryHost(host: string): Promise<EsStatusResult> {
  return new Promise((resolve) => {
    const isHttps = host.startsWith('https://');
    const module = isHttps ? https : http;

    const options: http.RequestOptions | https.RequestOptions = {
      method: 'HEAD',
      timeout: 3000,
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };

    try {
      const req = module.request(host, options, (res) => {
        // Consume response to free the socket
        res.resume();
        resolve({
          available: (res.statusCode ?? 0) > 0 && (res.statusCode ?? 0) < 500,
          status: res.statusCode ?? 0,
          host,
        });
      });

      req.on('error', () => {
        resolve({ available: false, status: 0, host });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ available: false, status: 0, host });
      });

      req.end();
    } catch {
      resolve({ available: false, status: 0, host });
    }
  });
}
