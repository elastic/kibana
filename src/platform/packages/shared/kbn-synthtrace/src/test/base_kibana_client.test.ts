/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaClient } from '../lib/shared/base_kibana_client';

describe('KibanaClient', () => {
  const client = new KibanaClient({ target: 'http://localhost:5601' });
  const fetchSpy = jest.spyOn(global, 'fetch');

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it('returns the parsed JSON body', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ has_setup: true })));

    await expect(client.fetch('/api/foo', { method: 'GET' })).resolves.toEqual({
      has_setup: true,
    });
  });

  it('returns undefined when the response has no body', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 202 }));

    await expect(client.fetch('/api/foo', { method: 'POST' })).resolves.toBeUndefined();
  });
});
