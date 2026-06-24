/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MongoClient, MongoServerError } from 'mongodb';
import type { ClientTypeSpec } from './client_type_spec';

const MONGO_DEFAULT_PORT = 27017;

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
    const host = typeof ctx.config?.host === 'string' ? ctx.config.host : undefined;
    if (!host) {
      throw new Error('config.host is required');
    }
    const port = typeof ctx.config?.port === 'number' ? ctx.config.port : MONGO_DEFAULT_PORT;
    const tls = ctx.config?.tls === true;

    ctx.network.ensureHostnameAllowed(host);

    const authHeaders = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(authHeaders.Authorization ?? '');
    if (!credentials) {
      throw new Error(
        'basic auth credentials (username and password) are required for MongoDB connections'
      );
    }

    const uri = `mongodb://${host}:${port}`;
    const client = new MongoClient(uri, {
      auth: { username: credentials.username, password: credentials.password },
      tls,
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
        err.message === 'config.host is required' ||
        err.message ===
          'basic auth credentials (username and password) are required for MongoDB connections'
      ) {
        return true;
      }
    }
    if (err instanceof MongoServerError) {
      // 18 = AuthenticationFailed, 13 = Unauthorized
      return err.code === 18 || err.code === 13;
    }
    return false;
  },
};
