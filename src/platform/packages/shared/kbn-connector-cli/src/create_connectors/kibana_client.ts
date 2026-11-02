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

export interface KibanaConnection {
  url: string;
  auth: string;
}

interface ConnectorPayload {
  connector_type_id: string;
  name: string;
  config: Record<string, string>;
  secrets: Record<string, string>;
}

const DEFAULT_URLS = ['http://localhost:5601', 'https://localhost:5601'];
const DEFAULT_AUTHS = ['elastic:changeme', 'elastic_serverless:changeme'];

function request(
  url: string,
  options: http.RequestOptions,
  body?: string
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const isSsl = url.startsWith('https');
    const requestFn = isSsl ? https.request : http.request;
    const req = requestFn(url, { ...options, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function tryKibana(url: string, auth: string): Promise<boolean> {
  try {
    const { statusCode: statusCheck } = await request(`${url}/api/status`, { method: 'GET' });
    if (statusCheck === 0) return false;
  } catch {
    return false;
  }

  try {
    const { statusCode } = await request(`${url}/internal/security/me`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'Kibana',
      },
    });
    return statusCode === 200;
  } catch {
    return false;
  }
}

export async function detectKibana(options: { urls?: string[] } = {}): Promise<KibanaConnection> {
  const urls = options.urls ?? DEFAULT_URLS;

  for (const url of urls) {
    for (const auth of DEFAULT_AUTHS) {
      if (await tryKibana(url, auth)) {
        return { url, auth };
      }
    }
  }

  throw new Error(
    [
      'Could not detect a running Kibana instance.',
      `Tried: ${urls.join(', ')} with auth users: ${DEFAULT_AUTHS.map((a) => a.split(':')[0]).join(
        ', '
      )}`,
      '',
      'Please ensure Kibana is running, or set KIBANA_URL and KIBANA_AUTH env vars.',
    ].join('\n')
  );
}

function kibanaHeaders(auth: string): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(auth).toString('base64')}`,
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
    'Content-Type': 'application/json',
  };
}

export async function listConnectors(
  connection: KibanaConnection
): Promise<Array<{ id: string; name: string; connector_type_id: string }>> {
  const { statusCode, data } = await request(`${connection.url}/api/actions/connectors`, {
    method: 'GET',
    headers: kibanaHeaders(connection.auth),
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Failed to list connectors (HTTP ${statusCode}): ${data}`);
  }

  return JSON.parse(data);
}

export async function createConnector(
  connection: KibanaConnection,
  payload: ConnectorPayload
): Promise<{ id: string; name: string }> {
  const body = JSON.stringify(payload);
  const { statusCode, data } = await request(
    `${connection.url}/api/actions/connector`,
    {
      method: 'POST',
      headers: {
        ...kibanaHeaders(connection.auth),
        'Content-Length': String(Buffer.byteLength(body)),
      },
    },
    body
  );

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Failed to create connector "${payload.name}" (HTTP ${statusCode}): ${data}`);
  }

  return JSON.parse(data);
}
