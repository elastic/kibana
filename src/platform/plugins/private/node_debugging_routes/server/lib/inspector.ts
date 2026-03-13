/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from 'node:inspector/promises';

/**
 * Session interface for CDP calls. Exposes a promise-based post() and disconnect().
 */
export interface InspectorSession {
  post(method: string, args?: object): Promise<unknown>;
  disconnect(): void;
}

/**
 * Creates a connected inspector session. The caller must call disconnect() when done.
 */
export function createSession(): InspectorSession {
  const session = new Session();
  session.connect();

  return {
    async post(method: string, args?: object): Promise<unknown> {
      return await session.post(method, args);
    },
    async disconnect(): Promise<void> {
      session.disconnect();
    },
  };
}
