/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MongoClient } from 'mongodb';
import type { ClientTypeSpec } from './client_type_spec';

/**
 * Decodes an `Authorization: Basic <base64>` header into username/password.
 * Splits on the first colon only so passwords containing colons are handled correctly.
 */
const parseBasicAuthHeader = (header: string): { username: string; password: string } | null => {
  const match = /^Basic (.+)$/i.exec(header);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return null;
  return { username: decoded.slice(0, colonIdx), password: decoded.slice(colonIdx + 1) };
};

export const mongodbClientType: ClientTypeSpec<MongoClient> = {
  id: 'mongodb',

  async build(ctx) {
    const uri = typeof ctx.config?.uri === 'string' ? ctx.config.uri : undefined;
    if (!uri) {
      throw new Error('config.uri is required');
    }

    // Replace the mongodb scheme so the URL constructor can parse host/port.
    const { hostname } = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    ctx.network.ensureHostnameAllowed(hostname);

    const authHeaders = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(authHeaders.Authorization ?? '');
    if (!credentials) {
      throw new Error(
        'basic auth credentials (username and password) are required for MongoDB connections'
      );
    }

    const { MongoClient: MongoClientCtor } = await import(/* webpackIgnore: true */ 'mongodb');
    const client = new MongoClientCtor(uri, {
      auth: { username: credentials.username, password: credentials.password },
      // Default to admin so credentials created there work without ?authSource=admin in the URI.
      // URI query params take precedence, so ?authSource=<db> still overrides this.
      authSource: 'admin',
      serverSelectionTimeoutMS: 10_000,
    });
    await client.connect();
    return client;
  },

  async terminate(client) {
    await client.close();
  },

  isUserError(err: unknown): boolean {
    if (err instanceof Error) {
      if (
        err.message === 'config.uri is required' ||
        err.message ===
          'basic auth credentials (username and password) are required for MongoDB connections'
      ) {
        return true;
      }
    }
    // instanceof MongoServerError can't be used here because the static import of
    // the mongodb driver is intentionally avoided to keep this module browser-bundle-safe.
    if (err instanceof Error && err.constructor.name === 'MongoServerError') {
      // 18 = AuthenticationFailed, 13 = Unauthorized
      const code = (err as { code?: number }).code;
      return code === 18 || code === 13;
    }
    return false;
  },
};
