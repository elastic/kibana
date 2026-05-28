/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const toBase64 = (value: string): string => Buffer.from(value).toString('base64');

const handleResponse = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const adminFetch = async (
  url: string,
  adminAuth: string,
  opts: RequestInit = {}
): Promise<unknown> => {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Basic ${adminAuth}`,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
      'elastic-api-version': '1',
      ...(opts.headers as Record<string, string>),
    },
  });
  return handleResponse(res);
};

export const personaFetch = async (
  url: string,
  username: string,
  password: string,
  version = '1'
): Promise<unknown> => {
  const auth = toBase64(`${username}:${password}`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      'x-elastic-internal-origin': 'Kibana',
      'elastic-api-version': version,
    },
  });
  return handleResponse(res);
};
