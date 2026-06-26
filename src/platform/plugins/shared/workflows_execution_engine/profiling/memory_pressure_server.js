/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal HTTP server that returns a configurable-size JSON payload.
 * Used by the profiling harness to produce deterministic large step outputs.
 *
 * Usage:
 *   node profiling/memory_pressure_server.js [port] [payloadKb]
 *
 * Defaults: port=19876, payloadKb=512
 *
 * The server responds to any GET/POST request with:
 *   { "data": "<string of payloadKb * 1024 'x' chars>", "size": <bytes> }
 */

const http = require('http');

const port = parseInt(process.argv[2] || '19876', 10);
const payloadKb = parseInt(process.argv[3] || '512', 10);
const payloadBytes = payloadKb * 1024;

// Pre-generate one body per endpoint index so /payload/N returns unique bytes.
// Without this every endpoint returns identical content → same SHA-256 → one
// cache entry shared by all steps, which makes multi-step profiling misleading.
const cache = new Map();
const getBody = (index) => {
  if (cache.has(index)) return cache.get(index);
  // Prefix with a fixed-width index tag so content differs across endpoints.
  const tag = `[endpoint:${String(index).padStart(6, '0')}]`;
  const data = tag + 'x'.repeat(Math.max(0, payloadBytes - tag.length));
  const body = JSON.stringify({ data, size: payloadBytes, endpoint: index });
  cache.set(index, body);
  return body;
};

const server = http.createServer((req, res) => {
  // Extract trailing numeric segment from path, e.g. /payload/7 → 7.
  // Falls back to 0 for any other path so the server remains broadly usable.
  const match = req.url && req.url.match(/(\d+)\/?$/);
  const index = match ? parseInt(match[1], 10) : 0;
  const body = getBody(index);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(
    `memory_pressure_server listening on http://127.0.0.1:${port} (payload=${payloadKb}kb)\n`
  );
});
