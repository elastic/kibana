/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFastifyServer } from './create_fastify_server';

describe('createFastifyServer', () => {
  it('exposes a health route for the migration scaffold', async () => {
    const app = await createFastifyServer();
    const res = await app.inject({ method: 'GET', url: '/__kbn_fastify_ping' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ ok: true });
    await app.close();
  });
});
