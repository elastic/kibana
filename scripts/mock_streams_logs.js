/* eslint-disable */
/*
 * Throwaway dev helper: generates realistic, timestamped log documents and
 * bulk-ingests them into a few classic `logs-*-*` data streams so they show up
 * in the Streams app. Safe to delete. Run with: node scripts/mock_streams_logs.js
 */

const http = require('http');

const ES_HOST = 'localhost';
const ES_PORT = 9200;
const AUTH = 'Basic ' + Buffer.from('elastic:changeme').toString('base64');

// Classic data streams to populate (matched by the built-in `logs` template).
const DATA_STREAMS = [
  'logs-web.access-default',
  'logs-app.backend-default',
  'logs-nginx.error-default',
];

const HOSTS = ['host-01', 'host-02', 'host-03', 'edge-eu-1', 'edge-us-1'];
const SERVICES = ['checkout', 'cart', 'payments', 'catalog', 'auth'];
const PATHS = ['/api/cart', '/api/checkout', '/api/products', '/login', '/health', '/api/orders'];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const STATUSES = [200, 200, 200, 201, 204, 301, 400, 401, 404, 500, 503];
const LEVELS = ['info', 'info', 'info', 'debug', 'warn', 'error'];
const MESSAGES = [
  'Request completed',
  'User authenticated',
  'Cache miss for key',
  'Upstream timeout while connecting',
  'Connection refused by upstream',
  'Payment processed successfully',
  'Validation failed for request body',
  'Background job finished',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestampWithinHours(hours) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * hours * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

function makeDoc(dataStream) {
  const ts = randomTimestampWithinHours(6);
  const host = pick(HOSTS);
  const level = pick(LEVELS);

  if (dataStream === 'logs-web.access-default') {
    const status = pick(STATUSES);
    const method = pick(METHODS);
    const path = pick(PATHS);
    return {
      '@timestamp': ts,
      'host.name': host,
      'service.name': pick(SERVICES),
      'http.request.method': method,
      'url.path': path,
      'http.response.status_code': status,
      'event.duration': Math.floor(Math.random() * 800000000),
      'log.level': status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      message: `${method} ${path} ${status}`,
    };
  }

  if (dataStream === 'logs-nginx.error-default') {
    return {
      '@timestamp': ts,
      'host.name': host,
      'log.level': pick(['warn', 'error', 'error', 'crit']),
      'error.code': pick(['upstream_timeout', 'connection_refused', 'no_live_upstreams']),
      message: pick([
        'upstream timed out (110: Connection timed out) while reading response header from upstream',
        'connect() failed (111: Connection refused) while connecting to upstream',
        'no live upstreams while connecting to upstream',
      ]),
    };
  }

  // logs-app.backend-default
  return {
    '@timestamp': ts,
    'host.name': host,
    'service.name': pick(SERVICES),
    'log.level': level,
    'trace.id': Math.random().toString(16).slice(2, 18),
    message: pick(MESSAGES),
  };
}

function bulkBody(dataStream, count) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    lines.push(JSON.stringify({ create: {} }));
    lines.push(JSON.stringify(makeDoc(dataStream)));
  }
  return lines.join('\n') + '\n';
}

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: ES_HOST,
        port: ES_PORT,
        path,
        method,
        headers: {
          Authorization: AUTH,
          'Content-Type': method === 'POST' && path.includes('_bulk') ? 'application/x-ndjson' : 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const perStream = 1500;
  for (const ds of DATA_STREAMS) {
    // Ensure the data stream exists.
    await request(`/_data_stream/${ds}`, 'PUT');
    const res = await request(`/${ds}/_bulk?refresh=wait_for`, 'POST', bulkBody(ds, perStream));
    let errors = false;
    try {
      errors = JSON.parse(res.body).errors;
    } catch (e) {}
    console.log(`${ds}: ingested ${perStream} docs (status ${res.status}, errors=${errors})`);
  }

  // Also push some docs into the existing wired logs.ecs stream so it shows activity.
  const wiredBody = [];
  for (let i = 0; i < 800; i++) {
    wiredBody.push(JSON.stringify({ create: {} }));
    wiredBody.push(
      JSON.stringify({
        '@timestamp': randomTimestampWithinHours(6),
        'host.name': pick(HOSTS),
        'service.name': pick(SERVICES),
        'log.level': pick(LEVELS),
        message: pick(MESSAGES),
      })
    );
  }
  const wiredRes = await request(`/logs.ecs/_bulk?refresh=wait_for`, 'POST', wiredBody.join('\n') + '\n');
  console.log(`logs.ecs (wired): ingested 800 docs (status ${wiredRes.status})`);

  console.log('\nDone. Refresh the Streams app to see the new data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
